import { createClient } from "npm:@supabase/supabase-js@2";
import {
  encryptSecret,
  exchangeCodeForToken,
  fetchIdentity,
} from "../_shared/sf-oauth.ts";

function frontendOrigin(req: Request): string {
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      /* ignore */
    }
  }
  return Deno.env.get("APP_ORIGIN") || "";
}

function redirectWith(
  origin: string,
  redirectTo: string,
  params: Record<string, string>,
): Response {
  const base = origin || "/";
  let target: URL;
  try {
    target = new URL(redirectTo, base || "http://localhost");
  } catch {
    target = new URL("/", base || "http://localhost");
  }
  for (const [k, v] of Object.entries(params)) target.searchParams.set(k, v);
  return Response.redirect(target.toString(), 302);
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");
  const errDesc = url.searchParams.get("error_description");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  let redirectTo = "/";
  let origin = frontendOrigin(req);

  try {
    if (err) {
      return redirectWith(origin, redirectTo, {
        sf: "error",
        stage: "authorize",
        reason: err,
        desc: errDesc || "",
      });
    }
    if (!code || !state) {
      return redirectWith(origin, redirectTo, {
        sf: "error",
        stage: "callback",
        reason: "missing_code_or_state",
      });
    }

    // Atomically consume the state row.
    const { data: stateRow, error: stateErr } = await supabase
      .from("oauth_states")
      .update({ consumed_at: new Date().toISOString() })
      .eq("state", state)
      .is("consumed_at", null)
      .gt("expires_at", new Date().toISOString())
      .select("*")
      .maybeSingle();
    if (stateErr || !stateRow) {
      return redirectWith(origin, redirectTo, {
        sf: "error",
        stage: "state",
        reason: "invalid_or_expired_state",
      });
    }
    redirectTo = stateRow.redirect_to || "/";

    // Exchange code for tokens.
    let token;
    try {
      token = await exchangeCodeForToken(code, stateRow.code_verifier);
    } catch (e) {
      return redirectWith(origin, redirectTo, {
        sf: "error",
        stage: "token_exchange",
        reason: "exchange_failed",
        desc: String(e).slice(0, 300),
      });
    }
    if (!token.refresh_token) {
      return redirectWith(origin, redirectTo, {
        sf: "error",
        stage: "token_exchange",
        reason: "missing_refresh_token",
        desc: "Enable refresh_token/offline_access scope on the Connected App.",
      });
    }

    // Fetch identity for org id/name.
    let identity;
    try {
      identity = await fetchIdentity(token.access_token, token.id!);
    } catch (e) {
      return redirectWith(origin, redirectTo, {
        sf: "error",
        stage: "identity",
        reason: "identity_failed",
        desc: String(e).slice(0, 300),
      });
    }

    // Persist singleton connected_services row.
    const encRefresh = await encryptSecret(token.refresh_token);
    const nowIso = new Date().toISOString();
    const upsertPayload = {
      service_key: "salesforce",
      status: "connected",
      org_id: identity.organization_id,
      org_name: identity.organization_name || null,
      instance_url: token.instance_url,
      login_url: Deno.env.get("SALESFORCE_LOGIN_URL") || "https://login.salesforce.com",
      oauth_refresh_token_enc: encRefresh,
      access_token_issued_at: nowIso,
      last_refresh_at: nowIso,
      last_refresh_error: null,
      connected_by_user_ref: stateRow.user_ref,
      discovery_status: "pending",
    };
    const { error: upsertErr } = await supabase
      .from("connected_services")
      .upsert(upsertPayload, { onConflict: "service_key" });
    if (upsertErr) {
      console.error("connected_services upsert error", upsertErr);
      return redirectWith(origin, redirectTo, {
        sf: "error",
        stage: "persist",
        reason: "persist_failed",
        desc: upsertErr.message.slice(0, 300),
      });
    }

    // Best-effort schema discovery kickoff (non-blocking).
    try {
      const invokeUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/salesforce-schema-discover`;
      fetch(invokeUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          "Content-Type": "application/json",
          "x-internal-kickoff": "1",
        },
        body: JSON.stringify({ internal: true }),
      }).catch(() => {});
    } catch { /* ignore */ }

    return redirectWith(origin, redirectTo, {
      sf: "connected",
      org: identity.organization_name || identity.organization_id,
    });
  } catch (e) {
    console.error("salesforce-oauth-callback fatal", e);
    return redirectWith(origin, redirectTo, {
      sf: "error",
      stage: "fatal",
      reason: "internal_error",
      desc: String(e).slice(0, 300),
    });
  }
});