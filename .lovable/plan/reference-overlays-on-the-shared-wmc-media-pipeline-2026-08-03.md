# Reference overlays on the shared WMC media pipeline

Track overlays stop being browser-local images. They upload through the exact pipeline the media project already uses (Wasabi S3 + shared media asset catalog), and Track Intelligence stores only the overlay relationship and geospatial settings — in Salesforce.

## Findings from the media project (documented, then reused)

Confirmed by reading `wmc-media-hub`:

- Upload is a two-step flow: `generate-presigned-upload-url` returns a signed Wasabi PUT URL plus `s3Key`, `masterId`, `cdnUrl`; the browser PUTs the file directly with `XMLHttpRequest` (progress events); then `upload-master-to-s3` is called in "finalize" mode with `s3Key`/`cdnUrl`/`masterId` to verify the object exists and create the asset + Salesforce content records.
- S3 config is centralized in `supabase/functions/_shared/s3Config.ts`: bucket `shortf-media`, region `us-central-1`, endpoint `s3.us-central-1.wasabisys.com`, credentials from `WASABI_ACCESS_KEY_ID` / `WASABI_SECRET_ACCESS_KEY`, signing via `aws4fetch`.
- Read URLs are public CDN URLs: `https://media.worldmotoclash.com/{s3Key}`. No signed GET.
- Key convention: `{basePath}/{masterId}/master.{ext}` with a sanitized extension (reserved characters stripped).
- The asset catalog is the media project's `media_assets` table, publicly readable, with `asset_type`, `s3_key`, `cdn_url`, `master_id`, `salesforce_id`.
- Both upload functions are public (`verify_jwt = false`) and CORS-open.

These findings get written into `docs/media-upload-reference.md` in this repo.

## Reuse strategy: Option 1 — call the existing media upload API

No Wasabi client, S3 signer, credentials, bucket, or second upload endpoint is added to Track Intelligence. This app calls the media project's existing functions with a dedicated read/invoke client and tags the asset with `assetType: "track-overlay"` plus venue/org metadata.

## What gets built

1. **Media hub client** (`src/integrations/mediaHub/client.ts`) — a client pointed at the media project using its publishable key, used only to invoke the two upload functions and read the asset catalog.

2. **Shared upload service** (`src/services/mediaAssetsApi.ts`) — mirrors the media project's proven sequence exactly: validate file (image mime, size cap, sanitized filename) → presign → direct PUT with progress callbacks → finalize with track-overlay metadata → return `{ mediaAssetId, s3Key, cdnUrl }`. Also provides `listImageAssets({ assetType })`, `getAssetById`, and `resolveAssetUrl`. Errors surface the function status and body, never a generic message.

3. **Duplicate detection** — before uploading, look for an existing catalog record matching the file (checksum if the media project already records one, otherwise filename + byte size). If found, offer "Reuse existing asset" and skip the binary upload; a new overlay record is still created so the same image can carry different bounds.

4. **Overlay records in Salesforce** — `overlaysApi` is rewritten from localStorage to Salesforce through the existing `salesforce-proxy` edge function, following the same runtime object/field discovery and cached-mapping pattern already used for tracks (`salesforceTrackObject.ts`). A new `salesforceOverlayObject.ts` resolves the overlay object and its fields (venue lookup, media asset id, N/S/E/W, opacity, rotation, z-index, visibility flags, lock, status). If the object or a required field isn't present in the org, the editor shows an explicit mapping/setup message instead of silently falling back to local storage.

5. **Overlay model** (`src/types/overlay.ts`) — adds `mediaAssetId`, `s3Key`, `organizationId`, `venueId`, `eventId`, `rotationDegrees`. `imageUrl` becomes a resolved CDN URL held in memory only — never persisted, never base64, never a blob URL.

6. **Track Editor UI** (`OverlayEditorPanel`) — two actions: **Upload New Overlay** (real progress bar from the PUT) and **Choose Existing Media** (thumbnail grid reading the shared catalog, filtered to `track-overlay` by default with an "all images" toggle). Replace uses the same flow and only swaps `mediaAssetId` — bounds, opacity, lock and status are preserved and the Mapbox source refreshes in place. Archive marks the overlay record archived and leaves the shared media asset alone; deleting the underlying asset is not offered from Track Intelligence.

7. **Renderers** — `useMultiOverlayRenderer`, `useSharedFeatureRenderer` and the Cesium renderer consume CDN URLs directly; the base64-to-blob shim stops being part of the persistence path.

Existing browser-local overlays are not migrated (per your call), so the Mid-Ohio record is re-created through the new upload flow whenever you want it.

## Verification

Upload an overlay, hard-refresh, and confirm it returns with the Wasabi-hosted image and correct bounds; confirm the asset appears in the media system when filtered by `track-overlay`; confirm no base64 or blob reference remains in the saved record.