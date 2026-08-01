// Helpers for multi-part polygon features.
// A polygon layer holds one or more parts; a single-part layer stays a plain
// GeoJSON Polygon so existing data and consumers are unaffected.

import type {
  FeatureGeometry,
  MultiPolygonGeometry,
  PolygonGeometry,
} from '@/types/feature';

export type Ring = [number, number][];

/** Outer rings of every part. Returns [] for non-polygon geometry. */
export function getPolygonParts(geometry: FeatureGeometry): Ring[] {
  if (geometry.type === 'Polygon') return [geometry.coordinates[0] ?? []];
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.map((part) => part[0] ?? []);
  }
  return [];
}

export function getPartCount(geometry: FeatureGeometry): number {
  return getPolygonParts(geometry).length;
}

/** Vertex count of a ring, excluding the duplicated closing point. */
export function partVertexCount(ring: Ring): number {
  if (ring.length < 2) return ring.length;
  const first = ring[0];
  const last = ring[ring.length - 1];
  const closed = first[0] === last[0] && first[1] === last[1];
  return closed ? ring.length - 1 : ring.length;
}

/** Ensure a ring's first and last coordinate match. */
export function closeRing(ring: Ring): Ring {
  if (ring.length === 0) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, first];
}

/** Rebuild polygon geometry from parts, collapsing a single part to Polygon. */
export function buildPolygonGeometry(
  parts: Ring[],
): PolygonGeometry | MultiPolygonGeometry {
  const closed = parts.filter((ring) => ring.length >= 3).map(closeRing);
  if (closed.length <= 1) {
    return { type: 'Polygon', coordinates: [closed[0] ?? []] };
  }
  return { type: 'MultiPolygon', coordinates: closed.map((ring) => [ring]) };
}

/** Add another part to an existing polygon geometry. */
export function appendPolygonPart(
  geometry: FeatureGeometry,
  ring: Ring,
): PolygonGeometry | MultiPolygonGeometry {
  return buildPolygonGeometry([...getPolygonParts(geometry), ring]);
}

/** Remove a part by index. Removing the last remaining part is a no-op. */
export function removePolygonPart(
  geometry: FeatureGeometry,
  index: number,
): PolygonGeometry | MultiPolygonGeometry {
  const parts = getPolygonParts(geometry);
  if (parts.length <= 1) return buildPolygonGeometry(parts);
  return buildPolygonGeometry(parts.filter((_, i) => i !== index));
}

/** Replace one part's ring, keeping the other parts untouched. */
export function replacePolygonPart(
  geometry: FeatureGeometry,
  index: number,
  ring: Ring,
): PolygonGeometry | MultiPolygonGeometry {
  const parts = getPolygonParts(geometry);
  return buildPolygonGeometry(parts.map((existing, i) => (i === index ? ring : existing)));
}

export function isPolygonGeometry(
  geometry: FeatureGeometry,
): geometry is PolygonGeometry | MultiPolygonGeometry {
  return geometry.type === 'Polygon' || geometry.type === 'MultiPolygon';
}