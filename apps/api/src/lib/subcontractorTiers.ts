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
