// Runtime Salesforce client backed by the singleton connected_services row.
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  decryptSecret,
  encryptSecret,
  refreshAccessToken,
} from "./sf-oauth.ts";

const SERVICE_KEY = "salesforce";
// Refresh access tokens if older than this many seconds.
const ACCESS_TOKEN_TTL_SECONDS = 60 * 30; // 30 minutes

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

interface ConnectionRow {
  id: string;
  status: string;
  instance_url: string | null;
  oauth_refresh_token_enc: string | null; // base64
  access_token_issued_at: string | null;
}

// In-memory access-token cache (per edge-function instance).
let cachedAccessToken: { token: string; issuedAt: number } | null = null;

function bytesFromDbBytea(value: unknown): Uint8Array | null {
  if (!value) return null;
  // Supabase JS returns bytea as hex-prefixed string "\\xdeadbeef" or base64.
  if (typeof value === "string") {
    if (value.startsWith("\\x")) {
      const hex = value.slice(2);
      const out = new Uint8Array(hex.length / 2);
      for (let i = 0; i < out.length; i++) {
        out[i] = parseInt(hex.substr(i * 2, 2), 16);
      }
      return out;
    }
    // Base64 fallback
    const bin = atob(value);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  if (value instanceof Uint8Array) return value;
  return null;
}

export async function getConnection(): Promise<ConnectionRow | null> {
  const supabase = admin();
  const { data, error } = await supabase
    .from("connected_services")
    .select("id,status,instance_url,oauth_refresh_token_enc,access_token_issued_at")
    .eq("service_key", SERVICE_KEY)
    .maybeSingle();
  if (error) throw new Error(`connection_lookup_failed: ${error.message}`);
  return data as ConnectionRow | null;
}

export async function getAccessToken(): Promise<{ accessToken: string; instanceUrl: string }> {
  const conn = await getConnection();
  if (!conn || conn.status !== "connected" || !conn.instance_url || !conn.oauth_refresh_token_enc) {
    throw new Error("salesforce_not_connected");
  }
  const now = Date.now();
  if (
    cachedAccessToken &&
    now - cachedAccessToken.issuedAt < ACCESS_TOKEN_TTL_SECONDS * 1000
  ) {
    return { accessToken: cachedAccessToken.token, instanceUrl: conn.instance_url };
  }

  const bytes = bytesFromDbBytea(conn.oauth_refresh_token_enc);
  if (!bytes) throw new Error("refresh_token_missing");
  const refreshToken = await decryptSecret(bytes);
  const token = await refreshAccessToken(refreshToken);

  cachedAccessToken = { token: token.access_token, issuedAt: now };

  const supabase = admin();
  await supabase
    .from("connected_services")
    .update({
      access_token_issued_at: new Date().toISOString(),
      last_refresh_at: new Date().toISOString(),
      last_refresh_error: null,
      // Some Salesforce configs rotate the refresh token on each refresh.
      ...(token.refresh_token
        ? { oauth_refresh_token_enc: await encryptSecret(token.refresh_token) }
        : {}),
    })
    .eq("service_key", SERVICE_KEY);

  return { accessToken: token.access_token, instanceUrl: token.instance_url || conn.instance_url };
}

export async function sfFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const { accessToken, instanceUrl } = await getAccessToken();
  const url = path.startsWith("http") ? path : `${instanceUrl}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });
}