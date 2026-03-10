import { describe, expect, it, jest } from '@jest/globals';
import {
  findPreferredOpportunityForAccount,
  findPreferredOpportunityForLead,
} from '../opportunityResolver';

describe('opportunityResolver', () => {
  it('prefers the most advanced open opportunity for an account over a newer lost one', async () => {
    const client = {
      opportunity: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'opp-lost',
            accountId: 'account-1',
            leadId: 'lead-1',
            status: 'lost',
            updatedAt: new Date('2026-03-10T12:00:00.000Z'),
            createdAt: new Date('2026-03-10T12:00:00.000Z'),
          },
          {
            id: 'opp-open',
            accountId: 'account-1',
            leadId: 'lead-2',
            status: 'negotiation',
            updatedAt: new Date('2026-03-10T08:00:00.000Z'),
            createdAt: new Date('2026-03-10T08:00:00.000Z'),
          },
        ]),
      },
    };

    const result = await findPreferredOpportunityForAccount(client as any, 'account-1');

    expect(result?.id).toBe('opp-open');
  });

  it('prefers the more advanced open opportunity for a lead', async () => {
    const client = {
      opportunity: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'opp-booked',
            accountId: 'account-1',
            leadId: 'lead-1',
            status: 'walk_through_booked',
            updatedAt: new Date('2026-03-10T09:00:00.000Z'),
            createdAt: new Date('2026-03-10T09:00:00.000Z'),
          },
          {
            id: 'opp-proposal',
            accountId: 'account-1',
            leadId: 'lead-1',
            status: 'proposal_sent',
            updatedAt: new Date('2026-03-10T08:00:00.000Z'),
            createdAt: new Date('2026-03-10T08:00:00.000Z'),
          },
        ]),
      },
    };

    const result = await findPreferredOpportunityForLead(client as any, 'lead-1');

    expect(result?.id).toBe('opp-proposal');
  });
});
