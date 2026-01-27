import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { prisma } from '../../../lib/prisma';
import * as pricingSettingsService from '../../pricingSettingsService';
import { SqftSettingsV1Strategy } from '../strategies/sqftSettingsV1Strategy';
import {
  pricingStrategyRegistry,
  resolvePricingStrategyKey,
  getStrategy,
  calculatePricing,
} from '../strategyRegistry';
import { PRICING_STRATEGY_KEYS, DEFAULT_PRICING_STRATEGY_KEY } from '../types';

// Mock prisma
jest.mock('../../../lib/prisma', () => ({
  prisma: {
    proposal: {
      findUnique: jest.fn(),
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
  },
}));

// Mock pricingSettingsService
jest.mock('../../pricingSettingsService', () => ({
  getActivePricingSettings: jest.fn(),
}));

describe('Pricing Strategy System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PRICING_STRATEGY_KEYS', () => {
    it('should have sqft_settings_v1 as a valid key', () => {
      expect(PRICING_STRATEGY_KEYS.SQFT_SETTINGS_V1).toBe('sqft_settings_v1');
    });

    it('should have per_hour_v1 as a valid key', () => {
      expect(PRICING_STRATEGY_KEYS.PER_HOUR_V1).toBe('per_hour_v1');
    });

    it('should have sqft_settings_v1 as default', () => {
      expect(DEFAULT_PRICING_STRATEGY_KEY).toBe('sqft_settings_v1');
    });
  });

  describe('PricingStrategyRegistry', () => {
    it('should have sqft_settings_v1 registered by default', () => {
      expect(pricingStrategyRegistry.has('sqft_settings_v1')).toBe(true);
    });

    it('should have per_hour_v1 registered by default', () => {
      expect(pricingStrategyRegistry.has('per_hour_v1')).toBe(true);
    });

    it('should return strategy by key', () => {
      const strategy = pricingStrategyRegistry.get('sqft_settings_v1');
      expect(strategy).toBeDefined();
      expect(strategy?.key).toBe('sqft_settings_v1');
    });

    it('should throw for unknown strategy key', () => {
      expect(() => pricingStrategyRegistry.getOrThrow('unknown_strategy')).toThrow(
        "Pricing strategy 'unknown_strategy' not found"
      );
    });

    it('should list all registered keys', () => {
      const keys = pricingStrategyRegistry.listKeys();
      expect(keys).toContain('sqft_settings_v1');
      expect(keys).toContain('per_hour_v1');
    });

    it('should list all strategies with metadata', () => {
      const strategies = pricingStrategyRegistry.listAll();
      expect(strategies.length).toBeGreaterThan(0);

      const sqftStrategy = strategies.find((s) => s.key === 'sqft_settings_v1');
      expect(sqftStrategy).toBeDefined();
      expect(sqftStrategy?.name).toBe('Square Footage (Settings V1)');
      expect(sqftStrategy?.isDefault).toBe(true);
      expect(sqftStrategy?.isActive).toBe(true);

      const perHourStrategy = strategies.find((s) => s.key === 'per_hour_v1');
      expect(perHourStrategy).toBeDefined();
      expect(perHourStrategy?.name).toBe('Per Hour (Task Minutes V1)');
      expect(perHourStrategy?.isActive).toBe(true);
    });

    it('should return default strategy', () => {
      const defaultStrategy = pricingStrategyRegistry.getDefault();
      expect(defaultStrategy.key).toBe('sqft_settings_v1');
    });
  });

  describe('resolvePricingStrategyKey', () => {
    it('should return proposal strategy if set', async () => {
      (prisma.proposal.findUnique as jest.Mock).mockResolvedValue({
        pricingStrategyKey: 'custom_strategy',
        facilityId: 'facility-1',
        accountId: 'account-1',
      });

      const key = await resolvePricingStrategyKey({ proposalId: 'proposal-1' });
      expect(key).toBe('custom_strategy');
    });

    it('should fall back to facility strategy if proposal has none', async () => {
      (prisma.proposal.findUnique as jest.Mock).mockResolvedValue({
        pricingStrategyKey: null,
        facilityId: 'facility-1',
        accountId: 'account-1',
      });

      (prisma.facility.findUnique as jest.Mock).mockResolvedValue({
        defaultPricingStrategyKey: 'facility_strategy',
        accountId: 'account-1',
      });

      const key = await resolvePricingStrategyKey({ proposalId: 'proposal-1' });
      expect(key).toBe('facility_strategy');
    });

    it('should fall back to account strategy if facility has none', async () => {
      (prisma.proposal.findUnique as jest.Mock).mockResolvedValue({
        pricingStrategyKey: null,
        facilityId: 'facility-1',
        accountId: 'account-1',
      });

      (prisma.facility.findUnique as jest.Mock).mockResolvedValue({
        defaultPricingStrategyKey: null,
        accountId: 'account-1',
      });

      (prisma.account.findUnique as jest.Mock).mockResolvedValue({
        defaultPricingStrategyKey: 'account_strategy',
      });

      const key = await resolvePricingStrategyKey({ proposalId: 'proposal-1' });
      expect(key).toBe('account_strategy');
    });

    it('should return default if no custom strategy set anywhere', async () => {
      (prisma.proposal.findUnique as jest.Mock).mockResolvedValue({
        pricingStrategyKey: null,
        facilityId: 'facility-1',
        accountId: 'account-1',
      });

      (prisma.facility.findUnique as jest.Mock).mockResolvedValue({
        defaultPricingStrategyKey: null,
        accountId: 'account-1',
      });

      (prisma.account.findUnique as jest.Mock).mockResolvedValue({
        defaultPricingStrategyKey: null,
      });

      const key = await resolvePricingStrategyKey({ proposalId: 'proposal-1' });
      expect(key).toBe(DEFAULT_PRICING_STRATEGY_KEY);
    });

    it('should use facilityId directly if provided', async () => {
      (prisma.facility.findUnique as jest.Mock).mockResolvedValue({
        defaultPricingStrategyKey: 'facility_strategy',
        accountId: 'account-1',
      });

      const key = await resolvePricingStrategyKey({ facilityId: 'facility-1' });
      expect(key).toBe('facility_strategy');
    });

    it('should use accountId directly if provided', async () => {
      (prisma.account.findUnique as jest.Mock).mockResolvedValue({
        defaultPricingStrategyKey: 'account_strategy',
      });

      const key = await resolvePricingStrategyKey({ accountId: 'account-1' });
      expect(key).toBe('account_strategy');
    });
  });

  describe('getStrategy', () => {
    it('should return strategy by explicit key', async () => {
      const strategy = await getStrategy({ strategyKey: 'sqft_settings_v1' });
      expect(strategy.key).toBe('sqft_settings_v1');
    });

    it('should resolve strategy from context if no explicit key', async () => {
      (prisma.facility.findUnique as jest.Mock).mockResolvedValue({
        defaultPricingStrategyKey: 'sqft_settings_v1',
        accountId: 'account-1',
      });

      const strategy = await getStrategy({ facilityId: 'facility-1' });
      expect(strategy.key).toBe('sqft_settings_v1');
    });
  });

  describe('SqftSettingsV1Strategy', () => {
    const strategy = new SqftSettingsV1Strategy();

    const mockPricingSettings = {
      id: 'settings-1',
      name: 'Default Settings',
      baseRatePerSqFt: 0.1,
      minimumMonthlyCharge: 250,
      floorTypeMultipliers: {
        vct: 1.0,
        carpet: 1.15,
        tile: 1.1,
        hardwood: 1.2,
        concrete: 0.9,
        other: 1.0,
      },
      frequencyMultipliers: {
        '1x_week': 1.0,
        '2x_week': 1.8,
        '3x_week': 2.5,
        '4x_week': 3.2,
        '5x_week': 4.0,
        daily: 4.33,
        weekly: 1.0,
        biweekly: 0.5,
        monthly: 0.25,
        quarterly: 0.083,
      },
      conditionMultipliers: {
        standard: 1.0,
        medium: 1.25,
        hard: 1.33,
      },
      buildingTypeMultipliers: {
        office: 1.0,
        medical: 1.3,
        industrial: 1.15,
        retail: 1.05,
        educational: 1.1,
        warehouse: 0.9,
        residential: 1.0,
        mixed: 1.05,
        other: 1.0,
      },
      taskComplexityAddOns: {
        standard: 0,
        sanitization: 0.15,
        biohazard: 0.5,
        high_security: 0.2,
      },
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      archivedAt: null,
    };

    const mockFacility = {
      id: 'facility-1',
      name: 'Test Facility',
      buildingType: 'office',
      areas: [
        {
          id: 'area-1',
          name: 'Main Office',
          squareFeet: 5000,
          quantity: 1,
          floorType: 'vct',
          conditionLevel: 'standard',
          areaType: { name: 'Office Area' },
        },
        {
          id: 'area-2',
          name: 'Conference Room',
          squareFeet: 1000,
          quantity: 2,
          floorType: 'carpet',
          conditionLevel: 'standard',
          areaType: { name: 'Conference Room' },
        },
      ],
    };

    beforeEach(() => {
      (pricingSettingsService.getActivePricingSettings as jest.Mock).mockResolvedValue(
        mockPricingSettings
      );
      (prisma.facility.findUnique as jest.Mock).mockResolvedValue(mockFacility);
      (prisma.facilityTask.findMany as jest.Mock).mockResolvedValue([]);
    });

    it('should have correct metadata', () => {
      expect(strategy.key).toBe('sqft_settings_v1');
      expect(strategy.name).toBe('Square Footage (Settings V1)');
      expect(strategy.version).toBe('1.0.0');
    });

    describe('quote', () => {
      it('should calculate pricing for a simple facility', async () => {
        const result = await strategy.quote({
          facilityId: 'facility-1',
          serviceFrequency: '1x_week',
        });

        expect(result.facilityId).toBe('facility-1');
        expect(result.facilityName).toBe('Test Facility');
        expect(result.buildingType).toBe('office');
        expect(result.serviceFrequency).toBe('1x_week');
        expect(result.strategyKey).toBe('sqft_settings_v1');
        expect(result.strategyVersion).toBe('1.0.0');
      });

      it('should calculate correct total square feet', async () => {
        const result = await strategy.quote({
          facilityId: 'facility-1',
          serviceFrequency: '1x_week',
        });

        // 5000 * 1 + 1000 * 2 = 7000 sqft total
        expect(result.totalSquareFeet).toBe(7000);
      });

      it('should apply floor type multipliers correctly', async () => {
        const result = await strategy.quote({
          facilityId: 'facility-1',
          serviceFrequency: '1x_week',
        });

        // Area 1: 5000 sqft * $0.10 * 1.0 (vct) * 1.0 (standard) = $500
        // Area 2: 2000 sqft * $0.10 * 1.15 (carpet) * 1.0 (standard) = $230
        expect(result.areas[0].basePrice).toBe(500);
        expect(result.areas[0].floorMultiplier).toBe(1.0);
        expect(result.areas[1].basePrice).toBe(200); // 2000 * 0.10
        expect(result.areas[1].floorMultiplier).toBe(1.15);
      });

      it('should apply frequency multipliers correctly', async () => {
        // Test 1x_week (multiplier = 1.0)
        const result1x = await strategy.quote({
          facilityId: 'facility-1',
          serviceFrequency: '1x_week',
        });

        // Test 2x_week (multiplier = 1.8)
        const result2x = await strategy.quote({
          facilityId: 'facility-1',
          serviceFrequency: '2x_week',
        });

        // Monthly total should be 1.8x higher for 2x_week
        expect(result2x.monthlyTotal).toBeCloseTo(result1x.monthlyTotal * 1.8, 1);
      });

      it('should apply building type multipliers correctly', async () => {
        // Test with medical building (multiplier = 1.3)
        const medicalFacility = {
          ...mockFacility,
          buildingType: 'medical',
        };
        (prisma.facility.findUnique as jest.Mock).mockResolvedValue(medicalFacility);

        const medicalResult = await strategy.quote({
          facilityId: 'facility-1',
          serviceFrequency: '1x_week',
        });

        // Reset to office
        (prisma.facility.findUnique as jest.Mock).mockResolvedValue(mockFacility);
        const officeResult = await strategy.quote({
          facilityId: 'facility-1',
          serviceFrequency: '1x_week',
        });

        // Medical should be ~1.3x more than office
        expect(medicalResult.buildingMultiplier).toBe(1.3);
        expect(officeResult.buildingMultiplier).toBe(1.0);
      });

      it('should apply minimum monthly charge when needed', async () => {
        // Create a very small facility
        const smallFacility = {
          ...mockFacility,
          areas: [
            {
              id: 'area-1',
              name: 'Small Room',
              squareFeet: 100,
              quantity: 1,
              floorType: 'vct',
              conditionLevel: 'standard',
              areaType: { name: 'Small Area' },
            },
          ],
        };
        (prisma.facility.findUnique as jest.Mock).mockResolvedValue(smallFacility);

        const result = await strategy.quote({
          facilityId: 'facility-1',
          serviceFrequency: '1x_week',
        });

        // 100 sqft * $0.10 = $10, which is below minimum of $250
        expect(result.minimumApplied).toBe(true);
        expect(result.monthlyTotal).toBe(250);
      });

      it('should include settings snapshot for audit trail', async () => {
        const result = await strategy.quote({
          facilityId: 'facility-1',
          serviceFrequency: '1x_week',
        });

        expect(result.settingsSnapshot).toBeDefined();
        expect(result.settingsSnapshot.pricingSettingsId).toBe('settings-1');
        expect(result.settingsSnapshot.baseRatePerSqFt).toBe(0.1);
        expect(result.settingsSnapshot.capturedAt).toBeDefined();
      });

      it('should throw error if no active pricing settings', async () => {
        (pricingSettingsService.getActivePricingSettings as jest.Mock).mockResolvedValue(null);

        await expect(
          strategy.quote({
            facilityId: 'facility-1',
            serviceFrequency: '1x_week',
          })
        ).rejects.toThrow('No active pricing settings found');
      });

      it('should throw error if facility not found', async () => {
        (prisma.facility.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(
          strategy.quote({
            facilityId: 'non-existent',
            serviceFrequency: '1x_week',
          })
        ).rejects.toThrow('Facility not found');
      });

      it('should apply task complexity add-ons', async () => {
        const standardResult = await strategy.quote({
          facilityId: 'facility-1',
          serviceFrequency: '1x_week',
          taskComplexity: 'standard',
        });

        const sanitizationResult = await strategy.quote({
          facilityId: 'facility-1',
          serviceFrequency: '1x_week',
          taskComplexity: 'sanitization',
        });

        // Sanitization adds 15%
        expect(sanitizationResult.monthlyTotal).toBeCloseTo(standardResult.monthlyTotal * 1.15, 1);
      });
    });

    describe('generateProposalServices', () => {
      it('should generate service lines for each area', async () => {
        const services = await strategy.generateProposalServices({
          facilityId: 'facility-1',
          serviceFrequency: '1x_week',
        });

        // Without tasks, should create one consolidated service
        expect(services.length).toBeGreaterThan(0);
        expect(services[0].serviceName).toBeDefined();
        expect(services[0].serviceType).toBeDefined();
        expect(services[0].frequency).toBeDefined();
        expect(services[0].monthlyPrice).toBeGreaterThan(0);
      });

      it('should include default tasks when no facility tasks exist', async () => {
        (prisma.facilityTask.findMany as jest.Mock).mockResolvedValue([]);

        const services = await strategy.generateProposalServices({
          facilityId: 'facility-1',
          serviceFrequency: '1x_week',
        });

        // Should have default included tasks
        const firstService = services[0];
        expect(firstService.includedTasks).toBeDefined();
        expect(firstService.includedTasks.length).toBeGreaterThan(0);
      });

      it('should group services by area when tasks exist', async () => {
        const mockTasks = [
          {
            id: 'task-1',
            customName: null,
            cleaningFrequency: 'daily',
            priority: 1,
            taskTemplate: { name: 'Vacuum Floors' },
            area: {
              id: 'area-1',
              name: 'Main Office',
              areaType: { name: 'Office Area' },
            },
          },
          {
            id: 'task-2',
            customName: 'Empty Trash',
            cleaningFrequency: 'daily',
            priority: 2,
            taskTemplate: null,
            area: {
              id: 'area-1',
              name: 'Main Office',
              areaType: { name: 'Office Area' },
            },
          },
        ];
        (prisma.facilityTask.findMany as jest.Mock).mockResolvedValue(mockTasks);

        const services = await strategy.generateProposalServices({
          facilityId: 'facility-1',
          serviceFrequency: '1x_week',
        });

        // Should have service lines for areas
        expect(services.length).toBeGreaterThan(0);
      });
    });

    describe('compareFrequencies', () => {
      it('should compare pricing across different frequencies', async () => {
        const comparisons = await strategy.compareFrequencies('facility-1');

        expect(comparisons.length).toBe(4); // default: 1x, 2x, 3x, 5x per week
        expect(comparisons.map((c) => c.frequency)).toEqual([
          '1x_week',
          '2x_week',
          '3x_week',
          '5x_week',
        ]);

        // Verify prices increase with frequency
        for (let i = 1; i < comparisons.length; i++) {
          expect(comparisons[i].monthlyTotal).toBeGreaterThan(comparisons[i - 1].monthlyTotal);
        }
      });

      it('should accept custom frequency list', async () => {
        const comparisons = await strategy.compareFrequencies('facility-1', [
          'weekly',
          'biweekly',
          'monthly',
        ]);

        expect(comparisons.length).toBe(3);
        expect(comparisons.map((c) => c.frequency)).toEqual(['weekly', 'biweekly', 'monthly']);
      });
    });

    describe('pricing calculation accuracy', () => {
      it('should match expected calculation for known inputs', async () => {
        // This is a regression test to ensure calculations remain consistent
        // Using known values:
        // - 5000 sqft VCT at standard condition = 5000 * 0.10 * 1.0 * 1.0 = $500
        // - 2000 sqft carpet at standard condition = 2000 * 0.10 * 1.15 * 1.0 = $230
        // - Subtotal = $730
        // - Building adjustment (office = 1.0) = $0
        // - Monthly total = $730 (with 1x_week)

        const result = await strategy.quote({
          facilityId: 'facility-1',
          serviceFrequency: '1x_week',
        });

        expect(result.subtotal).toBe(730);
        expect(result.buildingAdjustment).toBe(0);
        expect(result.monthlyTotal).toBe(730);
      });

      it('should handle condition multipliers correctly', async () => {
        const hardConditionFacility = {
          ...mockFacility,
          areas: [
            {
              id: 'area-1',
              name: 'Hard Condition Area',
              squareFeet: 1000,
              quantity: 1,
              floorType: 'vct',
              conditionLevel: 'hard',
              areaType: { name: 'Test Area' },
            },
          ],
        };
        (prisma.facility.findUnique as jest.Mock).mockResolvedValue(hardConditionFacility);

        const result = await strategy.quote({
          facilityId: 'facility-1',
          serviceFrequency: '1x_week',
        });

        // 1000 * 0.10 * 1.0 (vct) * 1.33 (hard) * 1.0 (1x_week) = $133
        expect(result.areas[0].conditionMultiplier).toBe(1.33);
        expect(result.areas[0].areaTotal).toBe(133);
      });
    });
  });

  describe('calculatePricing convenience function', () => {
    beforeEach(() => {
      const mockPricingSettings = {
        id: 'settings-1',
        name: 'Default Settings',
        baseRatePerSqFt: 0.1,
        minimumMonthlyCharge: 250,
        floorTypeMultipliers: { vct: 1.0 },
        frequencyMultipliers: { '1x_week': 1.0 },
        conditionMultipliers: { standard: 1.0 },
        buildingTypeMultipliers: { office: 1.0 },
        taskComplexityAddOns: { standard: 0 },
      };

      const mockFacility = {
        id: 'facility-1',
        name: 'Test',
        buildingType: 'office',
        areas: [
          {
            id: 'area-1',
            name: 'Area',
            squareFeet: 3000,
            quantity: 1,
            floorType: 'vct',
            conditionLevel: 'standard',
            areaType: { name: 'Office' },
          },
        ],
      };

      (pricingSettingsService.getActivePricingSettings as jest.Mock).mockResolvedValue(
        mockPricingSettings
      );
      (prisma.facility.findUnique as jest.Mock).mockResolvedValue(mockFacility);
    });

    it('should calculate pricing using default strategy', async () => {
      const result = await calculatePricing({
        facilityId: 'facility-1',
        serviceFrequency: '1x_week',
      });

      expect(result.facilityId).toBe('facility-1');
      expect(result.strategyKey).toBe('sqft_settings_v1');
    });

    it('should use explicit strategy key if provided', async () => {
      const result = await calculatePricing(
        {
          facilityId: 'facility-1',
          serviceFrequency: '1x_week',
        },
        { strategyKey: 'sqft_settings_v1' }
      );

      expect(result.strategyKey).toBe('sqft_settings_v1');
    });
  });
});
