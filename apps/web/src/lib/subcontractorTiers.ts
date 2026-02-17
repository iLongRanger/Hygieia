export const SUBCONTRACTOR_TIER_MAP: Record<string, number> = {
  labor_only: 0.40,
  standard: 0.50,
  premium: 0.60,
  independent: 0.70,
};

export const SUBCONTRACTOR_TIER_OPTIONS = [
  { value: 'labor_only', label: 'Labor Only (40%)', description: 'Sub provides labor only; company supplies all equipment, chemicals, and consumables' },
  { value: 'standard', label: 'Standard (50%)', description: 'Sub uses company-provided supplies and equipment' },
  { value: 'premium', label: 'Premium (60%)', description: 'Sub provides some of their own supplies and small equipment' },
  { value: 'independent', label: 'Independent (70%)', description: 'Sub provides own equipment, supplies, and vehicles' },
];

export function tierToPercentage(tier: string | null | undefined): number {
  if (tier && tier in SUBCONTRACTOR_TIER_MAP) {
    return SUBCONTRACTOR_TIER_MAP[tier];
  }
  return 0.60;
}
