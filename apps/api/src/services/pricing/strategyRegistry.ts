/**
 * Pricing Strategy Registry
 *
 * Central registry for all pricing strategies. Provides methods to:
 * - Register and retrieve strategies
 * - Get the appropriate strategy for a facility/account/proposal
 * - List available strategies for internal selection
 */

import type {
  PricingStrategy,
  PricingStrategyMetadata,
  PricingContext,
  PricingBreakdown,
  ProposalServiceLine,
} from './types';
import { DEFAULT_PRICING_STRATEGY_KEY, PRICING_STRATEGY_KEYS } from './types';
import { sqftSettingsV1Strategy } from './strategies/sqftSettingsV1Strategy';
import { perHourV1Strategy } from './strategies/perHourV1Strategy';
import { getDefaultPricingSettings, getPricingSettingsById } from '../pricingSettingsService';
import { prisma } from '../../lib/prisma';

/**
 * Registry that holds all available pricing strategies
 */
class PricingStrategyRegistry {
  private strategies: Map<string, PricingStrategy> = new Map();

  constructor() {
    // Register built-in strategies
    this.register(sqftSettingsV1Strategy);
    this.register(perHourV1Strategy);
  }

  /**
   * Register a pricing strategy
   */
  register(strategy: PricingStrategy): void {
    if (this.strategies.has(strategy.key)) {
      console.warn(`Strategy ${strategy.key} is already registered. Overwriting.`);
    }
    this.strategies.set(strategy.key, strategy);
  }

  /**
   * Get a strategy by key
   */
  get(key: string): PricingStrategy | undefined {
    return this.strategies.get(key);
  }

  /**
   * Get a strategy by key, throwing if not found
   */
  getOrThrow(key: string): PricingStrategy {
    const strategy = this.strategies.get(key);
    if (!strategy) {
      // Fall back to default if strategy not found
      console.warn(`Pricing strategy '${key}' not found, falling back to default`);
      return this.strategies.get(DEFAULT_PRICING_STRATEGY_KEY)!;
    }
    return strategy;
  }

  /**
   * Check if a strategy exists
   */
  has(key: string): boolean {
    return this.strategies.has(key);
  }

  /**
   * List all registered strategy keys
   */
  listKeys(): string[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * List all strategies with metadata (built-in only, synchronous)
   */
  listBuiltIn(): PricingStrategyMetadata[] {
    return Array.from(this.strategies.values()).map((strategy) => ({
      key: strategy.key,
      name: strategy.name,
      description: strategy.description,
      version: strategy.version,
      isDefault: strategy.key === DEFAULT_PRICING_STRATEGY_KEY,
      isActive: true,
    }));
  }

  /**
   * List all strategies with metadata including database pricing rules
   */
  listAll(): PricingStrategyMetadata[] {
    // Return built-in strategies synchronously
    // Database rules are fetched separately via listAllAsync
    return this.listBuiltIn();
  }

  /**
   * List all strategies (built-in only)
   */
  async listAllAsync(): Promise<PricingStrategyMetadata[]> {
    return this.listBuiltIn();
  }

  /**
   * Get the default strategy
   */
  getDefault(): PricingStrategy {
    return this.getOrThrow(DEFAULT_PRICING_STRATEGY_KEY);
  }
}

// Singleton registry instance
export const pricingStrategyRegistry = new PricingStrategyRegistry();

type PricingPlanRecord = Awaited<ReturnType<typeof getPricingSettingsById>>;

/**
 * Determine the pricing plan id for a given context
 * Priority: Proposal > Facility > Account > Default
 */
export async function resolvePricingPlanId(options: {
  proposalId?: string;
  facilityId?: string;
  accountId?: string;
}): Promise<string | null> {
  const { proposalId, facilityId, accountId } = options;

  // 1. Check proposal-specific plan
  if (proposalId) {
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        pricingPlanId: true,
        facilityId: true,
        accountId: true,
      },
    });

    if (proposal?.pricingPlanId) {
      return proposal.pricingPlanId;
    }

    if (proposal?.facilityId && !facilityId) {
      return resolvePricingPlanId({
        facilityId: proposal.facilityId,
        accountId: proposal.accountId,
      });
    }
    if (proposal?.accountId && !accountId) {
      return resolvePricingPlanId({ accountId: proposal.accountId });
    }
  }

  // 2. Check facility-specific plan
  if (facilityId) {
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
      select: {
        defaultPricingPlanId: true,
        accountId: true,
      },
    });

    if (facility?.defaultPricingPlanId) {
      return facility.defaultPricingPlanId;
    }

    if (facility?.accountId && !accountId) {
      return resolvePricingPlanId({ accountId: facility.accountId });
    }
  }

  // 3. Check account-specific plan
  if (accountId) {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { defaultPricingPlanId: true },
    });

    if (account?.defaultPricingPlanId) {
      return account.defaultPricingPlanId;
    }
  }

  return null;
}

/**
 * Resolve the pricing plan record for a given context
 */
export async function resolvePricingPlan(options: {
  pricingPlanId?: string;
  proposalId?: string;
  facilityId?: string;
  accountId?: string;
}): Promise<PricingPlanRecord | null> {
  if (options.pricingPlanId) {
    const plan = await getPricingSettingsById(options.pricingPlanId);
    if (!plan) {
      throw new Error('Pricing plan not found');
    }
    return plan;
  }

  const resolvedPlanId = await resolvePricingPlanId({
    proposalId: options.proposalId,
    facilityId: options.facilityId,
    accountId: options.accountId,
  });

  if (resolvedPlanId) {
    const plan = await getPricingSettingsById(resolvedPlanId);
    if (plan) {
      return plan;
    }
  }

  return getDefaultPricingSettings();
}

/**
 * Get the strategy for a pricing plan type
 */
export function getStrategyForPricingType(pricingType?: string): PricingStrategy {
  if (pricingType === 'hourly') {
    return pricingStrategyRegistry.getOrThrow(PRICING_STRATEGY_KEYS.PER_HOUR_V1);
  }
  return pricingStrategyRegistry.getOrThrow(DEFAULT_PRICING_STRATEGY_KEY);
}

/**
 * Convenience function to calculate pricing using the appropriate plan + strategy
 */
export async function calculatePricing(
  context: PricingContext,
  options?: {
    pricingPlanId?: string;
    proposalId?: string;
    accountId?: string;
  }
): Promise<PricingBreakdown> {
  const pricingPlan = await resolvePricingPlan({
    pricingPlanId: options?.pricingPlanId ?? context.pricingPlanId,
    proposalId: options?.proposalId,
    facilityId: context.facilityId,
    accountId: options?.accountId,
  });

  if (!pricingPlan) {
    throw new Error('No pricing plan found');
  }

  const strategy = getStrategyForPricingType(pricingPlan.pricingType);
  return strategy.quote({ ...context, pricingPlanId: pricingPlan.id });
}

/**
 * Convenience function to generate proposal services using the appropriate plan + strategy
 */
export async function generateProposalServices(
  context: PricingContext,
  options?: {
    pricingPlanId?: string;
    proposalId?: string;
    accountId?: string;
  }
): Promise<ProposalServiceLine[]> {
  const pricingPlan = await resolvePricingPlan({
    pricingPlanId: options?.pricingPlanId ?? context.pricingPlanId,
    proposalId: options?.proposalId,
    facilityId: context.facilityId,
    accountId: options?.accountId,
  });

  if (!pricingPlan) {
    throw new Error('No pricing plan found');
  }

  const strategy = getStrategyForPricingType(pricingPlan.pricingType);
  return strategy.generateProposalServices({ ...context, pricingPlanId: pricingPlan.id });
}

// Re-export types and constants
export { PRICING_STRATEGY_KEYS, DEFAULT_PRICING_STRATEGY_KEY };
export type { PricingStrategy, PricingStrategyMetadata };
