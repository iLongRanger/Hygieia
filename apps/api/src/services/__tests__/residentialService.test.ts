import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as residentialService from '../residentialService';
import { prisma } from '../../lib/prisma';
import {
  autoAdvanceLeadStatusForAccount,
  autoSetLeadStatusForAccount,
} from '../leadService';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    residentialQuote: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../leadService', () => ({
  autoAdvanceLeadStatusForAccount: jest.fn().mockResolvedValue(undefined),
  autoSetLeadStatusForAccount: jest.fn().mockResolvedValue(undefined),
}));

describe('residentialService pipeline updates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sendResidentialQuote should advance the linked account to proposal_sent', async () => {
    (prisma.residentialQuote.findFirst as jest.Mock).mockResolvedValue({
      id: 'rq-1',
      accountId: 'account-1',
      status: 'draft',
      manualReviewRequired: false,
    });
    (prisma.residentialQuote.update as jest.Mock).mockResolvedValue({
      id: 'rq-1',
      accountId: 'account-1',
      status: 'sent',
    });

    await residentialService.sendResidentialQuote('rq-1');

    expect(autoAdvanceLeadStatusForAccount).toHaveBeenCalledWith('account-1', 'proposal_sent');
  });

  it('acceptResidentialQuote should advance the linked account to negotiation', async () => {
    (prisma.residentialQuote.findFirst as jest.Mock).mockResolvedValue({
      id: 'rq-1',
      accountId: 'account-1',
      status: 'sent',
    });
    (prisma.residentialQuote.update as jest.Mock).mockResolvedValue({
      id: 'rq-1',
      accountId: 'account-1',
      status: 'accepted',
    });

    await residentialService.acceptResidentialQuote('rq-1');

    expect(autoAdvanceLeadStatusForAccount).toHaveBeenCalledWith('account-1', 'negotiation');
  });

  it('declineResidentialQuote should mark the linked account pipeline as lost', async () => {
    (prisma.residentialQuote.findFirst as jest.Mock).mockResolvedValue({
      id: 'rq-1',
      accountId: 'account-1',
      status: 'sent',
    });
    (prisma.residentialQuote.update as jest.Mock).mockResolvedValue({
      id: 'rq-1',
      accountId: 'account-1',
      status: 'declined',
    });

    await residentialService.declineResidentialQuote('rq-1', { reason: 'Not interested' });

    expect(autoSetLeadStatusForAccount).toHaveBeenCalledWith('account-1', 'lost');
  });
});
