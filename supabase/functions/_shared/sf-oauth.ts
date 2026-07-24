// Shared Salesforce OAuth helpers (PKCE + AES-GCM refresh-token-at-rest).
// Ported from the EIE pattern.

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function sfLoginUrl(): string {
  const raw = Deno.env.get("SALESFORCE_LOGIN_URL") || "https://login.salesforce.com";
  return raw.replace(/\/+$/, "");
}

export function sfRedirectUri(): string {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  return `${supabaseUrl}/functions/v1/salesforce-oauth-callback`;
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generateCodeVerifier(): string {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

export async function deriveCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(verifier));
  return toBase64Url(new Uint8Array(digest));
}

export function generateState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

async function getEncKey(): Promise<CryptoKey> {
  const raw = Deno.env.get("SF_TOKEN_ENC_KEY");
  if (!raw) throw new Error("SF_TOKEN_ENC_KEY not configured");
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(raw));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

// Returns bytes: [12-byte IV || ciphertext]
export async function encryptSecret(plaintext: string): Promise<Uint8Array> {
  const key = await getEncKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoder.encode(plaintext),
    ),
  );
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv, 0);
  out.set(ct, iv.length);
  return out;
}

export async function decryptSecret(blob: Uint8Array): Promise<string> {
  const key = await getEncKey();
  const iv = blob.slice(0, 12);
  const ct = blob.slice(12);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return decoder.decode(pt);
}

export interface SfTokenResponse {
  access_token: string;
  refresh_token?: string;
  instance_url: string;
  id?: string;
  token_type?: string;
  issued_at?: string;
  signature?: string;
  scope?: string;
}

export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
): Promise<SfTokenResponse> {
  const clientId = Deno.env.get("SALESFORCE_CLIENT_ID");
  const clientSecret = Deno.env.get("SALESFORCE_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("Salesforce client id/secret not configured");
  }
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: sfRedirectUri(),
    code_verifier: codeVerifier,
  });
  const res = await fetch(`${sfLoginUrl()}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`token_exchange_failed [${res.status}] ${text}`);
  }
  return JSON.parse(text) as SfTokenResponse;
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<SfTokenResponse> {
  const clientId = Deno.env.get("SALESFORCE_CLIENT_ID");
  const clientSecret = Deno.env.get("SALESFORCE_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("Salesforce client id/secret not configured");
  }
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(`${sfLoginUrl()}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`refresh_failed [${res.status}] ${text}`);
  }
  return JSON.parse(text) as SfTokenResponse;
}

export interface SfIdentity {
  organization_id: string;
  user_id: string;
  username: string;
  display_name?: string;
  organization_name?: string;
}

export async function fetchIdentity(
  accessToken: string,
  idUrl: string,
): Promise<SfIdentity> {
  const res = await fetch(idUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`identity_failed [${res.status}] ${text}`);
  }
  const data = JSON.parse(text);
  return {
    organization_id: data.organization_id,
    user_id: data.user_id,
    username: data.username,
    display_name: data.display_name,
    organization_name: data.organization_name,
  };
}