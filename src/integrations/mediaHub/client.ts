import { createClient } from "@supabase/supabase-js";

/**
 * Client for the WMC Media Hub project (media.worldmotoclash.com).
 *
 * Track Intelligence owns no binary storage: overlay images are uploaded
 * through the media project's existing edge functions and read from its
 * public asset catalog. See docs/media-upload-reference.md.
 *
 * The URL + publishable key below are the media project's public client
 * values (safe in the browser, protected by RLS). No Wasabi credentials are
 * ever present in this app.
 */
export const MEDIA_HUB_URL = "https://vlwumuuolvxhiixqbnub.supabase.co";
const MEDIA_HUB_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsd3VtdXVvbHZ4aGlpeHFibnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNTg4NDgsImV4cCI6MjA3MjgzNDg0OH0.jjIqbaNQbYaHDmw1zJS-PC_wqviePfOtMtfv21K7x_Q";

export const MEDIA_CDN_BASE = "https://media.worldmotoclash.com";

export const mediaHub = createClient(MEDIA_HUB_URL, MEDIA_HUB_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Invoke a media-project edge function directly. `functions.invoke` is avoided
 * so the raw status + body of a failure can be surfaced instead of the generic
 * "non-2xx status code" message.
 */
export async function invokeMediaFunction<T>(
  name: string,
  body: unknown,
): Promise<T> {
  const res = await fetch(`${MEDIA_HUB_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: MEDIA_HUB_PUBLISHABLE_KEY,
      Authorization: `Bearer ${MEDIA_HUB_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`media function ${name} failed [${res.status}]: ${text}`);
    throw new Error(`Media upload service failed (${res.status}): ${text}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Media upload service returned a non-JSON response: ${text}`);
  }

  const maybe = parsed as { success?: boolean; error?: string };
  if (maybe && maybe.success === false) {
    throw new Error(maybe.error || `Media function ${name} reported failure`);
  }
  return parsed as T;
}