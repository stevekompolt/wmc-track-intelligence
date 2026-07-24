import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireRiAdmin } from "../_shared/ri-auth.ts";
import {
  deriveCodeChallenge,
  generateCodeVerifier,
  generateState,
  sfLoginUrl,
  sfRedirectUri,
} from "../_shared/sf-oauth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const auth = await requireRiAdmin(req);
    if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const redirectTo: string = typeof body?.redirect_to === "string" ? body.redirect_to : "/";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Refuse if already connected — require explicit disconnect first.
    const { data: existing } = await supabase
      .from("connected_services")
      .select("status")
      .eq("service_key", "salesforce")
      .maybeSingle();
    if (existing?.status === "connected") {
      return jsonResponse({ error: "already_connected" }, 409);
    }

    const clientId = Deno.env.get("SALESFORCE_CLIENT_ID");
    if (!clientId) return jsonResponse({ error: "missing_client_id" }, 500);

    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await deriveCodeChallenge(codeVerifier);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insertErr } = await supabase.from("oauth_states").insert({
      state,
      provider: "salesforce",
      user_ref: auth.user.email,
      code_verifier: codeVerifier,
      redirect_to: redirectTo,
      expires_at: expiresAt,
    });
    if (insertErr) {
      console.error("oauth_states insert failed", insertErr);
      return jsonResponse({ error: "state_persist_failed" }, 500);
    }

    const authorizeUrl = new URL(`${sfLoginUrl()}/services/oauth2/authorize`);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("redirect_uri", sfRedirectUri());
    authorizeUrl.searchParams.set("scope", "api refresh_token offline_access");
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("code_challenge", codeChallenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");
    authorizeUrl.searchParams.set("prompt", "login consent");

    return jsonResponse({ authorizeUrl: authorizeUrl.toString() });
  } catch (e) {
    console.error("salesforce-oauth-start error", e);
    return jsonResponse({ error: "internal_error", detail: String(e) }, 500);
  }
});