/**
 * Overlay persistence — Salesforce is the system of record.
 *
 * Track Intelligence stores only the overlay relationship + geospatial
 * settings (venue, media asset reference, N/S/E/W bounds, opacity, rotation,
 * z-order, visibility, lock, status). The image binary itself lives in the
 * media system (Wasabi via media.worldmotoclash.com) and is referenced by
 * media asset id; the CDN URL is resolved at read time and never persisted.
 */

import type { MapOverlay, OverlayStatus } from '@/types/overlay';
import { createDefaultOverlay } from '@/types/overlay';
import { sfProxy } from '@/services/salesforceAdminApi';
import {
  resolveOverlayObject,
  type OverlayObjectMapping,
} from '@/services/salesforceOverlayObject';
import { SF_API_VERSION } from '@/services/salesforceTrackObject';
import { resolveAssetUrls } from '@/services/mediaAssetsApi';

type SfRecord = Record<string, unknown>;

const num = (v: unknown, fallback = 0): number =>
  typeof v === 'number' ? v : v === null || v === undefined || v === '' ? fallback : Number(v) || fallback;

const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.length > 0 ? v : undefined;

function normalizeStatus(v: unknown): OverlayStatus {
  const s = String(v ?? '').toLowerCase();
  if (s.startsWith('publish')) return 'published';
  if (s.startsWith('archiv')) return 'archived';
  return 'draft';
}

function recordToOverlay(
  record: SfRecord,
  m: OverlayObjectMapping,
  venueId: string,
): MapOverlay {
  const base = createDefaultOverlay(venueId);
  return {
    ...base,
    id: String(record.Id),
    venueId: str(record[m.venueField]) ?? venueId,
    name: str(record[m.nameField]) ?? 'Overlay',
    description: m.descriptionField ? str(record[m.descriptionField]) ?? '' : '',
    mediaAssetId: m.mediaAssetField ? str(record[m.mediaAssetField]) ?? null : null,
    s3Key: m.s3KeyField ? str(record[m.s3KeyField]) ?? null : null,
    imageUrl: '',
    boundingBox: {
      north: num(record[m.northField]),
      south: num(record[m.southField]),
      east: num(record[m.eastField]),
      west: num(record[m.westField]),
    },
    opacity: m.opacityField ? Math.min(1, num(record[m.opacityField], 0.85)) : 0.85,
    rotation: m.rotationField ? num(record[m.rotationField]) : 0,
    rotationDegrees: m.rotationField ? num(record[m.rotationField]) : 0,
    zOrder: m.zOrderField ? num(record[m.zOrderField]) : 0,
    visibleToFans: m.visibleToFansField ? Boolean(record[m.visibleToFansField]) : true,
    visibleToMedia: m.visibleToMediaField ? Boolean(record[m.visibleToMediaField]) : false,
    visibleToOps: m.visibleToOpsField ? Boolean(record[m.visibleToOpsField]) : true,
    isLocked: m.lockedField ? Boolean(record[m.lockedField]) : false,
    status: m.statusField ? normalizeStatus(record[m.statusField]) : 'draft',
    createdAt: str(record.CreatedDate),
    updatedAt: str(record.LastModifiedDate),
  };
}

function overlayToFields(
  updates: Partial<MapOverlay>,
  m: OverlayObjectMapping,
): SfRecord {
  const fields: SfRecord = {};
  const set = (field: string | undefined, value: unknown) => {
    if (field && value !== undefined) fields[field] = value;
  };

  set(m.nameField, updates.name);
  set(m.venueField, updates.venueId);
  set(m.descriptionField, updates.description);
  set(m.mediaAssetField, updates.mediaAssetId);
  set(m.s3KeyField, updates.s3Key);
  if (updates.boundingBox) {
    set(m.northField, updates.boundingBox.north);
    set(m.southField, updates.boundingBox.south);
    set(m.eastField, updates.boundingBox.east);
    set(m.westField, updates.boundingBox.west);
  }
  set(m.opacityField, updates.opacity);
  set(m.rotationField, updates.rotationDegrees ?? updates.rotation);
  set(m.zOrderField, updates.zOrder);
  set(m.visibleToFansField, updates.visibleToFans);
  set(m.visibleToMediaField, updates.visibleToMedia);
  set(m.visibleToOpsField, updates.visibleToOps);
  set(m.lockedField, updates.isLocked);
  if (updates.status && m.statusField) {
    fields[m.statusField] =
      updates.status.charAt(0).toUpperCase() + updates.status.slice(1);
  }
  return fields;
}

function selectFields(m: OverlayObjectMapping): string {
  const fields = [
    'Id',
    'CreatedDate',
    'LastModifiedDate',
    m.nameField,
    m.venueField,
    m.mediaAssetField,
    m.northField,
    m.southField,
    m.eastField,
    m.westField,
    m.descriptionField,
    m.s3KeyField,
    m.opacityField,
    m.rotationField,
    m.zOrderField,
    m.visibleToFansField,
    m.visibleToMediaField,
    m.visibleToOpsField,
    m.lockedField,
    m.statusField,
  ].filter(Boolean) as string[];
  return Array.from(new Set(fields)).join(',');
}

const escapeSoql = (v: string) => v.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

async function query<T>(soql: string): Promise<T[]> {
  const { data, error } = await sfProxy<{ records: T[] }>(
    'GET',
    `/services/data/${SF_API_VERSION}/query?q=${encodeURIComponent(soql)}`,
  );
  if (error || !data) throw new Error(error || 'Salesforce query failed');
  return data.records || [];
}

/** Attach resolved CDN URLs from the media catalog to overlay records. */
async function hydrateImages(overlays: MapOverlay[]): Promise<MapOverlay[]> {
  const ids = overlays.map(o => o.mediaAssetId).filter((v): v is string => !!v);
  if (ids.length === 0) return overlays;
  try {
    const urls = await resolveAssetUrls(ids);
    return overlays.map(o => ({
      ...o,
      imageUrl: (o.mediaAssetId && urls[o.mediaAssetId]) || o.imageUrl || '',
    }));
  } catch (err) {
    console.error('Could not resolve overlay image URLs from the media catalog:', err);
    return overlays;
  }
}

// Get all overlays for a venue
export const getOverlaysByVenue = async (venueId: string): Promise<MapOverlay[]> => {
  const m = await resolveOverlayObject();
  const records = await query<SfRecord>(
    `SELECT ${selectFields(m)} FROM ${m.objectName} WHERE ${m.venueField} = '${escapeSoql(venueId)}' ORDER BY CreatedDate ASC LIMIT 200`,
  );
  return hydrateImages(records.map(r => recordToOverlay(r, m, venueId)));
};

// Get a single overlay by ID
export const getOverlayById = async (overlayId: string): Promise<MapOverlay | null> => {
  const m = await resolveOverlayObject();
  const { data, error } = await sfProxy<SfRecord>(
    'GET',
    `/services/data/${SF_API_VERSION}/sobjects/${m.objectName}/${overlayId}`,
  );
  if (error || !data) return null;
  const overlay = recordToOverlay(data, m, str(data[m.venueField]) ?? '');
  const [hydrated] = await hydrateImages([overlay]);
  return hydrated;
};

// Create a new overlay record in Salesforce
export const createOverlay = async (
  venueId: string,
  name?: string,
): Promise<MapOverlay> => {
  const m = await resolveOverlayObject();
  const existing = await query<SfRecord>(
    `SELECT Id FROM ${m.objectName} WHERE ${m.venueField} = '${escapeSoql(venueId)}' LIMIT 200`,
  );

  const draft: MapOverlay = {
    ...createDefaultOverlay(venueId),
    name: name || `Overlay ${existing.length + 1}`,
    zOrder: existing.length + 1,
  };

  const { data, error } = await sfProxy<{ id: string; success: boolean }>(
    'POST',
    `/services/data/${SF_API_VERSION}/sobjects/${m.objectName}`,
    overlayToFields(draft, m),
  );
  if (error || !data?.id) {
    throw new Error(error || 'Salesforce rejected the new overlay record');
  }

  return { ...draft, id: data.id, createdAt: new Date().toISOString() };
};

// Update an existing overlay record
export const updateOverlay = async (
  overlayId: string,
  updates: Partial<Omit<MapOverlay, 'id' | 'createdAt'>>,
): Promise<MapOverlay | null> => {
  const m = await resolveOverlayObject();
  const fields = overlayToFields(updates, m);
  if (Object.keys(fields).length > 0) {
    const { error } = await sfProxy(
      'PATCH',
      `/services/data/${SF_API_VERSION}/sobjects/${m.objectName}/${overlayId}`,
      fields,
    );
    if (error) throw new Error(error);
  }
  return getOverlayById(overlayId);
};

// Delete an overlay record
export const deleteOverlay = async (overlayId: string): Promise<boolean> => {
  const m = await resolveOverlayObject();
  const { error } = await sfProxy(
    'DELETE',
    `/services/data/${SF_API_VERSION}/sobjects/${m.objectName}/${overlayId}`,
  );
  if (error) throw new Error(error);
  return true;
};

// Reorder overlay z-index
export const reorderOverlay = async (
  overlayId: string,
  newZOrder: number,
): Promise<MapOverlay | null> => {
  return updateOverlay(overlayId, { zOrder: newZOrder });
};
