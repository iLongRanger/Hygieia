import axios from 'axios';

interface GeocodedAddress {
  latitude: number;
  longitude: number;
}

const FALLBACK_GEOFENCE_RADIUS_METERS = 100;

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getAddressPart(address: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = address[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function buildQuery(address: Record<string, unknown>): string | null {
  const parts = [
    getAddressPart(address, ['street', 'line1', 'address1']),
    getAddressPart(address, ['city', 'town']),
    getAddressPart(address, ['state', 'province']),
    getAddressPart(address, ['postalCode', 'zip', 'zipCode']),
    getAddressPart(address, ['country']),
  ].filter(Boolean) as string[];

  return parts.length ? parts.join(', ') : null;
}

function hasCoordinates(address: Record<string, unknown>): boolean {
  const lat = toNumber(address.latitude) ?? toNumber(address.lat);
  const lng = toNumber(address.longitude) ?? toNumber(address.lng);
  return lat !== null && lng !== null;
}

function resolveDefaultGeofenceRadiusMeters(): number {
  const fromEnv = toNumber(process.env.DEFAULT_GEOFENCE_RADIUS_METERS);
  if (fromEnv !== null && fromEnv > 0) return fromEnv;
  return FALLBACK_GEOFENCE_RADIUS_METERS;
}

function hasGeofenceRadius(address: Record<string, unknown>): boolean {
  const radius = toNumber(address.geofenceRadiusMeters);
  return radius !== null && radius > 0;
}

function withDefaultGeofenceRadius(
  address: Record<string, unknown>
): Record<string, unknown> {
  if (!hasCoordinates(address) || hasGeofenceRadius(address)) {
    return address;
  }
  return {
    ...address,
    geofenceRadiusMeters: resolveDefaultGeofenceRadiusMeters(),
  };
}

function geocodingEnabled(): boolean {
  if (process.env.NODE_ENV === 'test') return false;
  return process.env.GEOCODING_ENABLED !== 'false';
}

export async function geocodeAddressIfNeeded(
  rawAddress: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (!geocodingEnabled()) return withDefaultGeofenceRadius(rawAddress);
  if (hasCoordinates(rawAddress)) return withDefaultGeofenceRadius(rawAddress);

  const query = buildQuery(rawAddress);
  if (!query) return withDefaultGeofenceRadius(rawAddress);

  try {
    const userAgent =
      process.env.GEOCODING_USER_AGENT ??
      'Hygieia/1.0 (facility-geocoder)';
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: query,
        format: 'jsonv2',
        limit: 1,
      },
      headers: {
        'User-Agent': userAgent,
      },
      timeout: 5000,
    });

    const first = Array.isArray(response.data) ? response.data[0] : null;
    const latitude = first ? toNumber(first.lat) : null;
    const longitude = first ? toNumber(first.lon) : null;

    if (latitude === null || longitude === null) {
      return withDefaultGeofenceRadius(rawAddress);
    }

    const geocoded: GeocodedAddress = { latitude, longitude };
    return withDefaultGeofenceRadius({
      ...rawAddress,
      ...geocoded,
      geocodingProvider: 'nominatim',
      geocodedAt: new Date().toISOString(),
    });
  } catch {
    return withDefaultGeofenceRadius(rawAddress);
  }
}
