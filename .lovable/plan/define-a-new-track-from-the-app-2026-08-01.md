# Define a New Track from the App

Add an admin-only "New Track" flow that creates the venue/property record directly in Salesforce and lets the location be picked on the map instead of typed as raw coordinates.

## User experience

1. Next to the track dropdown in the top nav, WMC Admins see a small "+" (New Track) button.
2. Clicking it opens a "New Track" dialog with:
   - Track name (required)
   - Location: a "Pick on map" mode — the dialog collapses, a crosshair marker appears at the map center, and the admin pans/zooms (or drags the marker) to the exact spot. A "Use this location" button captures the current center latitude/longitude and zoom.
   - A read-only preview of the captured value (`lat, lng, zoom`) with a "Re-pick" option.
   - Optional description.
3. Save writes the record to Salesforce, shows a success toast, refreshes the track list, and auto-selects the new track so the map flies to it.
4. Non-admins never see the button; the flow shows a clear message if Salesforce is not connected.

## Step 0 — Confirm the Salesforce target object (first task)

The app currently reads tracks from the read-only `specific-property-list.py` feed, which exposes only `name`, `id`, and `coordinates`. The underlying Salesforce object and field API names are not referenced anywhere in the code, so before writing the create call we will:

- Use the existing admin proxy to describe candidate property objects and locate the object behind the feed plus its Name field and the field that stores the `lat,lng,zoom` coordinates string.
- Record the resolved object/field API names in one place in the code, so a future field rename is a one-line change.

If the object turns out to require additional mandatory fields (record type, account/owner lookup, status), the dialog gains those inputs before the flow is considered done.

## Technical detail

- **Write path**: reuse the existing `salesforce-proxy` edge function (already admin-gated via `requireRiAdmin` and restricted to `/services/` paths). No new edge function is needed. The create call is `POST /services/data/v62.0/sobjects/<PropertyObject>/` with the name, coordinates string, and description.
- **New service** `src/services/tracksAdminApi.ts` — `createTrack({ name, latitude, longitude, zoom, description })`: formats coordinates as `lat,lng,zoom` (matching the parser in `tracksApi.ts`), invokes the proxy, and returns the new record id.
- **New hook** `src/hooks/useCreateTrack.ts` — React Query mutation that invalidates the `['tracks']` query on success. Because the feed is cached 5 minutes and is eventually consistent, the new track is also merged optimistically into `TrackContext` so it is immediately selectable.
- **Map picking** uses the existing engine handles: `captureCamera()` on `TrackMapHandle` / `CesiumMapHandle` already returns latitude, longitude, and a zoom-equivalent height, so no map internals change. A temporary center crosshair overlay is added inside `SharedMapContainer`, driven by a "picking" flag.
- **New components**: `src/components/tracks/NewTrackDialog.tsx` and a `NewTrackButton` rendered next to `GlobalTrackSelector`, gated on the WMC Admin role from `AuthContext`.
- No database migration and no changes to `tracksApi.ts` parsing — Salesforce stays the system of record.

## Verification

- Create a track with a map-picked location; confirm the record appears in Salesforce with the correct `lat,lng,zoom` string.
- Confirm the dropdown shows it, selecting it flies the map to the picked spot, and the coordinates round-trip identically after a page reload.
- Confirm the button is hidden for non-admin users and that a proxy/Salesforce error surfaces the real Salesforce message in the dialog.
