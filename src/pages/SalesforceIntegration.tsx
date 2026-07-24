import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CloudCog, Loader2, RefreshCw, Unplug, Database, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  ConnectedServiceStatus,
  disconnectSalesforce,
  getSalesforceStatus,
  listSchemaCache,
  runSchemaDiscovery,
  startSalesforceOAuth,
} from "@/services/salesforceAdminApi";

interface SchemaEntry {
  object_name: string;
  namespace: string | null;
  label: string | null;
  custom: boolean | null;
  fields: Array<{ name: string; label?: string; type?: string; custom?: boolean }>;
  fetched_at: string;
}

interface LastAttempt {
  at: string;
  authorizeUrl?: string;
  callbackParams?: Record<string, string>;
  callbackAt?: string;
  connectError?: string;
}

const LS_KEY = "wmc_sf_last_attempt";

function readLastAttempt(): LastAttempt | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLastAttempt(patch: Partial<LastAttempt>) {
  const prev = readLastAttempt() || { at: new Date().toISOString() };
  const next = { ...prev, ...patch };
  localStorage.setItem(LS_KEY, JSON.stringify(next));
  return next;
}

export default function SalesforceIntegration() {
  const { user } = useAuth();
  const isAdmin = user?.role === "wmc_admin";

  const [status, setStatus] = useState<ConnectedServiceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [schema, setSchema] = useState<SchemaEntry[]>([]);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<SchemaEntry | null>(null);
  const [lastAttempt, setLastAttempt] = useState<LastAttempt | null>(() => readLastAttempt());

  const refresh = async () => {
    setLoading(true);
    const [s, sc] = await Promise.all([getSalesforceStatus(), listSchemaCache()]);
    setStatus(s);
    setSchema(sc as SchemaEntry[]);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  // Handle callback query string.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sf = params.get("sf");
    if (!sf) return;
    const captured: Record<string, string> = {};
    ["sf", "org", "stage", "reason", "desc"].forEach((k) => {
      const v = params.get(k);
      if (v) captured[k] = v;
    });
    setLastAttempt(
      writeLastAttempt({ callbackParams: captured, callbackAt: new Date().toISOString() }),
    );
    if (sf === "connected") {
      toast({ title: "Salesforce connected", description: params.get("org") || "" });
    } else if (sf === "error") {
      toast({
        title: "Salesforce connection failed",
        description: `${params.get("stage") || ""} ${params.get("reason") || ""} ${params.get("desc") || ""}`.trim(),
        variant: "destructive",
      });
    }
    const cleaned = new URL(window.location.href);
    ["sf", "org", "stage", "reason", "desc"].forEach((k) => cleaned.searchParams.delete(k));
    window.history.replaceState({}, "", cleaned.toString());
    refresh();
  }, []);

  const handleConnect = async () => {
    setBusy("connect");
    const { data, error } = await startSalesforceOAuth(
      window.location.pathname + window.location.search,
    );
    setBusy(null);
    if (error || !data?.authorizeUrl) {
      setLastAttempt(
        writeLastAttempt({
          at: new Date().toISOString(),
          connectError: error || "no_authorize_url",
          authorizeUrl: undefined,
        }),
      );
      toast({ title: "Could not start OAuth", description: error || "Unknown error", variant: "destructive" });
      return;
    }
    setLastAttempt(
      writeLastAttempt({
        at: new Date().toISOString(),
        authorizeUrl: data.authorizeUrl,
        connectError: undefined,
        callbackParams: undefined,
        callbackAt: undefined,
      }),
    );
    window.location.href = data.authorizeUrl;
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Salesforce? All users will lose access until reconnected.")) return;
    setBusy("disconnect");
    const { error } = await disconnectSalesforce();
    setBusy(null);
    if (error) {
      toast({ title: "Disconnect failed", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "Salesforce disconnected" });
    await refresh();
  };

  const handleDiscover = async () => {
    setBusy("discover");
    const { data, error } = await runSchemaDiscovery();
    setBusy(null);
    if (error) {
      toast({ title: "Discovery failed", description: error, variant: "destructive" });
      return;
    }
    toast({
      title: "Schema discovered",
      description: `${data?.described ?? 0} of ${data?.total ?? 0} objects`,
    });
    await refresh();
  };

  const grouped = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const rows = q
      ? schema.filter(
          (r) =>
            r.object_name.toLowerCase().includes(q) ||
            (r.label || "").toLowerCase().includes(q),
        )
      : schema;
    const by: Record<string, SchemaEntry[]> = { rie: [], ri: [], custom: [], standard: [] };
    for (const r of rows) {
      const ns = r.namespace || "standard";
      (by[ns] ||= []).push(r);
    }
    return by;
  }, [schema, filter]);

  const isConnected = status?.status === "connected";

  if (!isAdmin) {
    return (
      <div className="h-full overflow-auto p-6">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-status-caution" />
                <CardTitle className="font-display">Salesforce Integration</CardTitle>
              </div>
              <CardDescription>Admin-only. Read-only status below.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground font-mono">Status:</span>
                <Badge variant="outline" className={isConnected ? "border-emerald-500/50 text-emerald-400" : "border-muted-foreground/50"}>
                  {isConnected ? `Connected — ${status?.org_name || status?.org_id}` : "Not connected"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold tracking-wider flex items-center gap-3">
            <CloudCog className="h-6 w-6 text-primary" />
            SALESFORCE INTEGRATION
          </h1>
          <p className="text-muted-foreground text-sm">
            Per-deployment Salesforce connection. One org, shared by all signed-in users.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Connection</CardTitle>
            <CardDescription>OAuth 2.0 with PKCE, refresh token encrypted at rest.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 text-sm font-mono">
                <div>
                  <div className="text-muted-foreground">Status</div>
                  <Badge variant="outline" className={isConnected ? "border-emerald-500/50 text-emerald-400" : "border-status-caution/50 text-status-caution"}>
                    {status?.status || "not_connected"}
                  </Badge>
                </div>
                <div>
                  <div className="text-muted-foreground">Org</div>
                  <div>{status?.org_name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{status?.org_id || ""}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-muted-foreground">Instance</div>
                  <div className="truncate">{status?.instance_url || "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Last refresh</div>
                  <div>{status?.last_refresh_at ? new Date(status.last_refresh_at).toLocaleString() : "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Discovery</div>
                  <div>{status?.discovery_status || "idle"}</div>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              {!isConnected ? (
                <Button onClick={handleConnect} disabled={busy === "connect"}>
                  {busy === "connect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudCog className="h-4 w-4" />}
                  Connect Salesforce
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={handleDiscover} disabled={busy === "discover"}>
                    {busy === "discover" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Re-run schema discovery
                  </Button>
                  <Button variant="destructive" onClick={handleDisconnect} disabled={busy === "disconnect"}>
                    {busy === "disconnect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
                    Disconnect
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Debug — Connection state & last attempt</CardTitle>
            <CardDescription>
              Live view of what the backend reports and the most recent OAuth start / callback params.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">
                connected_services row
              </div>
              <pre className="text-xs font-mono bg-muted/40 rounded p-3 overflow-auto max-h-64">
{JSON.stringify(status, null, 2)}
              </pre>
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1 flex items-center justify-between">
                <span>Last connect attempt {lastAttempt?.at ? `— ${new Date(lastAttempt.at).toLocaleString()}` : ""}</span>
                {lastAttempt && (
                  <button
                    className="text-[10px] underline hover:text-foreground"
                    onClick={() => {
                      localStorage.removeItem(LS_KEY);
                      setLastAttempt(null);
                    }}
                  >
                    clear
                  </button>
                )}
              </div>
              {!lastAttempt ? (
                <div className="text-sm text-muted-foreground">No attempt recorded on this browser.</div>
              ) : (
                <div className="space-y-3">
                  {lastAttempt.connectError && (
                    <div className="text-xs font-mono text-destructive">
                      connect error: {lastAttempt.connectError}
                    </div>
                  )}
                  {lastAttempt.authorizeUrl && (
                    <div>
                      <div className="text-xs font-mono text-muted-foreground mb-1">authorize URL sent to Salesforce</div>
                      <div className="text-xs font-mono bg-muted/40 rounded p-3 break-all">
                        <a
                          href={lastAttempt.authorizeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline hover:text-foreground"
                        >
                          {lastAttempt.authorizeUrl}
                        </a>
                      </div>
                    </div>
                  )}
                  {lastAttempt.callbackParams && (
                    <div>
                      <div className="text-xs font-mono text-muted-foreground mb-1">
                        callback params {lastAttempt.callbackAt ? `(${new Date(lastAttempt.callbackAt).toLocaleString()})` : ""}
                      </div>
                      <pre className="text-xs font-mono bg-muted/40 rounded p-3 overflow-auto max-h-48">
{JSON.stringify(lastAttempt.callbackParams, null, 2)}
                      </pre>
                    </div>
                  )}
                  {!lastAttempt.callbackParams && lastAttempt.authorizeUrl && (
                    <div className="text-xs font-mono text-status-caution">
                      No callback received yet — Salesforce has not redirected back to this browser.
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {isConnected && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <Database className="h-5 w-5" /> Schema browser
                  </CardTitle>
                  <CardDescription>rie__, ri__, custom (*__c), and key standard objects.</CardDescription>
                </div>
                <Input
                  placeholder="Filter objects…"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="max-w-xs"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-[280px,1fr]">
                <div className="space-y-4 max-h-[520px] overflow-auto pr-2">
                  {(["rie", "ri", "custom", "standard"] as const).map((ns) => (
                    <div key={ns}>
                      <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">
                        {ns} ({grouped[ns]?.length || 0})
                      </div>
                      <div className="space-y-1">
                        {(grouped[ns] || []).map((row) => (
                          <button
                            key={row.object_name}
                            onClick={() => setSelected(row)}
                            className={`w-full text-left px-2 py-1.5 rounded text-sm font-mono hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                              selected?.object_name === row.object_name ? "bg-muted" : ""
                            }`}
                          >
                            <div className="truncate">{row.object_name}</div>
                            <div className="text-xs text-muted-foreground truncate">{row.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {schema.length === 0 && (
                    <div className="text-sm text-muted-foreground">
                      No cached schema yet. Run discovery.
                    </div>
                  )}
                </div>
                <div className="border rounded p-4 min-h-[320px]">
                  {!selected ? (
                    <div className="text-sm text-muted-foreground">Select an object.</div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <div className="font-display text-lg">{selected.label}</div>
                        <div className="font-mono text-xs text-muted-foreground">{selected.object_name}</div>
                      </div>
                      <div className="text-xs font-mono text-muted-foreground">
                        {selected.fields.length} fields · fetched {new Date(selected.fetched_at).toLocaleString()}
                      </div>
                      <div className="max-h-[420px] overflow-auto border rounded">
                        <table className="w-full text-xs font-mono">
                          <thead className="bg-muted/50 sticky top-0">
                            <tr>
                              <th className="text-left p-2">Name</th>
                              <th className="text-left p-2">Label</th>
                              <th className="text-left p-2">Type</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selected.fields.map((f) => (
                              <tr key={f.name} className="border-t">
                                <td className="p-2">{f.name}{f.custom ? " *" : ""}</td>
                                <td className="p-2">{f.label}</td>
                                <td className="p-2 text-muted-foreground">{f.type}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}