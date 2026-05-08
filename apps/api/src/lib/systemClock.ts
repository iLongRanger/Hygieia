const SYSTEM_TIME_OVERRIDE_KEYS = [
  'SYSTEM_TIME_OVERRIDE',
  'SYSTEM_NOW_OVERRIDE',
];

function getRawSystemTimeOverride(): string | null {
  if (process.env.NODE_ENV === 'production') return null;

  for (const key of SYSTEM_TIME_OVERRIDE_KEYS) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }

  return null;
}

export function getSystemNow(): Date {
  const override = getRawSystemTimeOverride();
  if (!override) return new Date();

  const parsed = new Date(override);
  if (Number.isNaN(parsed.getTime())) return new Date();

  return parsed;
}

export function isSystemTimeOverrideActive(): boolean {
  return getRawSystemTimeOverride() !== null;
}
