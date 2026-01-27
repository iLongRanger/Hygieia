/**
 * Pricing Module
 *
 * Exports all pricing-related functionality including:
 * - Strategy types and interfaces
 * - Strategy registry and resolution
 * - Individual strategy implementations
 */

// Types and interfaces
export * from './types';

// Strategy registry and resolution
export {
  pricingStrategyRegistry,
  resolvePricingStrategyKey,
  getStrategy,
  calculatePricing,
  generateProposalServices,
  comparePricingFrequencies,
  PRICING_STRATEGY_KEYS,
  DEFAULT_PRICING_STRATEGY_KEY,
} from './strategyRegistry';

// Individual strategies (for direct access if needed)
export { sqftSettingsV1Strategy } from './strategies/sqftSettingsV1Strategy';
export { perHourV1Strategy } from './strategies/perHourV1Strategy';
