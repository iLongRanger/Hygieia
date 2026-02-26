import { BadRequestError } from '../middleware/errorHandler.js';

// ==================== Private Helpers ====================

function toObject(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  return input as Record<string, unknown>;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

// ==================== Exported Helpers ====================

export function getCoordinatesFromAddress(address: unknown): {
  latitude: number;
  longitude: number;
  geofenceRadiusMeters: number;
} | null {
  const raw = toObject(address);
  if (!raw) return null;

  const nestedLocation = toObject(raw.location);
  const nestedCoordinates = toObject(raw.coordinates);
  const lat =
    toNumber(raw.latitude) ??
    toNumber(raw.lat) ??
    toNumber(nestedLocation?.latitude) ??
    toNumber(nestedLocation?.lat) ??
    toNumber(nestedCoordinates?.latitude) ??
    toNumber(nestedCoordinates?.lat);
  const lng =
    toNumber(raw.longitude) ??
    toNumber(raw.lng) ??
    toNumber(nestedLocation?.longitude) ??
    toNumber(nestedLocation?.lng) ??
    toNumber(nestedCoordinates?.longitude) ??
    toNumber(nestedCoordinates?.lng);

  if (lat === null || lng === null) return null;
  const geofenceRadiusMeters =
    toNumber(raw.geofenceRadiusMeters) ??
    toNumber(raw.geofence_radius_meters) ??
    150;

  return {
    latitude: lat,
    longitude: lng,
    geofenceRadiusMeters,
  };
}

export function getCoordinatesFromGeoLocation(geoLocation: unknown): {
  latitude: number;
  longitude: number;
  accuracy: number | null;
} | null {
  const raw = toObject(geoLocation);
  if (!raw) return null;

  const latitude = toNumber(raw.latitude) ?? toNumber(raw.lat);
  const longitude = toNumber(raw.longitude) ?? toNumber(raw.lng);
  if (latitude === null || longitude === null) return null;

  return {
    latitude,
    longitude,
    accuracy: toNumber(raw.accuracy),
  };
}

export function calculateDistanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const earthRadius = 6371000;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const haversine =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return Math.round(earthRadius * c);
}

export function validateGeofence(
  geoLocation: { latitude: number; longitude: number; accuracy: number | null },
  facilityCoords: { latitude: number; longitude: number; geofenceRadiusMeters: number }
): { verified: true; distanceMeters: number; allowedRadiusMeters: number } {
  const distance = calculateDistanceMeters(geoLocation, facilityCoords);
  if (distance > facilityCoords.geofenceRadiusMeters) {
    throw new BadRequestError('You must be at the facility to perform this action', {
      code: 'OUTSIDE_FACILITY_GEOFENCE',
      distanceMeters: distance,
      allowedRadiusMeters: facilityCoords.geofenceRadiusMeters,
    });
  }
  return {
    verified: true,
    distanceMeters: distance,
    allowedRadiusMeters: facilityCoords.geofenceRadiusMeters,
  };
}
