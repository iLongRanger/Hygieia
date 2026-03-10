export function normalizeComparableEmail(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function normalizeComparablePhone(value: string | null | undefined): string {
  if (typeof value !== 'string') return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1);
  }
  return digits;
}

export function normalizeComparableName(value: string | null | undefined): string {
  if (typeof value !== 'string') return '';

  const suffixes = new Set([
    'inc',
    'incorporated',
    'corp',
    'corporation',
    'co',
    'company',
    'llc',
    'l.l.c',
    'ltd',
    'limited',
    'lp',
    'l.p',
    'plc',
    'gmbh',
  ]);

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return '';

  const tokens = normalized
    .split(' ')
    .filter(Boolean)
    .filter((token) => !suffixes.has(token));

  return tokens.join(' ');
}

export function hasNormalizedNameMatch(
  left: string | null | undefined,
  right: string | null | undefined
): boolean {
  const normalizedLeft = normalizeComparableName(left);
  const normalizedRight = normalizeComparableName(right);
  return Boolean(normalizedLeft) && normalizedLeft === normalizedRight;
}

export function hasNormalizedEmailMatch(
  left: string | null | undefined,
  right: string | null | undefined
): boolean {
  const normalizedLeft = normalizeComparableEmail(left);
  const normalizedRight = normalizeComparableEmail(right);
  return Boolean(normalizedLeft) && normalizedLeft === normalizedRight;
}

export function hasNormalizedPhoneMatch(
  left: string | null | undefined,
  right: string | null | undefined
): boolean {
  const normalizedLeft = normalizeComparablePhone(left);
  const normalizedRight = normalizeComparablePhone(right);
  return Boolean(normalizedLeft) && normalizedLeft === normalizedRight;
}
