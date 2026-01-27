/**
 * Square Footage Settings V1 Pricing Strategy
 *
 * This strategy wraps the existing pricingCalculatorService to calculate
 * prices based on square footage with multipliers for floor type, condition,
 * frequency, building type, etc.
 */

import {
  calculateFacilityPricing,
  calculateFacilityPricingComparison,
  generateProposalServicesFromFacility,
} from '../../pricingCalculatorService';
import { getActivePricingSettings } from '../../pricingSettingsService';
import type {
  PricingStrategy,
  PricingContext,
  PricingBreakdown,
  PricingSettingsSnapshot,
  ProposalServiceLine,
} from '../types';
import { PRICING_STRATEGY_KEYS } from '../types';

export class SqftSettingsV1Strategy implements PricingStrategy {
  readonly key = PRICING_STRATEGY_KEYS.SQFT_SETTINGS_V1;
  readonly name = 'Square Footage (Settings V1)';
  readonly description =
    'Calculates pricing based on square footage with configurable multipliers for floor type, condition, frequency, and building type.';
  readonly version = '1.0.0';

  async quote(context: PricingContext): Promise<PricingBreakdown> {
    const { facilityId, serviceFrequency, taskComplexity = 'standard' } = context;

    // Use the existing pricing calculator
    const pricingResult = await calculateFacilityPricing({
      facilityId,
      serviceFrequency,
      taskComplexity,
    });

    // Get pricing settings for the snapshot
    const pricingSettings = await getActivePricingSettings();
    if (!pricingSettings) {
      throw new Error('No active pricing settings found');
    }

    // Create settings snapshot for audit trail
    const settingsSnapshot: PricingSettingsSnapshot = {
      pricingSettingsId: pricingSettings.id,
      pricingSettingsName: pricingSettings.name,
      baseRatePerSqFt: Number(pricingSettings.baseRatePerSqFt),
      minimumMonthlyCharge: Number(pricingSettings.minimumMonthlyCharge),
      hourlyRate: Number(pricingSettings.hourlyRate),
      floorTypeMultipliers: pricingSettings.floorTypeMultipliers as Record<string, number>,
      frequencyMultipliers: pricingSettings.frequencyMultipliers as Record<string, number>,
      conditionMultipliers: pricingSettings.conditionMultipliers as Record<string, number>,
      trafficMultipliers: pricingSettings.trafficMultipliers as Record<string, number>,
      buildingTypeMultipliers: pricingSettings.buildingTypeMultipliers as Record<string, number>,
      taskComplexityAddOns: pricingSettings.taskComplexityAddOns as Record<string, number>,
      capturedAt: new Date().toISOString(),
    };

    // Extend the pricing result with strategy info
    return {
      ...pricingResult,
      strategyKey: this.key,
      strategyVersion: this.version,
      settingsSnapshot,
    };
  }

  async generateProposalServices(context: PricingContext): Promise<ProposalServiceLine[]> {
    const { facilityId, serviceFrequency } = context;

    // Use the existing service generator
    return generateProposalServicesFromFacility(facilityId, serviceFrequency);
  }

  async compareFrequencies(
    facilityId: string,
    frequencies: string[] = ['1x_week', '2x_week', '3x_week', '5x_week']
  ): Promise<{ frequency: string; monthlyTotal: number }[]> {
    // Use the existing comparison function
    return calculateFacilityPricingComparison(facilityId, frequencies);
  }
}

// Export a singleton instance
export const sqftSettingsV1Strategy = new SqftSettingsV1Strategy();
