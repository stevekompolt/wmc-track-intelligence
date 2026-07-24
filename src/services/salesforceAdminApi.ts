import { supabase } from "@/integrations/supabase/client";

function riEmail(): string {
  try {
    const raw = sessionStorage.getItem("wmc_auth_session");
    if (!raw) return "";
    return JSON.parse(raw)?.email || "";
  } catch {
    return "";
  }
}

async function invoke<T = unknown>(
  fn: string,
  body?: unknown,
): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke(fn, {
    body: body ?? {},
    headers: { "x-ri-email": riEmail() },
  });
  if (error) {
    const detail =
      // deno-lint-ignore no-explicit-any
      (error as any)?.context?.text ? await (error as any).context.text() : error.message;
    return { data: null, error: detail };
  }
  return { data: data as T, error: null };
}

export interface ConnectedServiceStatus {
  service_key: string;
  status: string;
  org_id: string | null;
  org_name: string | null;
  instance_url: string | null;
  last_refresh_at: string | null;
  discovery_status: string | null;
  discovery_updated_at: string | null;
  updated_at: string;
}

export async function getSalesforceStatus(): Promise<ConnectedServiceStatus | null> {
  const { data, error } = await supabase.rpc("get_connected_service_status", {
    _service_key: "salesforce",
  });
  if (error) {
    console.error("getSalesforceStatus", error);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return (row as ConnectedServiceStatus) || null;
}

export async function startSalesforceOAuth(redirectTo: string) {
  return invoke<{ authorizeUrl: string }>("salesforce-oauth-start", {
    redirect_to: redirectTo,
  });
}

export async function disconnectSalesforce() {
  return invoke<{ ok: boolean }>("salesforce-disconnect");
}

export async function runSchemaDiscovery() {
  return invoke<{ ok: boolean; described: number; total: number }>(
    "salesforce-schema-discover",
  );
}

export async function listSchemaCache() {
  const { data, error } = await supabase
    .from("salesforce_schema_cache")
    .select("object_name,namespace,label,custom,fields,fetched_at")
    .order("namespace", { ascending: true })
    .order("object_name", { ascending: true });
  if (error) {
    console.error("listSchemaCache", error);
    return [];
  }
  return data || [];
}