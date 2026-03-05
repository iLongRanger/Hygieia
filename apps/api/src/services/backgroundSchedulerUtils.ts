const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_TIME_OF_DAY_MS = DAY_MS - 60_000;

export function sanitizeTimeOfDayMs(raw: number, fallback: number): number {
  if (!Number.isFinite(raw)) return fallback;
  const clamped = Math.floor(raw);
  if (clamped < 0 || clamped > MAX_TIME_OF_DAY_MS) {
    return fallback;
  }
  return clamped;
}

function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function sanitizeTimezone(raw: string | null | undefined, fallback = 'UTC'): string {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (!trimmed) return fallback;
  return isValidTimezone(trimmed) ? trimmed : fallback;
}

function getLocalDateParts(now: Date, timeZone: string): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = Number(parts.find((part) => part.type === 'year')?.value ?? '1970');
  const month = Number(parts.find((part) => part.type === 'month')?.value ?? '1');
  const day = Number(parts.find((part) => part.type === 'day')?.value ?? '1');
  return { year, month, day };
}

function addDays(year: number, month: number, day: number, days: number): {
  year: number;
  month: number;
  day: number;
} {
  const base = new Date(Date.UTC(year, month - 1, day + days));
  return {
    year: base.getUTCFullYear(),
    month: base.getUTCMonth() + 1,
    day: base.getUTCDate(),
  };
}

function findUtcInstantForLocalMinute(
  timeZone: string,
  targetYear: number,
  targetMonth: number,
  targetDay: number,
  targetHour: number,
  targetMinute: number
): Date | null {
  const baseGuess = Date.UTC(targetYear, targetMonth - 1, targetDay, targetHour, targetMinute);
  const start = baseGuess - 36 * 60 * 60 * 1000;
  const end = baseGuess + 36 * 60 * 60 * 1000;

  for (let ts = start; ts <= end; ts += 60_000) {
    const candidate = new Date(ts);
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      hourCycle: 'h23',
    }).formatToParts(candidate);

    const year = Number(parts.find((part) => part.type === 'year')?.value ?? '1970');
    const month = Number(parts.find((part) => part.type === 'month')?.value ?? '1');
    const day = Number(parts.find((part) => part.type === 'day')?.value ?? '1');
    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
    const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0');

    if (
      year === targetYear &&
      month === targetMonth &&
      day === targetDay &&
      hour === targetHour &&
      minute === targetMinute
    ) {
      return candidate;
    }
  }

  return null;
}

export function getNextRunAt(
  timeOfDayMs: number,
  timeZone: string,
  now = new Date()
): Date {
  const safeTimezone = sanitizeTimezone(timeZone);
  const totalMinutes = Math.floor(timeOfDayMs / 60_000);
  const targetHour = Math.floor(totalMinutes / 60);
  const targetMinute = totalMinutes % 60;
  const localToday = getLocalDateParts(now, safeTimezone);

  for (let dayOffset = 0; dayOffset <= 2; dayOffset += 1) {
    const nextLocalDate = addDays(localToday.year, localToday.month, localToday.day, dayOffset);
    const candidate = findUtcInstantForLocalMinute(
      safeTimezone,
      nextLocalDate.year,
      nextLocalDate.month,
      nextLocalDate.day,
      targetHour,
      targetMinute
    );
    if (!candidate) continue;
    if (candidate.getTime() > now.getTime()) {
      return candidate;
    }
  }

  return new Date(now.getTime() + DAY_MS);
}

export function getDelayUntilNextRunMs(
  timeOfDayMs: number,
  timeZone: string,
  now = new Date()
): number {
  return Math.max(0, getNextRunAt(timeOfDayMs, timeZone, now).getTime() - now.getTime());
}

export function formatTimeOfDay(timeOfDayMs: number, timeZone: string): string {
  const safeTimezone = sanitizeTimezone(timeZone);
  const totalMinutes = Math.floor(timeOfDayMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${safeTimezone}`;
}
