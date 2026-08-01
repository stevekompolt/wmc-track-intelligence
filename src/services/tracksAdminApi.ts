import { sfProxy } from "@/services/salesforceAdminApi";
import {
  resolveTrackObject,
  SF_API_VERSION,
  type ExtraRequiredField,
  type TrackObjectMapping,
} from "@/services/salesforceTrackObject";
import type { Track } from "@/types/track";

export interface CreateTrackInput {
  name: string;
  latitude: number;
  longitude: number;
  zoom: number;
  description?: string;
  /** API name → value for any additional Salesforce-required fields */
  extraFields?: Record<string, string>;
}

/** Format matching the parser in tracksApi.ts: "lat,lng,zoom" */
export function formatCoordinates(latitude: number, longitude: number, zoom: number) {
  return `${latitude.toFixed(6)},${longitude.toFixed(6)},${Math.round(zoom * 100) / 100}`;
}

export interface TrackObjectInfo {
  mapping: TrackObjectMapping;
  extraRequiredFields: ExtraRequiredField[];
}

export async function getTrackObjectInfo(force = false): Promise<TrackObjectInfo> {
  return resolveTrackObject({ force });
}

export async function createTrack(input: CreateTrackInput): Promise<Track> {
  const { mapping } = await resolveTrackObject();

  const record: Record<string, unknown> = {
    [mapping.nameField]: input.name,
    [mapping.coordinatesField]: formatCoordinates(
      input.latitude,
      input.longitude,
      input.zoom,
    ),
    ...(input.extraFields ?? {}),
  };
  if (mapping.descriptionField && input.description) {
    record[mapping.descriptionField] = input.description;
  }

  const { data, error } = await sfProxy<{ id: string; success: boolean; errors?: unknown[] }>(
    "POST",
    `/services/data/${SF_API_VERSION}/sobjects/${mapping.objectName}/`,
    record,
  );

  if (error) throw new Error(error);
  if (!data?.id) throw new Error("Salesforce did not return a record id");

  return {
    id: data.id,
    name: input.name,
    description: input.description,
    latitude: input.latitude,
    longitude: input.longitude,
    zoom: input.zoom,
  };
}