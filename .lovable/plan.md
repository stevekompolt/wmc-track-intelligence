
# Salesforce Connection — EIE Pattern (Whitelabel, One Org Per Deployment)

Port the EIE OAuth pattern verbatim into this project. No App User Connector, no Lovable connector gateway at runtime, no changes to the existing `api.realintelligence.com` login. The connection is per-deployment (one Salesforce org) and shared by every signed-in user; only a WMC Admin can connect/disconnect.

## Architecture

```text
Browser (WMC Admin)
   │  POST /functions/v1/salesforce-oauth-start   (Authorization: RI session token)
   ▼
Edge Fn: salesforce-oauth-start
   • verify RI session → require intelrole = WMC Admin
   • mint PKCE verifier + state
   • insert oauth_states row (state, code_verifier, user_ref, redirect_to, expires_at)
   • return { authorizeUrl }
   ▼
Salesforce login/consent  →  redirect back with ?code&state
   ▼
Edge Fn: salesforce-oauth-callback   (public, no session)
   • atomic consume oauth_states by state
   • exchange code+verifier → tokens (must include refresh_token)
   • fetch identity (org id, org name, user)
   • AES-GCM encrypt refresh_token, upsert connected_services (singleton row)
   • kick off schema discovery
   • 302 back to app with ?sf=connected|error
   ▼
Runtime SF calls (any signed-in user)
   • Edge Fn sf-proxy loads singleton connected_services row
   • decrypt refresh_token, refresh access_token if expired (DB lock)
   • call SF REST directly at stored instance_url
```

The browser never sees Salesforce tokens. The RI custom login is untouched; the edge functions only need to verify that the caller is a signed-in WMC Admin using the existing RI session mechanism.

## User-facing changes

- **Admin → Salesforce Integration** page (WMC Admin only):
  - Status card: Not connected / Connected to `<Org Name>` (`<orgId>`) at `<instance_url>`, last refreshed, discovery status.
  - **Connect Salesforce** button → posts to `salesforce-oauth-start`, then `window.location = authorizeUrl`.
  - **Disconnect** button → clears the singleton row after confirm.
  - On return, reads `?sf=connected|error&stage=&reason=&desc=` from the URL and shows a toast.
- **Admin → Schema Browser** (WMC Admin only): lists `rie__*`, `ri__*`, other custom, and standard objects; per-object field list from `describe`. Read-only in this phase.
- Non-admin users see a read-only "Salesforce: Connected/Not connected" indicator in Settings; no connect UI.
- No change to the existing login, dashboard cards, overlays, tracks, or any other page.

## Data model (Lovable Cloud)

Two tables. Since ownership is a single global connection per deployment, both are keyed simply.

**`oauth_states`** (one-time, expiring):
- `state` (pk, text), `provider` ('salesforce'), `user_ref` (RI user id/email from session), `code_verifier`, `redirect_to`, `nonce`, `expires_at`, `consumed_at`.
- RLS: no client access; edge functions use service role.

**`connected_services`** (singleton for `service_key='salesforce'`):
- `id`, `service_key` (unique), `status`, `org_id`, `org_name`, `instance_url`, `login_url`, `oauth_refresh_token_enc` (bytea, AES-GCM), `access_token_issued_at`, `last_refresh_at`, `last_refresh_error`, `token_refresh_lock_owner`, `token_refresh_locked_until`, `discovery_status`, `discovery_updated_at`, `connected_by_user_ref`, `created_at`, `updated_at`.
- RLS: `SELECT` for authenticated (status + org identity only via a view); writes via service role only.
- A public view `connected_services_public` exposes only non-sensitive columns (`status`, `org_id`, `org_name`, `instance_url`, `last_refresh_at`, `discovery_status`) for the status card.

Grants follow the required pattern (authenticated SELECT on the view, service_role ALL on the base table).

## Secrets

Stored as Lovable Cloud secrets (server-only):
- `SALESFORCE_CLIENT_ID` — from the Connected App the customer creates in their SFDC org.
- `SALESFORCE_CLIENT_SECRET` — same.
- `SALESFORCE_LOGIN_URL` — optional, defaults to `https://login.salesforce.com`.
- `SF_TOKEN_ENC_KEY` — auto-generated 64-char random via `generate_secret`.
- `RI_SESSION_VERIFY_URL` (optional) — if the RI API exposes a session-verify endpoint; otherwise we validate the RI bearer/cookie the same way the existing frontend does today.

The Salesforce Connected App must be configured with:
- Redirect URI: `https://<supabase-ref>.supabase.co/functions/v1/salesforce-oauth-callback`
- Scopes: `api refresh_token offline_access id`

## Edge functions

All in `supabase/functions/`, `verify_jwt = false` (we validate the RI session in code):

1. **`_shared/sf-oauth.ts`** — ported verbatim from EIE:
   - `sfLoginUrl()`, `sfRedirectUri()`
   - `generateCodeVerifier()`, `deriveCodeChallenge()` (PKCE S256)
   - `encryptSecret()` / `decryptSecret()` (AES-GCM with SHA-256(`SF_TOKEN_ENC_KEY`))
   - `exchangeCodeForToken(code, verifier)`
   - `fetchIdentity(accessToken, idUrl)`
2. **`_shared/ri-auth.ts`** — small wrapper that validates the RI session token/cookie forwarded from the frontend and returns `{ userRef, intelrole }`. Rejects if not WMC Admin (for start) or if missing (for any authenticated helper).
3. **`_shared/sf-client.ts`** — runtime client: loads singleton `connected_services`, refreshes with DB lock, calls SF REST at `instance_url`. Read-only in this phase.
4. **`salesforce-oauth-start`** — WMC-Admin-only; mints PKCE + state; inserts `oauth_states`; returns `{ authorizeUrl }`. Rejects if a connected row already exists (must Disconnect first).
5. **`salesforce-oauth-callback`** — public; atomically consumes state (`update ... where state=? and consumed_at is null and expires_at>now() returning *`); exchanges code; requires `refresh_token` in response; fetches identity; upserts singleton `connected_services` with encrypted refresh token; kicks off `salesforce-schema-discover`; 302 redirects to app with `?sf=connected` or `?sf=error&stage=&reason=&desc=`.
6. **`salesforce-disconnect`** — WMC-Admin-only; clears the singleton row.
7. **`salesforce-schema-discover`** — WMC-Admin-invocable and callback-invoked; calls `GET /services/data/vXX.X/sobjects` and per-object `describe` for `rie__*`, `ri__*`, other custom (`*__c`), and a curated standard list (Account, Contact, Event, Case, User); caches into a `salesforce_schema_cache` table; updates `discovery_status`.
8. **`salesforce-proxy`** — WMC-Admin-only (this phase); accepts `{ method, path, query, body }`, forwards to SF REST via `sf-client`. Used by the schema browser and future features.

## Frontend

- `src/pages/admin/SalesforceIntegration.tsx` — status card, Connect/Disconnect, callback query-string handling, error stage display.
- `src/pages/admin/SalesforceSchemaBrowser.tsx` — object list (filter by namespace: `rie__`, `ri__`, custom, standard) + field detail panel.
- `src/services/salesforceAdminApi.ts` — thin wrappers around the four admin edge functions, always sending the current RI session token in `Authorization`.
- Admin nav entry appears only when `intelrole === "WMC Admin"`.
- Settings page shows a read-only "Salesforce: Connected/Not connected" badge for all users (reads `connected_services_public`).

## Explicitly out of scope for this phase

- No `connector_app_user--connect_client`, no `user_connections` table, no Lovable connector gateway at runtime.
- No changes to overlays, tracks, viewpoints, or the RI login.
- No SFDC writes from the app — the schema browser and proxy are read-only. Write paths land in a follow-up.
- No mapping UI (Real Properties / Real Events normalized models). That's a follow-up phase built on top of this connection.

## Deliverables checklist

1. Migration: `oauth_states`, `connected_services`, `connected_services_public` view, `salesforce_schema_cache`, grants, RLS.
2. Secrets: `SALESFORCE_CLIENT_ID`, `SALESFORCE_CLIENT_SECRET` (user-provided via `add_secret`), `SF_TOKEN_ENC_KEY` (auto-generated), optional `SALESFORCE_LOGIN_URL`.
3. Edge functions listed above under `supabase/functions/`.
4. Frontend admin pages + service module + admin nav gating.
5. Hand-off note to the customer: how to create the Salesforce Connected App, the exact redirect URI to paste, and the required scopes.
