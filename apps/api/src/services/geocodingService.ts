import axios from 'axios';

interface GeocodedAddress {
  latitude: number;
  longitude: number;
}

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

function geocodingEnabled(): boolean {
  if (process.env.NODE_ENV === 'test') return false;
  return process.env.GEOCODING_ENABLED !== 'false';
}

export async function geocodeAddressIfNeeded(
  rawAddress: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (!geocodingEnabled()) return rawAddress;
  if (hasCoordinates(rawAddress)) return rawAddress;

  const query = buildQuery(rawAddress);
  if (!query) return rawAddress;

  try {
    const userAgent =
      process.env.GEOCODING_USER_AGENT ||
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

    if (latitude === null || longitude === null) return rawAddress;

    const geocoded: GeocodedAddress = { latitude, longitude };
    return {
      ...rawAddress,
      ...geocoded,
      geocodingProvider: 'nominatim',
      geocodedAt: new Date().toISOString(),
    };
  } catch {
    return rawAddress;
  }
}
