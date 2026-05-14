import { describe, expect, it } from '@jest/globals';
import {
  extractFacilityTimezone,
  resolveFacilityTimezone,
} from '../serviceScheduleService';

describe('serviceScheduleService timezone helpers', () => {
  describe('extractFacilityTimezone', () => {
    it('returns the timezone when address.timezone is a valid IANA zone', () => {
      expect(extractFacilityTimezone({ timezone: 'America/Los_Angeles' })).toBe(
        'America/Los_Angeles'
      );
    });

    it('accepts alternate keys like timeZone and time_zone', () => {
      expect(extractFacilityTimezone({ timeZone: 'Europe/London' })).toBe('Europe/London');
      expect(extractFacilityTimezone({ time_zone: 'Asia/Tokyo' })).toBe('Asia/Tokyo');
    });

    it('returns null when no timezone is present', () => {
      expect(extractFacilityTimezone({ street: '1 Main St' })).toBeNull();
    });

    it('returns null when the timezone string is not a valid IANA zone', () => {
      expect(extractFacilityTimezone({ timezone: 'Not/A_Real_Zone' })).toBeNull();
    });

    it('returns null for non-object inputs', () => {
      expect(extractFacilityTimezone(null)).toBeNull();
      expect(extractFacilityTimezone(undefined)).toBeNull();
      expect(extractFacilityTimezone('America/New_York')).toBeNull();
    });
  });

  describe('resolveFacilityTimezone', () => {
    it('returns the address timezone when valid', () => {
      expect(resolveFacilityTimezone({ timezone: 'America/Chicago' })).toBe(
        'America/Chicago'
      );
    });

    it('falls back to a real IANA timezone when the address has none', () => {
      const result = resolveFacilityTimezone({ street: '1 Main St' });
      // Must be a valid IANA zone usable by Intl.DateTimeFormat.
      expect(() =>
        new Intl.DateTimeFormat('en-US', { timeZone: result }).format(new Date())
      ).not.toThrow();
    });

    it('falls back when the timezone value is invalid', () => {
      const result = resolveFacilityTimezone({ timezone: 'Not/A_Real_Zone' });
      expect(() =>
        new Intl.DateTimeFormat('en-US', { timeZone: result }).format(new Date())
      ).not.toThrow();
    });

    it('falls back for null or undefined input', () => {
      expect(resolveFacilityTimezone(null)).toBeTruthy();
      expect(resolveFacilityTimezone(undefined)).toBeTruthy();
    });
  });
});
