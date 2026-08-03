import { sfProxy } from "@/services/salesforceAdminApi";
import { SF_API_VERSION } from "@/services/salesforceTrackObject";

/**
 * Runtime resolution of the Salesforce object + field API names that back
 * Track Overlay records, following the same discover-and-cache pattern used
 * for the property/venue object in `salesforceTrackObject.ts`.
 *
 * Track Intelligence owns only the overlay relationship and geospatial
 * settings; the binary lives in the media system (see mediaAssetsApi).
 */
export interface OverlayObjectMapping {
  objectName: string;
  nameField: string;
  venueField: string;
  mediaAssetField: string;
  northField: string;
  southField: string;
  eastField: string;
  westField: string;
  descriptionField?: string;
  s3KeyField?: string;
  opacityField?: string;
  rotationField?: string;
  zOrderField?: string;
  visibleToFansField?: string;
  visibleToMediaField?: string;
  visibleToOpsField?: string;
  lockedField?: string;
  statusField?: string;
}

const CACHE_KEY = "wmc_sf_overlay_object_mapping";

interface SObjectField {
  name: string;
  label: string;
  type: string;
  createable: boolean;
  updateable?: boolean;
  referenceTo?: string[];
}

interface DescribeResult {
  name: string;
  createable: boolean;
  fields: SObjectField[];
}

export class OverlayMappingError extends Error {}

function readCache(): OverlayObjectMapping | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as OverlayObjectMapping) : null;
  } catch {
    return null;
  }
}

function writeCache(mapping: OverlayObjectMapping) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(mapping));
  } catch {
    /* non-fatal */
  }
}

export function clearOverlayMappingCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* non-fatal */
  }
}

async function describe(objectName: string): Promise<DescribeResult> {
  const { data, error } = await sfProxy<DescribeResult>(
    "GET",
    `/services/data/${SF_API_VERSION}/sobjects/${objectName}/describe`,
  );
  if (error || !data) {
    throw new OverlayMappingError(error || `Could not describe ${objectName}`);
  }
  return data;
}

const find = (
  fields: SObjectField[],
  patterns: RegExp[],
  types: string[],
  exclude: RegExp[] = [],
) =>
  fields.find(
    (f) =>
      f.createable &&
      types.includes(f.type) &&
      patterns.some((p) => p.test(f.name) || p.test(f.label)) &&
      !exclude.some((p) => p.test(f.name)),
  )?.name;

const NUMBER_TYPES = ["double", "currency", "percent", "int"];
const TEXT_TYPES = ["string", "textarea", "url", "picklist"];

function buildFromDescribe(d: DescribeResult): OverlayObjectMapping | null {
  const fields = d.fields;

  const nameField =
    fields.find((f) => f.name === "Name")?.name ??
    fields.find((f) => f.createable && /^name$/i.test(f.label))?.name;

  const venueField = fields.find(
    (f) =>
      f.createable &&
      f.type === "reference" &&
      (/propert|venue|track|facilit/i.test(f.name) || /propert|venue|track|facilit/i.test(f.label)),
  )?.name;

  const mediaAssetField = find(
    fields,
    [/media_?asset/i, /asset_?id/i, /media_?id/i],
    TEXT_TYPES,
  );

  const northField = find(fields, [/north/i], NUMBER_TYPES);
  const southField = find(fields, [/south/i], NUMBER_TYPES);
  const eastField = find(fields, [/east/i], NUMBER_TYPES);
  const westField = find(fields, [/west/i], NUMBER_TYPES);

  if (
    !nameField ||
    !venueField ||
    !mediaAssetField ||
    !northField ||
    !southField ||
    !eastField ||
    !westField
  ) {
    return null;
  }

  return {
    objectName: d.name,
    nameField,
    venueField,
    mediaAssetField,
    northField,
    southField,
    eastField,
    westField,
    descriptionField: find(fields, [/description/i, /notes/i], TEXT_TYPES),
    s3KeyField: find(fields, [/s3/i, /object_?key/i, /storage_?key/i], TEXT_TYPES),
    opacityField: find(fields, [/opacity/i], NUMBER_TYPES),
    rotationField: find(fields, [/rotation/i, /bearing/i, /heading/i], NUMBER_TYPES),
    zOrderField: find(fields, [/z_?order/i, /z_?index/i, /sort_?order/i], NUMBER_TYPES),
    visibleToFansField: find(fields, [/fan/i], ["boolean"]),
    visibleToMediaField: find(fields, [/media/i], ["boolean"], [/asset/i]),
    visibleToOpsField: find(fields, [/ops/i, /operation/i], ["boolean"]),
    lockedField: find(fields, [/lock/i], ["boolean"]),
    statusField: find(fields, [/status/i, /stage/i], TEXT_TYPES),
  };
}

let inFlight: Promise<OverlayObjectMapping> | null = null;

/**
 * Locate the overlay object in the connected org. Uses the cached mapping when
 * present, otherwise scans the global describe list for a createable object
 * that exposes bounds + a media asset reference + a venue lookup.
 */
export async function resolveOverlayObject(
  opts: { force?: boolean } = {},
): Promise<OverlayObjectMapping> {
  if (!opts.force) {
    const cached = readCache();
    if (cached) {
      try {
        const built = buildFromDescribe(await describe(cached.objectName));
        if (built) return built;
      } catch {
        /* fall through to rediscovery */
      }
      clearOverlayMappingCache();
    }
    if (inFlight) return inFlight;
  }

  inFlight = (async () => {
    const { data, error } = await sfProxy<{
      sobjects: { name: string; label: string; createable: boolean; custom: boolean }[];
    }>("GET", `/services/data/${SF_API_VERSION}/sobjects/`);
    if (error || !data) {
      throw new OverlayMappingError(error || "Could not list Salesforce objects");
    }

    const candidates = data.sobjects
      .filter((s) => s.createable)
      .filter((s) => /overlay|geo_?image|map_?image|basemap/i.test(`${s.name} ${s.label}`))
      .sort((a, b) => Number(b.custom) - Number(a.custom) || a.name.length - b.name.length)
      .slice(0, 8);

    for (const candidate of candidates) {
      try {
        const built = buildFromDescribe(await describe(candidate.name));
        if (built) {
          writeCache(built);
          return built;
        }
      } catch {
        /* try the next candidate */
      }
    }

    throw new OverlayMappingError(
      "No Salesforce overlay object was found. Track overlays need a custom object " +
        "with a venue lookup, a media asset id field and North/South/East/West number " +
        "fields. Create it in the connected org (or grant the connected user access), " +
        "then reload the Track Editor.",
    );
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}