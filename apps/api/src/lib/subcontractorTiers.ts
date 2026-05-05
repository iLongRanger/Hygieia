export const SUBCONTRACTOR_TIER_MAP: Record<string, number> = {
  labor_only: 0.40,
  standard: 0.50,
  premium: 0.60,
  independent: 0.70,
};

export const SUBCONTRACTOR_TIER_KEYS = Object.keys(SUBCONTRACTOR_TIER_MAP);

export function tierToPercentage(tier: string | null | undefined): number {
  if (tier && tier in SUBCONTRACTOR_TIER_MAP) {
    return SUBCONTRACTOR_TIER_MAP[tier];
  }
  return 0.60;
}

export function normalizeSubcontractorPercentage(
  value: number | null | undefined,
  fallbackTier?: string | null
): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const normalized = value > 1 ? value / 100 : value;
    return Math.min(1, Math.max(0, Math.round(normalized * 10000) / 10000));
  }

  return tierToPercentage(fallbackTier);
}

export function percentageToTier(pct: number): string {
  const entries = Object.entries(SUBCONTRACTOR_TIER_MAP);
  let closest = 'premium';
  let minDiff = Infinity;
  for (const [key, value] of entries) {
    const diff = Math.abs(value - pct);
    if (diff < minDiff) {
      minDiff = diff;
      closest = key;
    }
  }
  return closest;
}
