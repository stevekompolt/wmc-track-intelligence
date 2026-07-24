-- oauth_states: one-time OAuth flow state
CREATE TABLE public.oauth_states (
  state TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'salesforce',
  user_ref TEXT,
  code_verifier TEXT NOT NULL,
  redirect_to TEXT,
  nonce TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.oauth_states TO service_role;
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (edge functions) can access.

-- connected_services: singleton per service_key
CREATE TABLE public.connected_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  org_id TEXT,
  org_name TEXT,
  instance_url TEXT,
  login_url TEXT,
  oauth_refresh_token_enc BYTEA,
  access_token_issued_at TIMESTAMPTZ,
  last_refresh_at TIMESTAMPTZ,
  last_refresh_error TEXT,
  token_refresh_lock_owner TEXT,
  token_refresh_locked_until TIMESTAMPTZ,
  discovery_status TEXT DEFAULT 'idle',
  discovery_updated_at TIMESTAMPTZ,
  connected_by_user_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.connected_services TO service_role;
ALTER TABLE public.connected_services ENABLE ROW LEVEL SECURITY;
-- No client policies: edge functions only.

-- Public status view exposing only non-sensitive columns
CREATE VIEW public.connected_services_public
WITH (security_invoker = true) AS
SELECT
  service_key,
  status,
  org_id,
  org_name,
  instance_url,
  last_refresh_at,
  discovery_status,
  discovery_updated_at,
  updated_at
FROM public.connected_services;

GRANT SELECT ON public.connected_services_public TO anon, authenticated;

-- Since the base table has RLS with no policies, we need a SECURITY DEFINER
-- function to expose read access to the public view content.
CREATE OR REPLACE FUNCTION public.get_connected_service_status(_service_key TEXT)
RETURNS TABLE (
  service_key TEXT,
  status TEXT,
  org_id TEXT,
  org_name TEXT,
  instance_url TEXT,
  last_refresh_at TIMESTAMPTZ,
  discovery_status TEXT,
  discovery_updated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT service_key, status, org_id, org_name, instance_url,
         last_refresh_at, discovery_status, discovery_updated_at, updated_at
  FROM public.connected_services
  WHERE service_key = _service_key
$$;
GRANT EXECUTE ON FUNCTION public.get_connected_service_status(TEXT) TO anon, authenticated;

-- salesforce_schema_cache: describe results per SObject
CREATE TABLE public.salesforce_schema_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_name TEXT NOT NULL UNIQUE,
  namespace TEXT,
  label TEXT,
  custom BOOLEAN DEFAULT false,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.salesforce_schema_cache TO authenticated;
GRANT ALL ON public.salesforce_schema_cache TO service_role;
ALTER TABLE public.salesforce_schema_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read schema cache"
  ON public.salesforce_schema_cache FOR SELECT
  TO authenticated
  USING (true);

-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER connected_services_updated_at
  BEFORE UPDATE ON public.connected_services
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER salesforce_schema_cache_updated_at
  BEFORE UPDATE ON public.salesforce_schema_cache
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_oauth_states_expires ON public.oauth_states (expires_at);
CREATE INDEX idx_schema_cache_namespace ON public.salesforce_schema_cache (namespace);