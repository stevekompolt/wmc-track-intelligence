import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireRiAdmin } from "../_shared/ri-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireRiAdmin(req);
  if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { error } = await supabase
    .from("connected_services")
    .delete()
    .eq("service_key", "salesforce");
  if (error) return jsonResponse({ error: error.message }, 500);

  await supabase.from("salesforce_schema_cache").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  return jsonResponse({ ok: true });
});