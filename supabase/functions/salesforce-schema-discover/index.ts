import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireRiAdmin } from "../_shared/ri-auth.ts";
import { sfFetch } from "../_shared/sf-client.ts";

const SF_API_VERSION = "v62.0";
// Standard objects we always describe.
const STANDARD_INCLUDE = new Set([
  "Account",
  "Contact",
  "User",
  "Event",
  "Case",
  "Task",
]);

function namespaceOf(name: string): string {
  if (name.startsWith("rie__")) return "rie";
  if (name.startsWith("ri__")) return "ri";
  if (name.endsWith("__c")) return "custom";
  return "standard";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const isInternal = req.headers.get("x-internal-kickoff") === "1";
  if (!isInternal) {
    const auth = await requireRiAdmin(req);
    if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  await supabase
    .from("connected_services")
    .update({ discovery_status: "running", discovery_updated_at: new Date().toISOString() })
    .eq("service_key", "salesforce");

  try {
    const listRes = await sfFetch(`/services/data/${SF_API_VERSION}/sobjects/`);
    if (!listRes.ok) {
      const t = await listRes.text();
      throw new Error(`list_sobjects_failed [${listRes.status}] ${t}`);
    }
    const listJson = await listRes.json();
    const sobjects: any[] = listJson.sobjects || [];

    const targets = sobjects.filter((o) => {
      const n = o.name as string;
      return (
        n.startsWith("rie__") ||
        n.startsWith("ri__") ||
        n.endsWith("__c") ||
        STANDARD_INCLUDE.has(n)
      );
    });

    // Describe with concurrency cap to keep this responsive.
    const CONCURRENCY = 5;
    let index = 0;
    let described = 0;
    async function worker() {
      while (index < targets.length) {
        const my = index++;
        const obj = targets[my];
        try {
          const r = await sfFetch(
            `/services/data/${SF_API_VERSION}/sobjects/${obj.name}/describe`,
          );
          if (!r.ok) continue;
          const desc = await r.json();
          const fields = (desc.fields || []).map((f: any) => ({
            name: f.name,
            label: f.label,
            type: f.type,
            length: f.length,
            custom: f.custom,
            referenceTo: f.referenceTo,
            nillable: f.nillable,
            picklistValues: (f.picklistValues || []).map((p: any) => ({
              label: p.label,
              value: p.value,
              active: p.active,
            })),
          }));
          await supabase.from("salesforce_schema_cache").upsert(
            {
              object_name: obj.name,
              namespace: namespaceOf(obj.name),
              label: desc.label || obj.label,
              custom: !!desc.custom,
              fields,
              raw: {
                keyPrefix: desc.keyPrefix,
                queryable: desc.queryable,
                createable: desc.createable,
                updateable: desc.updateable,
              },
              fetched_at: new Date().toISOString(),
            },
            { onConflict: "object_name" },
          );
          described++;
        } catch (e) {
          console.error(`describe ${obj.name} failed`, e);
        }
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, targets.length) }, () => worker()),
    );

    await supabase
      .from("connected_services")
      .update({
        discovery_status: "ready",
        discovery_updated_at: new Date().toISOString(),
      })
      .eq("service_key", "salesforce");

    return jsonResponse({ ok: true, described, total: targets.length });
  } catch (e) {
    console.error("schema-discover failed", e);
    await supabase
      .from("connected_services")
      .update({
        discovery_status: "error",
        discovery_updated_at: new Date().toISOString(),
        last_refresh_error: String(e).slice(0, 500),
      })
      .eq("service_key", "salesforce");
    return jsonResponse({ error: String(e) }, 500);
  }
});