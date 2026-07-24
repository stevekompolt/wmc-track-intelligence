import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireRiAdmin } from "../_shared/ri-auth.ts";
import { sfFetch } from "../_shared/sf-client.ts";
import { z } from "npm:zod@3";

const BodySchema = z.object({
  method: z.enum(["GET", "POST", "PATCH", "DELETE"]).default("GET"),
  path: z.string().min(1).max(2000),
  body: z.any().optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireRiAdmin(req);
  if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return jsonResponse({ error: "invalid_body", detail: parsed.error.flatten() }, 400);
  }
  const { method, path, body } = parsed.data;
  if (!path.startsWith("/services/")) {
    return jsonResponse({ error: "path_must_start_with_/services/" }, 400);
  }

  try {
    const res = await sfFetch(path, {
      method,
      body: body != null ? JSON.stringify(body) : undefined,
      headers: body != null ? { "Content-Type": "application/json" } : undefined,
    });
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: {
        ...corsHeaders,
        "Content-Type": res.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (e) {
    return jsonResponse({ error: "proxy_failed", detail: String(e) }, 500);
  }
});