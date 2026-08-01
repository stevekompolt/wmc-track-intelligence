import { sfProxy } from "@/services/salesforceAdminApi";

/**
 * Resolution of the Salesforce object + field API names that back the
 * Real Intelligence property/venue feed (`specific-property-list.py`).
 *
 * The feed only exposes name/id/coordinates, so the API names are discovered
 * at runtime once and cached. Everything the create path needs lives here —
 * a future field rename is a one-line change to the candidate patterns or an
 * override written into localStorage.
 */
export interface TrackObjectMapping {
  objectName: string;
  nameField: string;
  coordinatesField: string;
  descriptionField?: string;
}

const CACHE_KEY = "wmc_sf_track_object_mapping";
const API_VERSION = "v62.0";

const OBJECT_PATTERNS = [/propert/i, /venue/i, /track/i, /facilit/i];
const COORD_PATTERNS = [/coordinate/i, /lat_?lng/i, /geo_?location/i];
const DESC_PATTERNS = [/description/i, /notes/i];

export function readCachedMapping(): TrackObjectMapping | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as TrackObjectMapping) : null;
  } catch {
    return null;
  }
}

export function writeCachedMapping(mapping: TrackObjectMapping) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(mapping));
  } catch {
    /* non-fatal */
  }
}

export function clearCachedMapping() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* non-fatal */
  }
}

interface SObjectField {
  name: string;
  label: string;
  type: string;
  createable: boolean;
  nillable: boolean;
  defaultedOnCreate: boolean;
}

interface DescribeResult {
  name: string;
  createable: boolean;
  fields: SObjectField[];
}

function matches(value: string, patterns: RegExp[]) {
  return patterns.some((p) => p.test(value));
}

/**
 * Fields that must be supplied by the user because Salesforce will reject the
 * insert without them (required, not defaulted, not the name/coords fields).
 */
export interface ExtraRequiredField {
  name: string;
  label: string;
  type: string;
}

export interface ResolvedTrackObject {
  mapping: TrackObjectMapping;
  extraRequiredFields: ExtraRequiredField[];
}

let inFlight: Promise<ResolvedTrackObject> | null = null;

async function describe(objectName: string): Promise<DescribeResult> {
  const { data, error } = await sfProxy<DescribeResult>(
    "GET",
    `/services/data/${API_VERSION}/sobjects/${objectName}/describe`,
  );
  if (error || !data) throw new Error(error || `Could not describe ${objectName}`);
  return data;
}

function buildFromDescribe(d: DescribeResult): ResolvedTrackObject | null {
  const coords = d.fields.find(
    (f) => f.createable && f.type === "string" && matches(f.name, COORD_PATTERNS),
  );
  if (!coords) return null;

  const nameField =
    d.fields.find((f) => f.name === "Name" && f.createable)?.name ??
    d.fields.find((f) => f.createable && /^name$/i.test(f.label))?.name;
  if (!nameField) return null;

  const descriptionField = d.fields.find(
    (f) => f.createable && matches(f.name, DESC_PATTERNS),
  )?.name;

  const extraRequiredFields = d.fields
    .filter(
      (f) =>
        f.createable &&
        !f.nillable &&
        !f.defaultedOnCreate &&
        f.name !== nameField &&
        f.name !== coords.name &&
        f.name !== descriptionField,
    )
    .map((f) => ({ name: f.name, label: f.label, type: f.type }));

  return {
    mapping: {
      objectName: d.name,
      nameField,
      coordinatesField: coords.name,
      descriptionField,
    },
    extraRequiredFields,
  };
}

/**
 * Locate the property/venue object in the connected org. Uses the global
 * describe list, narrows to plausible objects, then describes each until one
 * exposes a createable coordinates text field.
 */
export async function resolveTrackObject(
  opts: { force?: boolean } = {},
): Promise<ResolvedTrackObject> {
  if (!opts.force) {
    const cached = readCachedMapping();
    if (cached) {
      const d = await describe(cached.objectName);
      const built = buildFromDescribe(d);
      if (built) return built;
      clearCachedMapping();
    }
    if (inFlight) return inFlight;
  }

  inFlight = (async () => {
    const { data, error } = await sfProxy<{
      sobjects: { name: string; label: string; createable: boolean; custom: boolean }[];
    }>("GET", `/services/data/${API_VERSION}/sobjects/`);
    if (error || !data) throw new Error(error || "Could not list Salesforce objects");

    const candidates = data.sobjects
      .filter((s) => s.createable)
      .filter((s) => matches(s.name, OBJECT_PATTERNS) || matches(s.label, OBJECT_PATTERNS))
      // Prefer custom/managed objects and shorter names (base object over junctions)
      .sort((a, b) => Number(b.custom) - Number(a.custom) || a.name.length - b.name.length)
      .slice(0, 8);

    for (const candidate of candidates) {
      try {
        const built = buildFromDescribe(await describe(candidate.name));
        if (built) {
          writeCachedMapping(built.mapping);
          return built;
        }
      } catch {
        /* try the next candidate */
      }
    }

    throw new Error(
      "Could not find the Salesforce property object with a coordinates field. " +
        "Confirm the Real Properties package is installed and the connected user has access to it.",
    );
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

export { API_VERSION as SF_API_VERSION };