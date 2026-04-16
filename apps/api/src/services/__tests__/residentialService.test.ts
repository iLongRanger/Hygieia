import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as residentialService from '../residentialService';
import { prisma } from '../../lib/prisma';
import {
  autoAdvanceLeadStatusForAccount,
  autoSetLeadStatusForAccount,
} from '../leadService';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    account: {
      findUnique: jest.fn(),
    },
    residentialProperty: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    facility: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
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

  it('createResidentialProperty should create a linked facility in the same transaction', async () => {
    const tx = {
      residentialProperty: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({
          id: 'property-1',
          accountId: 'account-1',
          name: 'Maple House',
          serviceAddress: { street: '123 Maple' },
          homeProfile: {
            homeType: 'single_family',
            parkingAccess: 'Driveway',
            entryNotes: 'Side door',
            specialInstructions: 'Beware of dog',
          },
          defaultTasks: [],
          accessNotes: null,
          parkingAccess: 'Driveway',
          entryNotes: 'Side door',
          pets: false,
          isPrimary: true,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          archivedAt: null,
          createdByUser: { id: 'user-1', fullName: 'User' },
          account: { id: 'account-1', name: 'Maple Account', type: 'residential' },
          facility: null,
        }),
      },
      facility: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'facility-1', name: 'Maple House' }),
        update: jest.fn(),
      },
      account: {
        update: jest.fn().mockResolvedValue({}),
      },
    };

    (prisma.account.findUnique as jest.Mock).mockResolvedValue({
      id: 'account-1',
      name: 'Maple Account',
      type: 'residential',
      archivedAt: null,
    });
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx));

    await residentialService.createResidentialProperty(
      {
        accountId: 'account-1',
        name: 'Maple House',
        serviceAddress: { street: '123 Maple' },
        homeProfile: {
          homeType: 'single_family',
          squareFeet: 1800,
          bedrooms: 3,
          fullBathrooms: 2,
          halfBathrooms: 1,
          levels: 2,
          occupiedStatus: 'occupied',
          condition: 'standard',
          parkingAccess: 'Driveway',
          entryNotes: 'Side door',
          specialInstructions: 'Beware of dog',
        },
        defaultTasks: [],
        isPrimary: true,
      },
      'user-1'
    );

    expect(tx.facility.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          accountId: 'account-1',
          residentialPropertyId: 'property-1',
          name: 'Maple House',
          buildingType: 'single_family',
          parkingInfo: 'Driveway',
          accessInstructions: 'Side door',
          specialRequirements: 'Beware of dog',
        }),
      })
    );
  });

  it('updateResidentialProperty should sync the linked facility metadata', async () => {
    const tx = {
      residentialProperty: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        update: jest.fn().mockResolvedValue({
          id: 'property-1',
          accountId: 'account-1',
          name: 'Maple House Updated',
          serviceAddress: { street: '789 Pine' },
          homeProfile: {
            homeType: 'townhouse',
            parkingAccess: 'Garage',
            entryNotes: 'Front desk',
            specialInstructions: 'Call on arrival',
          },
          defaultTasks: [],
          accessNotes: null,
          parkingAccess: 'Garage',
          entryNotes: 'Front desk',
          pets: false,
          isPrimary: false,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          archivedAt: null,
          createdByUser: { id: 'user-1', fullName: 'User' },
          account: { id: 'account-1', name: 'Maple Account', type: 'residential' },
          facility: { id: 'facility-1' },
        }),
      },
      facility: {
        findFirst: jest.fn().mockResolvedValue({ id: 'facility-1' }),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'facility-1', name: 'Maple House Updated' }),
      },
      account: {
        update: jest.fn().mockResolvedValue({}),
      },
    };

    (prisma.residentialProperty.findUnique as jest.Mock).mockResolvedValue({
      id: 'property-1',
      accountId: 'account-1',
      name: 'Maple House',
      serviceAddress: { street: '123 Maple' },
      homeProfile: {
        homeType: 'single_family',
        squareFeet: 1800,
        bedrooms: 3,
        fullBathrooms: 2,
        halfBathrooms: 1,
        levels: 2,
        occupiedStatus: 'occupied',
        condition: 'standard',
      },
      defaultTasks: [],
      accessNotes: null,
      parkingAccess: null,
      entryNotes: null,
      pets: false,
      isPrimary: false,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archivedAt: null,
      createdByUser: { id: 'user-1', fullName: 'User' },
      account: { id: 'account-1', name: 'Maple Account', type: 'residential' },
      facility: { id: 'facility-1' },
    });
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx));

    await residentialService.updateResidentialProperty('property-1', {
      name: 'Maple House Updated',
      serviceAddress: { street: '789 Pine' },
      homeProfile: {
        homeType: 'townhouse',
        squareFeet: 1600,
        bedrooms: 3,
        fullBathrooms: 2,
        halfBathrooms: 0,
        levels: 3,
        occupiedStatus: 'occupied',
        condition: 'light',
        parkingAccess: 'Garage',
        entryNotes: 'Front desk',
        specialInstructions: 'Call on arrival',
      },
    });

    expect(tx.facility.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'facility-1' },
        data: expect.objectContaining({
          name: 'Maple House Updated',
          residentialPropertyId: 'property-1',
          buildingType: 'townhouse',
          parkingInfo: 'Garage',
          accessInstructions: 'Front desk',
          specialRequirements: 'Call on arrival',
        }),
      })
    );
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
