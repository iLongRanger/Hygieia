import { describe, expect, it } from 'vitest';
import { shouldBypassAuthRedirect } from '../api';

describe('api auth redirect bypass', () => {
  it('does not force login redirects for public password setup endpoints', () => {
    expect(shouldBypassAuthRedirect('/auth/set-password/challenge')).toBe(true);
    expect(shouldBypassAuthRedirect('/api/v1/auth/set-password?token=abc')).toBe(true);
    expect(shouldBypassAuthRedirect('https://portal.example.com/api/v1/auth/reset-password')).toBe(true);
  });

  it('keeps protected API failures eligible for auth redirect handling', () => {
    expect(shouldBypassAuthRedirect('/contracts')).toBe(false);
    expect(shouldBypassAuthRedirect('/api/v1/auth/refresh')).toBe(false);
  });
});
