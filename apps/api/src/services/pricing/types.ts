/**
 * Pricing Strategy Types
 *
 * Defines the interfaces and types for the pricing strategy system.
 * Strategies are pluggable pricing algorithms that can be selected
 * per facility, account, or proposal.
 */

import type {
  AreaPricingBreakdown as BaseAreaPricingBreakdown,
  FacilityPricingResult,
} from '../pricingCalculatorService';

/**
 * Context provided to pricing strategies for calculation
 */
export interface PricingContext {
  facilityId: string;
  serviceFrequency: string;
  taskComplexity?: string;
  // Optional overrides for specific calculations
  pricingSettingsId?: string;
}

/**
 * Re-export AreaPricingBreakdown from the pricing calculator
 */
export type AreaPricingBreakdown = BaseAreaPricingBreakdown;

/**
 * Snapshot of pricing settings at time of calculation
 * Used for proposal pricing lock and audit trail
 */
export interface PricingSettingsSnapshot {
  pricingSettingsId: string;
  pricingSettingsName: string;
  baseRatePerSqFt: number;
  minimumMonthlyCharge: number;
  floorTypeMultipliers: Record<string, number>;
  frequencyMultipliers: Record<string, number>;
  conditionMultipliers: Record<string, number>;
  buildingTypeMultipliers: Record<string, number>;
  taskComplexityAddOns: Record<string, number>;
  capturedAt: string; // ISO timestamp
}

/**
 * Complete pricing result returned by a strategy
 * Extends FacilityPricingResult with strategy metadata and settings snapshot
 */
export interface PricingBreakdown extends FacilityPricingResult {
  // Strategy metadata
  strategyKey: string;
  strategyVersion: string;
  // Snapshot of settings used (for audit/reproducibility)
  settingsSnapshot: PricingSettingsSnapshot;
}

/**
 * Proposal service line item generated from pricing
 */
export interface ProposalServiceLine {
  serviceName: string;
  serviceType: string;
  frequency: string;
  monthlyPrice: number;
  description: string;
  includedTasks: string[];
}

/**
 * Interface that all pricing strategies must implement
 */
export interface PricingStrategy {
  /**
   * Unique key identifying this strategy (e.g., 'sqft_settings_v1')
   */
  readonly key: string;

  /**
   * Human-readable name for the strategy
   */
  readonly name: string;

  /**
   * Brief description of how this strategy calculates pricing
   */
  readonly description: string;

  /**
   * Current version of this strategy implementation
   */
  readonly version: string;

  /**
   * Calculate pricing for a facility
   * @param context - The pricing context with facility and service details
   * @returns A complete pricing breakdown
   */
  quote(context: PricingContext): Promise<PricingBreakdown>;

  /**
   * Generate proposal service lines from pricing
   * @param context - The pricing context with facility and service details
   * @returns Array of service line items for the proposal
   */
  generateProposalServices(context: PricingContext): Promise<ProposalServiceLine[]>;

  /**
   * Compare pricing across multiple frequencies
   * @param facilityId - The facility to price
   * @param frequencies - Array of frequency keys to compare
   * @returns Array of frequency/price pairs
   */
  compareFrequencies(
    facilityId: string,
    frequencies?: string[]
  ): Promise<{ frequency: string; monthlyTotal: number }[]>;
}

/**
 * Strategy metadata for registration and UI display
 */
export interface PricingStrategyMetadata {
  key: string;
  name: string;
  description: string;
  version: string;
  isDefault?: boolean;
  isActive?: boolean;
}

/**
 * Available pricing strategy keys
 */
export const PRICING_STRATEGY_KEYS = {
  SQFT_SETTINGS_V1: 'sqft_settings_v1',
} as const;

export type PricingStrategyKey = (typeof PRICING_STRATEGY_KEYS)[keyof typeof PRICING_STRATEGY_KEYS];

/**
 * Default pricing strategy key
 */
export const DEFAULT_PRICING_STRATEGY_KEY = PRICING_STRATEGY_KEYS.SQFT_SETTINGS_V1;
