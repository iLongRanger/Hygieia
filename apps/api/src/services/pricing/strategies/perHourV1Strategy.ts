/**
 * Per-Hour V1 Pricing Strategy
 *
 * Calculates pricing based on task minutes per area/fixture with configurable multipliers.
 */

import { calculatePerHourPricing } from '../perHourCalculatorService';
import { getDefaultPricingSettings, getPricingSettingsById } from '../../pricingSettingsService';
import { getFacilityTasksGrouped } from '../../pricingCalculatorService';
import { prisma } from '../../../lib/prisma';
import type {
  PricingStrategy,
  PricingContext,
  PricingBreakdown,
  PricingSettingsSnapshot,
  ProposalServiceLine,
} from '../types';
import { PRICING_STRATEGY_KEYS } from '../types';

export class PerHourV1Strategy implements PricingStrategy {
  readonly key = PRICING_STRATEGY_KEYS.PER_HOUR_V1;
  readonly name = 'Per Hour (Task Minutes V1)';
  readonly description =
    'Calculates pricing based on task minutes per area, fixtures, and per-worker hourly rate.';
  readonly version = '1.0.0';

  async quote(context: PricingContext): Promise<PricingBreakdown> {
    const { facilityId, serviceFrequency, taskComplexity = 'standard', workerCount = 1, pricingPlanId, subcontractorPercentageOverride } = context;

    const pricingResult = await calculatePerHourPricing({
      facilityId,
      serviceFrequency,
      taskComplexity,
      pricingPlanId,
      workerCount,
      subcontractorPercentageOverride,
    });

    const pricingSettings = pricingPlanId
      ? await getPricingSettingsById(pricingPlanId)
      : await getDefaultPricingSettings();
    if (!pricingSettings) {
      throw new Error('No pricing plan found');
    }

    const settingsSnapshot: PricingSettingsSnapshot = {
      pricingPlanId: pricingSettings.id,
      pricingPlanName: pricingSettings.name,
      pricingType: pricingSettings.pricingType,
      baseRatePerSqFt: Number(pricingSettings.baseRatePerSqFt),
      minimumMonthlyCharge: Number(pricingSettings.minimumMonthlyCharge),
      hourlyRate: Number(pricingSettings.hourlyRate),
      floorTypeMultipliers: pricingSettings.floorTypeMultipliers as Record<string, number>,
      frequencyMultipliers: pricingSettings.frequencyMultipliers as Record<string, number>,
      conditionMultipliers: pricingSettings.conditionMultipliers as Record<string, number>,
      trafficMultipliers: pricingSettings.trafficMultipliers as Record<string, number>,
      sqftPerLaborHour: pricingSettings.sqftPerLaborHour as Record<string, number>,
      taskComplexityAddOns: pricingSettings.taskComplexityAddOns as Record<string, number>,
      capturedAt: new Date().toISOString(),
      workerCount,
    };

    return {
      ...pricingResult,
      strategyKey: this.key,
      strategyVersion: this.version,
      settingsSnapshot,
    };
  }

  async generateProposalServices(context: PricingContext): Promise<ProposalServiceLine[]> {
    const { facilityId, serviceFrequency, workerCount = 1, pricingPlanId } = context;

    const pricing = await calculatePerHourPricing({
      facilityId,
      serviceFrequency,
      pricingPlanId,
      workerCount,
    });

    const { byArea } = await getFacilityTasksGrouped(facilityId);
    const areaFixtures = await prisma.area.findMany({
      where: { facilityId, archivedAt: null },
      select: {
        id: true,
        fixtures: {
          select: {
            count: true,
            fixtureType: {
              select: { name: true },
            },
          },
        },
      },
    });

    const fixturesByArea = new Map<string, { name: string; count: number }[]>();
    for (const area of areaFixtures) {
      fixturesByArea.set(
        area.id,
        area.fixtures.map((fixture) => ({
          name: fixture.fixtureType.name,
          count: fixture.count,
        }))
      );
    }

    const totalAreaCost = pricing.areas.reduce((sum, area) => sum + area.totalLaborCost, 0);
    const frequencyLabel = getFrequencyLabel(serviceFrequency);

    if (pricing.areas.length === 0) {
      return [
        {
          serviceName: `${frequencyLabel} Cleaning Service`,
          serviceType: mapFrequencyToServiceType(serviceFrequency),
          frequency: mapFrequencyToProposalFrequency(serviceFrequency),
          monthlyPrice: pricing.monthlyTotal,
          description: 'Includes all scheduled cleaning tasks for the facility.',
          includedTasks: [],
        },
      ];
    }

    return pricing.areas.map((area) => {
      const areaTasks = byArea.get(area.areaId);

      const tasksByFreq: Record<string, string[]> = {};
      if (areaTasks) {
        for (const task of areaTasks.tasks) {
          if (!tasksByFreq[task.frequency]) {
            tasksByFreq[task.frequency] = [];
          }
          tasksByFreq[task.frequency].push(task.name);
        }
      }

      const descriptionParts: string[] = [
        `${area.squareFeet} sq ft ${area.floorType} flooring`,
      ];

      const fixtures = fixturesByArea.get(area.areaId) || [];
      if (fixtures.length > 0) {
        const fixtureSummary = fixtures
          .map((fixture) => `${fixture.name} x${fixture.count}`)
          .join(', ');
        descriptionParts.push(`Items: ${fixtureSummary}`);
      }

      const frequencyOrder = ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annual'];
      const frequencyLabels: Record<string, string> = {
        daily: 'Daily',
        weekly: 'Weekly',
        biweekly: 'Bi-Weekly',
        monthly: 'Monthly',
        quarterly: 'Quarterly',
        annual: 'Yearly',
        as_needed: 'As Needed',
      };

      for (const freq of frequencyOrder) {
        if (tasksByFreq[freq] && tasksByFreq[freq].length > 0) {
          descriptionParts.push(`${frequencyLabels[freq] || freq}: ${tasksByFreq[freq].join(', ')}`);
        }
      }

      const allTasks = areaTasks?.tasks.map((t) => t.name) || [];
      const areaShare = totalAreaCost > 0 ? area.totalLaborCost / totalAreaCost : 0;
      const areaMonthlyPrice = roundToTwo(pricing.monthlyTotal * areaShare);

      return {
        serviceName: area.areaName,
        serviceType: mapFrequencyToServiceType(serviceFrequency),
        frequency: mapFrequencyToProposalFrequency(serviceFrequency),
        monthlyPrice: areaMonthlyPrice,
        description: descriptionParts.join('\n'),
        includedTasks: allTasks,
      };
    });
  }

  async compareFrequencies(
    facilityId: string,
    frequencies: string[] = ['1x_week', '2x_week', '3x_week', '5x_week']
  ): Promise<{ frequency: string; monthlyTotal: number }[]> {
    const results = await Promise.all(
      frequencies.map(async (frequency) => {
        const pricing = await calculatePerHourPricing({
          facilityId,
          serviceFrequency: frequency,
        });
        return {
          frequency,
          monthlyTotal: pricing.monthlyTotal,
        };
      })
    );
    return results;
  }
}

export const perHourV1Strategy = new PerHourV1Strategy();

function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}

function getFrequencyLabel(frequency: string): string {
  const labels: Record<string, string> = {
    '1x_week': 'Weekly (1x)',
    '2x_week': 'Bi-Weekly (2x)',
    '3x_week': '3x Weekly',
    '4x_week': '4x Weekly',
    '5x_week': '5x Weekly',
    daily: 'Daily',
    weekly: 'Weekly',
    biweekly: 'Bi-Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
  };
  return labels[frequency] || frequency;
}

function mapFrequencyToServiceType(frequency: string): string {
  const mapping: Record<string, string> = {
    '1x_week': 'weekly',
    '2x_week': 'weekly',
    '3x_week': 'weekly',
    '4x_week': 'weekly',
    '5x_week': 'daily',
    daily: 'daily',
    weekly: 'weekly',
    biweekly: 'biweekly',
    monthly: 'monthly',
    quarterly: 'quarterly',
  };
  return mapping[frequency] || 'monthly';
}

function mapFrequencyToProposalFrequency(frequency: string): string {
  const mapping: Record<string, string> = {
    '1x_week': 'weekly',
    '2x_week': 'weekly',
    '3x_week': 'weekly',
    '4x_week': 'weekly',
    '5x_week': 'weekly',
    daily: 'daily',
    weekly: 'weekly',
    biweekly: 'biweekly',
    monthly: 'monthly',
    quarterly: 'quarterly',
  };
  return mapping[frequency] || 'monthly';
}
