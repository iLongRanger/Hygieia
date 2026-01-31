import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { prisma } from '../../../lib/prisma';
import * as pricingSettingsService from '../../pricingSettingsService';
import * as proposalService from '../../proposalService';
import * as pricingCalculatorService from '../../pricingCalculatorService';
import * as pricingModule from '../../pricing';

// Mock prisma
jest.mock('../../../lib/prisma', () => ({
  prisma: {
    proposal: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    proposalItem: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    proposalService: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    facility: {
      findUnique: jest.fn(),
    },
    account: {
      findUnique: jest.fn(),
    },
    facilityTask: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn((fn: any) => fn(prisma)),
  },
}));

// Mock pricingSettingsService
jest.mock('../../pricingSettingsService', () => ({
  getActivePricingSettings: jest.fn(),
}));

jest.mock('../../pricingCalculatorService', () => ({
  calculateFacilityPricing: jest.fn(),
  calculateFacilityPricingComparison: jest.fn(),
  generateProposalServicesFromFacility: jest.fn(),
  getFacilityTasksGrouped: jest.fn(),
}));

describe('Pricing Lock System - Regression Tests', () => {
  const mockPricingSettings = {
    id: 'settings-1',
    name: 'Default Settings',
    baseRatePerSqFt: 0.1,
    minimumMonthlyCharge: 250,
    laborCostPerHour: 20,
    laborBurdenPercentage: 0,
    sqftPerLaborHour: 1000,
    insurancePercentage: 0,
    adminOverheadPercentage: 0,
    equipmentPercentage: 0,
    supplyCostPercentage: 0,
    supplyCostPerSqFt: null,
    travelCostPerVisit: 0,
    targetProfitMargin: 0,
    hourlyRate: 35,
    floorTypeMultipliers: {
      vct: 1.0,
      carpet: 1.15,
      tile: 1.1,
    },
    frequencyMultipliers: {
      '1x_week': 1.0,
      '2x_week': 1.8,
    },
    conditionMultipliers: {
      standard: 1.0,
      medium: 1.25,
    },
    buildingTypeMultipliers: {
      office: 1.0,
      medical: 1.3,
    },
    taskComplexityAddOns: {
      standard: 0,
      sanitization: 0.15,
    },
  };

  const mockFacility = {
    id: 'facility-1',
    name: 'Test Facility',
    buildingType: 'office',
    defaultPricingStrategyKey: 'sqft_settings_v1',
    accountId: 'account-1',
    areas: [
      {
        id: 'area-1',
        name: 'Main Office',
        squareFeet: 5000,
        quantity: 1,
        floorType: 'vct',
        conditionLevel: 'standard',
        areaType: { name: 'Office' },
      },
    ],
  };

  const createMockProposal = (overrides = {}) => ({
    id: 'proposal-1',
    proposalNumber: 'PROP-001',
    accountId: 'account-1',
    facilityId: 'facility-1',
    title: 'Test Proposal',
    status: 'draft',
    pricingStrategyKey: 'sqft_settings_v1',
    pricingStrategyVersion: '1.0.0',
    pricingSnapshot: {
      pricingSettingsId: 'settings-1',
      pricingSettingsName: 'Default Settings',
      baseRatePerSqFt: 0.1,
      minimumMonthlyCharge: 250,
      hourlyRate: 0,
      floorTypeMultipliers: {},
      frequencyMultipliers: {},
      conditionMultipliers: {},
      buildingTypeMultipliers: {},
      taskComplexityAddOns: {},
      capturedAt: new Date().toISOString(),
    },
    pricingLocked: false,
    pricingLockedAt: null,
    subtotal: 500,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 500,
    tax: 0,
    total: 500,
    proposalServices: [],
    proposalItems: [],
    facility: mockFacility,
    account: { id: 'account-1', name: 'Test Account' },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(pricingModule, 'getStrategy').mockResolvedValue({
      key: 'sqft_settings_v1',
      version: '1.0.0',
      quote: jest.fn().mockImplementation(async (context: any) => {
        // Dynamically get the current settings from the mock
        const currentSettings = await pricingSettingsService.getActivePricingSettings();
        return {
          strategyKey: 'sqft_settings_v1',
          strategyVersion: '1.0.0',
          serviceFrequency: context.serviceFrequency,
          settingsSnapshot: {
            pricingSettingsId: currentSettings.id,
            pricingSettingsName: currentSettings.name,
            baseRatePerSqFt: Number(currentSettings.baseRatePerSqFt),
            minimumMonthlyCharge: Number(currentSettings.minimumMonthlyCharge),
            hourlyRate: Number(currentSettings.hourlyRate),
            floorTypeMultipliers: {},
            frequencyMultipliers: {},
            conditionMultipliers: {},
            buildingTypeMultipliers: {},
            taskComplexityAddOns: {},
            capturedAt: new Date().toISOString(),
          },
        };
      }),
      generateProposalServices: jest.fn().mockResolvedValue([
        {
          serviceName: 'Monthly Cleaning',
          serviceType: 'monthly',
          frequency: 'monthly',
          monthlyPrice: 500,
          description: 'Base service line',
          includedTasks: [],
        },
      ]),
    } as any);
    (pricingSettingsService.getActivePricingSettings as jest.Mock).mockResolvedValue(
      mockPricingSettings
    );
    (prisma.facility.findUnique as jest.Mock).mockResolvedValue(mockFacility);
    (prisma.facilityTask.findMany as jest.Mock).mockResolvedValue([]);
    (pricingCalculatorService.calculateFacilityPricing as jest.Mock).mockImplementation(
      async ({ facilityId, serviceFrequency }) => ({
        facilityId,
        facilityName: mockFacility.name,
        buildingType: mockFacility.buildingType,
        serviceFrequency,
        totalSquareFeet: 5000,
        areas: [],
        costBreakdown: {
          totalLaborCost: 0,
          totalLaborHours: 0,
          totalInsuranceCost: 0,
          totalAdminOverheadCost: 0,
          totalEquipmentCost: 0,
          totalTravelCost: 0,
          totalSupplyCost: 0,
          totalCostPerVisit: 0,
        },
        monthlyVisits: 4.33,
        monthlyCostBeforeProfit: 500,
        profitAmount: 0,
        profitMarginApplied: 0,
        buildingMultiplier: 1,
        buildingAdjustment: 0,
        taskComplexityAddOn: 0,
        taskComplexityAmount: 0,
        subtotal: 500,
        monthlyTotal: 500,
        minimumApplied: false,
        pricingSettingsId: mockPricingSettings.id,
        pricingSettingsName: mockPricingSettings.name,
      })
    );
    (pricingCalculatorService.generateProposalServicesFromFacility as jest.Mock).mockResolvedValue([
      {
        serviceName: 'Monthly Cleaning',
        serviceType: 'monthly',
        frequency: 'monthly',
        monthlyPrice: 500,
        description: 'Base service line',
        includedTasks: [],
      },
    ]);
  });

  describe('Locked pricing protection', () => {
    it('should prevent pricing recalculation when locked', async () => {
      const lockedProposal = createMockProposal({
        pricingLocked: true,
        pricingLockedAt: new Date(),
      });

      (prisma.proposal.findUnique as jest.Mock).mockResolvedValue(lockedProposal);

      // Attempting to recalculate should throw
      await expect(
        proposalService.recalculateProposalPricing('proposal-1', '2x_week')
      ).rejects.toThrow();
    });

    it('should prevent strategy change when locked', async () => {
      const lockedProposal = createMockProposal({
        pricingLocked: true,
        pricingLockedAt: new Date(),
      });

      (prisma.proposal.findUnique as jest.Mock).mockResolvedValue(lockedProposal);

      // Attempting to change strategy should throw
      await expect(
        proposalService.changeProposalPricingStrategy('proposal-1', 'new_strategy')
      ).rejects.toThrow();
    });

    it('should allow unlock then recalculate', async () => {
      const lockedProposal = createMockProposal({
        pricingLocked: true,
        pricingLockedAt: new Date(),
      });

      const unlockedProposal = createMockProposal({
        pricingLocked: false,
        pricingLockedAt: null,
      });

      // First call returns locked, second returns unlocked
      (prisma.proposal.findUnique as jest.Mock)
        .mockResolvedValueOnce(lockedProposal)
        .mockResolvedValueOnce(unlockedProposal);

      (prisma.proposal.update as jest.Mock).mockResolvedValue(unlockedProposal);

      // Unlock should succeed
      const unlocked = await proposalService.unlockProposalPricing('proposal-1');
      expect(unlocked.pricingLocked).toBe(false);
    });
  });

  describe('Snapshot preservation', () => {
    it('should preserve pricing snapshot when facility settings change', async () => {
      // Original proposal with snapshot
      const originalSnapshot = {
        pricingSettingsId: 'settings-1',
        pricingSettingsName: 'Default Settings',
        baseRatePerSqFt: 0.1, // Original rate
        minimumMonthlyCharge: 250,
        hourlyRate: 0,
        floorTypeMultipliers: {},
        frequencyMultipliers: {},
        conditionMultipliers: {},
        buildingTypeMultipliers: {},
        taskComplexityAddOns: {},
        capturedAt: '2024-01-01T00:00:00.000Z',
      };

      const proposal = createMockProposal({
        pricingLocked: true,
        pricingSnapshot: originalSnapshot,
      });

      (prisma.proposal.findUnique as jest.Mock).mockResolvedValue(proposal);

      // Even if pricing settings have changed
      const updatedPricingSettings = {
        ...mockPricingSettings,
        baseRatePerSqFt: 0.15, // New rate - 50% increase!
      };
      (pricingSettingsService.getActivePricingSettings as jest.Mock).mockResolvedValue(
        updatedPricingSettings
      );

      // The proposal's snapshot should remain unchanged
      const fetched = await proposalService.getProposalById('proposal-1');
      expect(fetched?.pricingSnapshot).toEqual(originalSnapshot);
    });

    it('should create new snapshot on recalculate', async () => {
      const proposal = createMockProposal({
        pricingLocked: false,
        pricingSnapshot: {
          pricingSettingsId: 'settings-1',
          pricingSettingsName: 'Default Settings',
          baseRatePerSqFt: 0.1,
          minimumMonthlyCharge: 250,
          hourlyRate: 0,
          floorTypeMultipliers: {},
          frequencyMultipliers: {},
          conditionMultipliers: {},
          buildingTypeMultipliers: {},
          taskComplexityAddOns: {},
          capturedAt: '2024-01-01T00:00:00.000Z',
        },
      });

      // Updated settings for recalculation
      const newSettings = {
        ...mockPricingSettings,
        id: 'settings-2',
        baseRatePerSqFt: 0.12,
      };
      (pricingSettingsService.getActivePricingSettings as jest.Mock).mockResolvedValue(newSettings);

      (prisma.proposal.findUnique as jest.Mock).mockResolvedValue(proposal);
      (prisma.proposal.update as jest.Mock).mockImplementation((args: any) => {
        return Promise.resolve({
          ...proposal,
          ...args.data,
        });
      });

      // Recalculate should update with new snapshot
      await proposalService.recalculateProposalPricing('proposal-1', '1x_week');

      expect(prisma.proposal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pricingSnapshot: expect.objectContaining({
              pricingSettingsId: 'settings-2',
              baseRatePerSqFt: 0.12,
            }),
          }),
        })
      );
    });
  });

  describe('Strategy version tracking', () => {
    it('should track strategy version in proposal', async () => {
      const proposal = createMockProposal({
        pricingStrategyKey: 'sqft_settings_v1',
        pricingStrategyVersion: '1.0.0',
      });

      (prisma.proposal.findUnique as jest.Mock).mockResolvedValue(proposal);

      const fetched = await proposalService.getProposalById('proposal-1');
      expect(fetched?.pricingStrategyKey).toBe('sqft_settings_v1');
      expect(fetched?.pricingStrategyVersion).toBe('1.0.0');
    });

    it('should update version on recalculate', async () => {
      const proposal = createMockProposal({
        pricingLocked: false,
        pricingStrategyKey: 'sqft_settings_v1',
        pricingStrategyVersion: '0.9.0', // Old version
      });

      (prisma.proposal.findUnique as jest.Mock).mockResolvedValue(proposal);
      (prisma.proposal.update as jest.Mock).mockImplementation((args: any) => {
        return Promise.resolve({
          ...proposal,
          ...args.data,
        });
      });

      await proposalService.recalculateProposalPricing('proposal-1', '1x_week');

      expect(prisma.proposal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pricingStrategyVersion: '1.0.0', // Current version
          }),
        })
      );
    });
  });

  describe('Lock/unlock workflow', () => {
    it('should lock pricing and record timestamp', async () => {
      const proposal = createMockProposal({
        pricingLocked: false,
      });

      const lockedProposal = createMockProposal({
        pricingLocked: true,
        pricingLockedAt: new Date(),
      });

      (prisma.proposal.findUnique as jest.Mock).mockResolvedValue(proposal);
      (prisma.proposal.update as jest.Mock).mockResolvedValue(lockedProposal);

      const result = await proposalService.lockProposalPricing('proposal-1');

      expect(result.pricingLocked).toBe(true);
      expect(result.pricingLockedAt).toBeDefined();
    });

    it('should unlock pricing and clear timestamp', async () => {
      const lockedProposal = createMockProposal({
        pricingLocked: true,
        pricingLockedAt: new Date(),
      });

      const unlockedProposal = createMockProposal({
        pricingLocked: false,
        pricingLockedAt: null,
      });

      (prisma.proposal.findUnique as jest.Mock).mockResolvedValue(lockedProposal);
      (prisma.proposal.update as jest.Mock).mockResolvedValue(unlockedProposal);

      const result = await proposalService.unlockProposalPricing('proposal-1');

      expect(result.pricingLocked).toBe(false);
      expect(result.pricingLockedAt).toBeNull();
    });

    it('should allow locking after recalculation in one operation', async () => {
      const proposal = createMockProposal({
        pricingLocked: false,
      });

      const recalculatedAndLocked = createMockProposal({
        pricingLocked: true,
        pricingLockedAt: new Date(),
        subtotal: 600,
        total: 600,
      });

      (prisma.proposal.findUnique as jest.Mock).mockResolvedValue(proposal);
      (prisma.proposal.update as jest.Mock).mockResolvedValue(recalculatedAndLocked);

      const result = await proposalService.recalculateProposalPricing('proposal-1', '1x_week', {
        lockAfterRecalculation: true,
      });

      expect(result.pricingLocked).toBe(true);
    });
  });

  describe('Pricing preview without modification', () => {
    it('should return preview without modifying proposal', async () => {
      const proposal = createMockProposal({
        pricingLocked: true,
        subtotal: 500,
      });

      (prisma.proposal.findUnique as jest.Mock).mockResolvedValue(proposal);

      // Preview should work even on locked proposals
      const preview = await proposalService.getProposalPricingPreview(
        'proposal-1',
        '2x_week' // Different frequency for "what if" analysis
      );

      // Should return preview data
      expect(preview).toBeDefined();
      expect(preview.serviceFrequency).toBe('2x_week');

      // Proposal should NOT be updated
      expect(prisma.proposal.update).not.toHaveBeenCalled();
    });

    it('should allow previewing different strategies', async () => {
      const proposal = createMockProposal({
        pricingStrategyKey: 'sqft_settings_v1',
      });

      (prisma.proposal.findUnique as jest.Mock).mockResolvedValue(proposal);

      // Preview with same strategy (since we only have one)
      const preview = await proposalService.getProposalPricingPreview('proposal-1', '1x_week', {
        strategyKey: 'sqft_settings_v1',
      });

      expect(preview).toBeDefined();
      expect(preview.strategyKey).toBe('sqft_settings_v1');
    });
  });

  describe('Status-based restrictions', () => {
    it('should prevent changes to sent proposals without unlock', async () => {
      const sentProposal = createMockProposal({
        status: 'sent',
        pricingLocked: true,
      });

      (prisma.proposal.findUnique as jest.Mock).mockResolvedValue(sentProposal);

      await expect(
        proposalService.recalculateProposalPricing('proposal-1', '2x_week')
      ).rejects.toThrow();
    });

    it('should prevent changes to accepted proposals', async () => {
      const acceptedProposal = createMockProposal({
        status: 'accepted',
        pricingLocked: true,
      });

      (prisma.proposal.findUnique as jest.Mock).mockResolvedValue(acceptedProposal);

      await expect(
        proposalService.recalculateProposalPricing('proposal-1', '2x_week')
      ).rejects.toThrow();
    });
  });

  describe('Audit trail', () => {
    it('should include captured timestamp in snapshot', async () => {
      const proposal = createMockProposal({
        pricingLocked: false,
      });

      (prisma.proposal.findUnique as jest.Mock).mockResolvedValue(proposal);
      (prisma.proposal.update as jest.Mock).mockImplementation((args: any) => {
        return Promise.resolve({
          ...proposal,
          ...args.data,
        });
      });

      await proposalService.recalculateProposalPricing('proposal-1', '1x_week');

      expect(prisma.proposal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pricingSnapshot: expect.objectContaining({
              capturedAt: expect.any(String),
            }),
          }),
        })
      );
    });

    it('should preserve original snapshot when locked', async () => {
      const originalCapturedAt = '2024-01-01T00:00:00.000Z';
      const lockedProposal = createMockProposal({
        pricingLocked: true,
        pricingSnapshot: {
          pricingSettingsId: 'settings-1',
          pricingSettingsName: 'Default Settings',
          baseRatePerSqFt: 0.1,
          minimumMonthlyCharge: 250,
          hourlyRate: 0,
          floorTypeMultipliers: {},
          frequencyMultipliers: {},
          conditionMultipliers: {},
          buildingTypeMultipliers: {},
          taskComplexityAddOns: {},
          capturedAt: originalCapturedAt,
        },
      });

      (prisma.proposal.findUnique as jest.Mock).mockResolvedValue(lockedProposal);

      const fetched = await proposalService.getProposalById('proposal-1');

      expect(fetched?.pricingSnapshot.capturedAt).toBe(originalCapturedAt);
    });
  });
});

describe('Pricing Strategy Resolution - Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should use proposal strategy over facility default', async () => {
    const proposal = {
      id: 'proposal-1',
      pricingStrategyKey: 'proposal_specific_strategy',
      facilityId: 'facility-1',
      accountId: 'account-1',
    };

    const facility = {
      id: 'facility-1',
      defaultPricingStrategyKey: 'facility_default_strategy',
      accountId: 'account-1',
    };

    (prisma.proposal.findUnique as jest.Mock).mockResolvedValue(proposal);
    (prisma.facility.findUnique as jest.Mock).mockResolvedValue(facility);

    // The strategy resolver should pick proposal's strategy
    const { resolvePricingStrategyKey } = await import('../strategyRegistry');
    const key = await resolvePricingStrategyKey({ proposalId: 'proposal-1' });

    expect(key).toBe('proposal_specific_strategy');
  });

  it('should fall back to facility default when proposal has none', async () => {
    const proposal = {
      id: 'proposal-1',
      pricingStrategyKey: null,
      facilityId: 'facility-1',
      accountId: 'account-1',
    };

    const facility = {
      id: 'facility-1',
      defaultPricingStrategyKey: 'facility_default_strategy',
      accountId: 'account-1',
    };

    (prisma.proposal.findUnique as jest.Mock).mockResolvedValue(proposal);
    (prisma.facility.findUnique as jest.Mock).mockResolvedValue(facility);

    const { resolvePricingStrategyKey } = await import('../strategyRegistry');
    const key = await resolvePricingStrategyKey({ proposalId: 'proposal-1' });

    expect(key).toBe('facility_default_strategy');
  });

  it('should use system default when no custom strategies set', async () => {
    const proposal = {
      id: 'proposal-1',
      pricingStrategyKey: null,
      facilityId: 'facility-1',
      accountId: 'account-1',
    };

    const facility = {
      id: 'facility-1',
      defaultPricingStrategyKey: null,
      accountId: 'account-1',
    };

    const account = {
      id: 'account-1',
      defaultPricingStrategyKey: null,
    };

    (prisma.proposal.findUnique as jest.Mock).mockResolvedValue(proposal);
    (prisma.facility.findUnique as jest.Mock).mockResolvedValue(facility);
    (prisma.account.findUnique as jest.Mock).mockResolvedValue(account);

    const { resolvePricingStrategyKey, DEFAULT_PRICING_STRATEGY_KEY } = await import(
      '../strategyRegistry'
    );
    const key = await resolvePricingStrategyKey({ proposalId: 'proposal-1' });

    expect(key).toBe(DEFAULT_PRICING_STRATEGY_KEY);
  });
});
