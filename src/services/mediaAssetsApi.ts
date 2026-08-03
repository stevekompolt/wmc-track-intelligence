/**
 * Shared media asset service — thin client over the WMC Media Hub pipeline.
 *
 * Mirrors the media project's proven upload sequence exactly:
 *   presign -> direct browser PUT to Wasabi -> finalize (catalog + Salesforce)
 *
 * No Wasabi client, signer, bucket config or credential lives in this app.
 * See docs/media-upload-reference.md for the documented reference behaviour.
 */

import { mediaHub, invokeMediaFunction, MEDIA_CDN_BASE } from "@/integrations/mediaHub/client";

export const TRACK_OVERLAY_ASSET_TYPE = "track-overlay";

const ALLOWED_MIME = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

export interface MediaAsset {
  id: string;
  title: string;
  description: string | null;
  url: string;
  thumbnailUrl: string | null;
  s3Key: string | null;
  fileFormat: string | null;
  fileSize: number | null;
  assetType: string | null;
  originalFilename: string | null;
  width: number | null;
  height: number | null;
  createdAt: string | null;
}

export interface TrackOverlayAssetMetadata {
  assetType: typeof TRACK_OVERLAY_ASSET_TYPE;
  organizationId: string;
  venueId: string;
  eventId?: string | null;
  overlayId?: string;
  overlayName: string;
}

export interface UploadedAsset {
  mediaAssetId: string;
  s3Key: string;
  cdnUrl: string;
  width: number;
  height: number;
}

const ASSET_COLUMNS =
  "id,title,description,file_url,thumbnail_url,s3_key,file_format,file_size,asset_type,metadata,created_at";

// deno-lint-ignore-file no-explicit-any
function mapAsset(row: any): MediaAsset {
  const meta = (row?.metadata || {}) as Record<string, unknown>;
  const cdnUrl =
    (row.file_url as string | null) ||
    (row.s3_key ? `${MEDIA_CDN_BASE}/${row.s3_key}` : "");
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    url: cdnUrl,
    thumbnailUrl: (row.thumbnail_url as string | null) ?? cdnUrl ?? null,
    s3Key: row.s3_key ?? null,
    fileFormat: row.file_format ?? null,
    fileSize: row.file_size ?? null,
    assetType: row.asset_type ?? null,
    originalFilename: (meta.originalFilename as string) ?? null,
    width: (meta.width as number) ?? null,
    height: (meta.height as number) ?? null,
    createdAt: row.created_at ?? null,
  };
}

/** Read image assets from the shared media catalog. */
export async function listImageAssets(opts: {
  search?: string;
  ids?: string[];
  limit?: number;
} = {}): Promise<MediaAsset[]> {
  let query = mediaHub
    .from("media_assets")
    .select(ASSET_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 60);

  if (opts.ids?.length) {
    query = query.in("id", opts.ids);
  } else {
    query = query.in("file_format", ["png", "jpg", "jpeg", "webp"]);
  }
  if (opts.search) query = query.ilike("title", `%${opts.search}%`);

  const { data, error } = await query;
  if (error) {
    console.error("listImageAssets failed:", error);
    throw new Error(`Could not read the media catalog: ${error.message}`);
  }
  return (data || []).map(mapAsset);
}

export async function getAssetById(id: string): Promise<MediaAsset | null> {
  const { data, error } = await mediaHub
    .from("media_assets")
    .select(ASSET_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("getAssetById failed:", error);
    return null;
  }
  return data ? mapAsset(data) : null;
}

/** Resolve the currently usable image URLs for a set of media asset ids. */
export async function resolveAssetUrls(ids: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return {};
  const assets = await listImageAssets({ ids: unique, limit: unique.length });
  return assets.reduce<Record<string, string>>((acc, a) => {
    if (a.url) acc[a.id] = a.url;
    return acc;
  }, {});
}

export function validateOverlayFile(file: File): string | null {
  if (!ALLOWED_MIME.includes(file.type)) {
    return "Only PNG, JPEG or WebP images can be used as overlays.";
  }
  if (file.size > MAX_BYTES) {
    return "Image is larger than the 50 MB upload limit.";
  }
  return null;
}

/**
 * Duplicate detection — the media catalog has no checksum column, so the same
 * binary is recognised by original filename + byte size.
 */
export async function findDuplicateAsset(file: File): Promise<MediaAsset | null> {
  const { data, error } = await mediaHub
    .from("media_assets")
    .select(ASSET_COLUMNS)
    .eq("file_size", file.size)
    .order("created_at", { ascending: false })
    .limit(25);
  if (error || !data) return null;
  const match = data
    .map(mapAsset)
    .find((a) => a.originalFilename === file.name && !!a.url);
  return match ?? null;
}

async function readImageSize(file: File): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function putWithProgress(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress?: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 90));
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Wasabi upload failed (${xhr.status}): ${xhr.responseText}`));
    xhr.onerror = () => reject(new Error("Network error while uploading to storage"));
    xhr.send(file);
  });
}

/**
 * Upload an overlay image through the media project's pipeline and return the
 * permanent media asset reference.
 */
export async function uploadOverlayImage(
  file: File,
  metadata: TrackOverlayAssetMetadata,
  onProgress?: (pct: number) => void,
): Promise<UploadedAsset> {
  const invalid = validateOverlayFile(file);
  if (invalid) throw new Error(invalid);

  const { width, height } = await readImageSize(file);
  onProgress?.(5);

  // Step 1 — presigned Wasabi PUT URL from the media project
  const presign = await invokeMediaFunction<{
    presignedUrl: string;
    s3Key: string;
    masterId: string;
    cdnUrl: string;
    uploadHeaders?: Record<string, string>;
  }>("generate-presigned-upload-url", {
    filename: file.name,
    mimeType: file.type,
    width,
    height,
  });

  // Step 2 — browser uploads the binary straight to Wasabi
  await putWithProgress(
    presign.presignedUrl,
    file,
    presign.uploadHeaders ?? { "Content-Type": file.type },
    onProgress,
  );
  onProgress?.(92);

  // Step 3 — finalize: media project verifies the object, catalogs the asset
  const finalize = await invokeMediaFunction<{ assetId?: string; cdnUrl?: string }>(
    "upload-master-to-s3",
    {
      s3Key: presign.s3Key,
      cdnUrl: presign.cdnUrl,
      masterId: presign.masterId,
      filename: file.name,
      mimeType: file.type,
      width,
      height,
      fileSize: file.size,
      title: metadata.overlayName,
      description: `Track overlay reference image — venue ${metadata.venueId} (org ${metadata.organizationId})`,
      tags: [TRACK_OVERLAY_ASSET_TYPE, "track-intelligence"],
    },
  );
  onProgress?.(100);

  const mediaAssetId = finalize.assetId || presign.masterId;
  return {
    mediaAssetId,
    s3Key: presign.s3Key,
    cdnUrl: finalize.cdnUrl || presign.cdnUrl,
    width,
    height,
  };
}