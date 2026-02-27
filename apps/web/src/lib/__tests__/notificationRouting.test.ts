import { describe, expect, it } from 'vitest';
import { getNotificationRoute } from '../notificationRouting';

describe('getNotificationRoute', () => {
  it('returns contract route for flat contractId metadata', () => {
    const route = getNotificationRoute({
      id: 'n-1',
      type: 'contract_team_assigned',
      title: 'Contract assigned',
      body: null,
      metadata: { contractId: 'contract-1' },
      readAt: null,
      emailSent: false,
      createdAt: new Date().toISOString(),
    });

    expect(route).toBe('/contracts/contract-1');
  });

  it('returns contract route for nested metadata payloads', () => {
    const route = getNotificationRoute({
      id: 'n-2',
      type: 'contract_team_assigned',
      title: 'Contract assigned',
      body: null,
      metadata: { payload: { data: { contract_id: 'contract-2' } } },
      readAt: null,
      emailSent: false,
      createdAt: new Date().toISOString(),
    });

    expect(route).toBe('/contracts/contract-2');
  });

  it('returns contract route for stringified metadata payloads', () => {
    const route = getNotificationRoute({
      id: 'n-3',
      type: 'contract_team_assigned',
      title: 'Contract assigned',
      body: null,
      metadata: JSON.stringify({ nested: { contractId: 'contract-3' } }) as any,
      readAt: null,
      emailSent: false,
      createdAt: new Date().toISOString(),
    });

    expect(route).toBe('/contracts/contract-3');
  });
});

