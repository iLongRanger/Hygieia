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
      count: jest.fn(),
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

  it('listResidentialProperties scopes managers to assigned accounts', async () => {
    (prisma.residentialProperty.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.residentialProperty.count as jest.Mock).mockResolvedValue(0);

    await residentialService.listResidentialProperties(
      { search: 'maple' },
      { userRole: 'manager', userId: 'manager-1' }
    );

    expect(prisma.residentialProperty.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          archivedAt: null,
          AND: expect.arrayContaining([
            {
              OR: [
                { name: { contains: 'maple', mode: 'insensitive' } },
                { account: { is: { name: { contains: 'maple', mode: 'insensitive' } } } },
              ],
            },
            { account: { is: { accountManagerId: 'manager-1' } } },
          ]),
        }),
      })
    );
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
      opportunity: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'opp-account-1',
            accountId: 'account-1',
            facilityId: null,
            leadId: 'lead-1',
            status: 'lead',
            updatedAt: new Date('2026-02-01T10:00:00.000Z'),
            createdAt: new Date('2026-02-01T10:00:00.000Z'),
          },
        ]),
        create: jest.fn().mockResolvedValue({ id: 'opp-facility-1' }),
        update: jest.fn().mockResolvedValue({ id: 'opp-account-1' }),
      },
      lead: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'lead-1',
          companyName: null,
          contactName: 'Jane Client',
          estimatedValue: 1200,
          probability: 20,
          expectedCloseDate: null,
          assignedToUserId: 'manager-1',
          createdByUserId: 'user-1',
        }),
      },
      contact: {
        findFirst: jest.fn().mockResolvedValue({ id: 'contact-1' }),
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
    expect(tx.opportunity.update).toHaveBeenCalledWith({
      where: { id: 'opp-account-1' },
      data: expect.objectContaining({
        leadId: 'lead-1',
        accountId: 'account-1',
        facilityId: 'facility-1',
        primaryContactId: 'contact-1',
        title: 'Maple House',
        status: 'lead',
      }),
    });
    expect(tx.opportunity.create).not.toHaveBeenCalled();
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
      opportunity: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      lead: {
        findUnique: jest.fn(),
      },
      contact: {
        findFirst: jest.fn(),
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

describe('calculateResidentialQuotePreview', () => {
  const pricingPlan = {
    id: 'plan-1',
    name: 'Residential Standard',
    strategyKey: 'residential_flat_v1',
    settings: {
      strategyKey: 'residential_flat_v1',
      homeTypeBasePrices: {
        apartment: 140,
        condo: 160,
        townhouse: 175,
        single_family: 190,
      },
      sqftBrackets: [
        { upTo: 1000, adjustment: 0 },
        { upTo: 1500, adjustment: 30 },
        { upTo: null, adjustment: 80 },
      ],
      bedroomAdjustments: {
        '0': 0,
        '1': 0,
        '2': 20,
        '3': 35,
      },
      bathroomAdjustments: {
        fullBath: 28,
        halfBath: 16,
      },
      levelAdjustments: {
        '1': 0,
        '2': 20,
      },
      conditionMultipliers: {
        light: 0.92,
        standard: 1,
        heavy: 1.28,
      },
      serviceTypeMultipliers: {
        recurring_standard: 1,
        one_time_standard: 1.12,
        deep_clean: 1.38,
        move_in_out: 1.48,
        turnover: 1.16,
        post_construction: 1.75,
      },
      frequencyDiscounts: {
        '1x_week': 0.12,
        '2x_week': 0.14,
        '3x_week': 0.16,
        '4x_week': 0.18,
        '5x_week': 0.2,
        '7x_week': 0.22,
        weekly: 0.12,
        biweekly: 0.08,
        every_4_weeks: 0.03,
        one_time: 0,
      },
      firstCleanSurcharge: {
        enabled: true,
        type: 'percent',
        value: 0.15,
        appliesTo: ['recurring_standard', 'deep_clean'],
      },
      addOnPrices: {},
      minimumPrice: 160,
      estimatedHours: {
        baseHoursByHomeType: {
          apartment: 1.6,
          condo: 1.9,
          townhouse: 2.2,
          single_family: 2.5,
        },
        minutesPerBedroom: 12,
        minutesPerFullBath: 18,
        minutesPerHalfBath: 10,
        minutesPer1000SqFt: 42,
        conditionMultipliers: {
          light: 0.9,
          standard: 1,
          heavy: 1.35,
        },
        serviceTypeMultipliers: {
          recurring_standard: 1,
          one_time_standard: 1.1,
          deep_clean: 1.45,
          move_in_out: 1.55,
          turnover: 1.12,
          post_construction: 1.8,
        },
        addOnMinutes: {},
      },
      manualReviewRules: {
        maxAutoSqft: 3500,
        heavyConditionRequiresReview: true,
        postConstructionRequiresReview: true,
        maxAddOnsBeforeReview: 5,
      },
    },
  } as any;

  const input = {
    propertyId: 'property-1',
    serviceType: 'recurring_standard',
    frequency: '1x_week',
    homeAddress: null,
    homeProfile: {
      homeType: 'single_family',
      squareFeet: 1200,
      bedrooms: 2,
      fullBathrooms: 1,
      halfBathrooms: 0,
      levels: 1,
      condition: 'standard',
      isFirstVisit: false,
    },
    pricingPlanId: null,
    addOns: [],
  } as any;

  it('calculates when all pricing inputs are explicit', () => {
    const preview = residentialService.calculateResidentialQuotePreview(input, pricingPlan);

    expect(preview.breakdown.finalTotal).toBeGreaterThanOrEqual(160);
    expect(preview.breakdown.firstCleanSurcharge).toBe(0);
  });

  it('rejects missing required residential pricing inputs instead of assuming values', () => {
    expect(() =>
      residentialService.calculateResidentialQuotePreview(
        {
          ...input,
          homeProfile: {
            ...input.homeProfile,
            squareFeet: null,
          },
        },
        pricingPlan
      )
    ).toThrow('Square feet is required before residential pricing can be calculated');
  });

  it('rejects missing first-visit selection instead of assuming no surcharge', () => {
    expect(() =>
      residentialService.calculateResidentialQuotePreview(
        {
          ...input,
          homeProfile: {
            ...input.homeProfile,
            isFirstVisit: null,
          },
        },
        pricingPlan
      )
    ).toThrow('First visit selection is required before residential pricing can be calculated');
  });
});
