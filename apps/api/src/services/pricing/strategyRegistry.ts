/**
 * Pricing Strategy Registry
 *
 * Central registry for all pricing strategies. Provides methods to:
 * - Register and retrieve strategies
 * - Get the appropriate strategy for a facility/account/proposal
 * - List available strategies for UI selection (including database pricing rules)
 */

import { prisma } from '../../lib/prisma';
import type {
  PricingStrategy,
  PricingStrategyMetadata,
  PricingContext,
  PricingBreakdown,
  ProposalServiceLine,
} from './types';
import { DEFAULT_PRICING_STRATEGY_KEY, PRICING_STRATEGY_KEYS } from './types';
import { sqftSettingsV1Strategy } from './strategies/sqftSettingsV1Strategy';

/**
 * Registry that holds all available pricing strategies
 */
class PricingStrategyRegistry {
  private strategies: Map<string, PricingStrategy> = new Map();

  constructor() {
    // Register built-in strategies
    this.register(sqftSettingsV1Strategy);
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
   * For pricing rule keys (rule:*), returns the default strategy
   */
  getOrThrow(key: string): PricingStrategy {
    // If it's a pricing rule reference, use the default sqft strategy
    // The rule ID will be used for configuration, but calculation uses sqft strategy
    if (key.startsWith('rule:')) {
      return this.strategies.get(DEFAULT_PRICING_STRATEGY_KEY)!;
    }

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
    return this.strategies.has(key) || key.startsWith('rule:');
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
   * List all strategies including pricing rules from database
   */
  async listAllAsync(): Promise<PricingStrategyMetadata[]> {
    // Get built-in strategies
    const builtIn = this.listBuiltIn();

    // Get pricing rules from database
    const pricingRules = await prisma.pricingRule.findMany({
      where: {
        isActive: true,
        archivedAt: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        pricingType: true,
        baseRate: true,
        cleaningType: true,
      },
      orderBy: { name: 'asc' },
    });

    // Convert pricing rules to strategy metadata
    const ruleStrategies: PricingStrategyMetadata[] = pricingRules.map((rule) => ({
      key: `rule:${rule.id}`,
      name: rule.name,
      description: rule.description || `${rule.pricingType} pricing - Base rate: $${rule.baseRate}`,
      version: '1.0.0',
      isDefault: false,
      isActive: true,
      // Extra metadata for rules
      pricingType: rule.pricingType,
      cleaningType: rule.cleaningType,
    }));

    return [...builtIn, ...ruleStrategies];
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

/**
 * Determine the pricing strategy key for a given context
 * Priority: Proposal > Facility > Account > Default
 */
export async function resolvePricingStrategyKey(options: {
  proposalId?: string;
  facilityId?: string;
  accountId?: string;
}): Promise<string> {
  const { proposalId, facilityId, accountId } = options;

  // 1. Check proposal-specific strategy
  if (proposalId) {
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        pricingStrategyKey: true,
        facilityId: true,
        accountId: true,
      },
    });

    if (proposal?.pricingStrategyKey) {
      return proposal.pricingStrategyKey;
    }

    // Fall through to facility/account from proposal
    if (proposal?.facilityId && !facilityId) {
      return resolvePricingStrategyKey({
        facilityId: proposal.facilityId,
        accountId: proposal.accountId,
      });
    }
    if (proposal?.accountId && !accountId) {
      return resolvePricingStrategyKey({ accountId: proposal.accountId });
    }
  }

  // 2. Check facility-specific strategy
  if (facilityId) {
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
      select: {
        defaultPricingStrategyKey: true,
        accountId: true,
      },
    });

    if (facility?.defaultPricingStrategyKey) {
      return facility.defaultPricingStrategyKey;
    }

    // Fall through to account
    if (facility?.accountId && !accountId) {
      return resolvePricingStrategyKey({ accountId: facility.accountId });
    }
  }

  // 3. Check account-specific strategy
  if (accountId) {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { defaultPricingStrategyKey: true },
    });

    if (account?.defaultPricingStrategyKey) {
      return account.defaultPricingStrategyKey;
    }
  }

  // 4. Return default
  return DEFAULT_PRICING_STRATEGY_KEY;
}

/**
 * Get the pricing strategy instance for a given context
 */
export async function getStrategy(options: {
  strategyKey?: string;
  proposalId?: string;
  facilityId?: string;
  accountId?: string;
}): Promise<PricingStrategy> {
  const { strategyKey, ...resolveOptions } = options;

  // Use explicit key if provided
  if (strategyKey) {
    return pricingStrategyRegistry.getOrThrow(strategyKey);
  }

  // Otherwise resolve from context
  const resolvedKey = await resolvePricingStrategyKey(resolveOptions);
  return pricingStrategyRegistry.getOrThrow(resolvedKey);
}

/**
 * Convenience function to calculate pricing using the appropriate strategy
 */
export async function calculatePricing(
  context: PricingContext,
  options?: {
    strategyKey?: string;
    proposalId?: string;
  }
): Promise<PricingBreakdown> {
  const strategy = await getStrategy({
    strategyKey: options?.strategyKey,
    proposalId: options?.proposalId,
    facilityId: context.facilityId,
  });

  return strategy.quote(context);
}

/**
 * Convenience function to generate proposal services using the appropriate strategy
 */
export async function generateProposalServices(
  context: PricingContext,
  options?: {
    strategyKey?: string;
    proposalId?: string;
  }
): Promise<ProposalServiceLine[]> {
  const strategy = await getStrategy({
    strategyKey: options?.strategyKey,
    proposalId: options?.proposalId,
    facilityId: context.facilityId,
  });

  return strategy.generateProposalServices(context);
}

/**
 * Convenience function to compare frequencies using the appropriate strategy
 */
export async function comparePricingFrequencies(
  facilityId: string,
  frequencies?: string[],
  options?: {
    strategyKey?: string;
  }
): Promise<{ frequency: string; monthlyTotal: number }[]> {
  const strategy = await getStrategy({
    strategyKey: options?.strategyKey,
    facilityId,
  });

  return strategy.compareFrequencies(facilityId, frequencies);
}

// Re-export types and constants
export { PRICING_STRATEGY_KEYS, DEFAULT_PRICING_STRATEGY_KEY };
export type { PricingStrategy, PricingStrategyMetadata };
