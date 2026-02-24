export const WEEKDAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

const BUSINESS_DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
] as const;

type DayKey = (typeof WEEKDAY_KEYS)[number];

export type ServiceWeekday = (typeof WEEKDAY_KEYS)[number];

export interface NormalizedServiceSchedule {
  days: ServiceWeekday[];
  allowedWindowStart: string;
  allowedWindowEnd: string;
  windowAnchor: 'start_day';
  timezoneSource: 'facility';
}

const WEEKDAY_SET = new Set<string>(WEEKDAY_KEYS);
const DAY_ORDER: DayKey[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

const TIME_24H_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const WEEKDAY_ALIASES: Record<string, ServiceWeekday> = {
  monday: 'monday',
  mon: 'monday',
  tuesday: 'tuesday',
  tue: 'tuesday',
  tues: 'tuesday',
  wednesday: 'wednesday',
  wed: 'wednesday',
  thursday: 'thursday',
  thu: 'thursday',
  thur: 'thursday',
  thurs: 'thursday',
  friday: 'friday',
  fri: 'friday',
  saturday: 'saturday',
  sat: 'saturday',
  sunday: 'sunday',
  sun: 'sunday',
};

const INTL_DAY_MAP: Record<string, DayKey> = {
  sunday: 'sunday',
  monday: 'monday',
  tuesday: 'tuesday',
  wednesday: 'wednesday',
  thursday: 'thursday',
  friday: 'friday',
  saturday: 'saturday',
};

function normalizeFrequencyKey(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase();
}

function normalizeHourMinute(value: string): string | null {
  const [hourRaw, minuteRaw] = value.split(':');
  if (hourRaw === undefined || minuteRaw === undefined) return null;
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  const normalized = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return TIME_24H_REGEX.test(normalized) ? normalized : null;
}

function parseLegacyTimeRange(value: unknown): { start?: string; end?: string } {
  if (typeof value !== 'string') return {};
  const match = value.trim().match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
  if (!match) return {};
  const start = normalizeHourMinute(match[1]);
  const end = normalizeHourMinute(match[2]);
  return {
    ...(start ? { start } : {}),
    ...(end ? { end } : {}),
  };
}

function toObject(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  return input as Record<string, unknown>;
}

function parseWeekday(value: unknown): ServiceWeekday | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    const map: Record<number, ServiceWeekday> = {
      0: 'sunday',
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
      6: 'saturday',
      7: 'sunday',
    };
    return map[value] ?? null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (/^[0-7]$/.test(trimmed)) {
      return parseWeekday(Number(trimmed));
    }
    return WEEKDAY_ALIASES[trimmed] ?? null;
  }

  return null;
}

export function expectedWeekdayCountForFrequency(
  frequency: string | null | undefined
): number | null {
  switch (normalizeFrequencyKey(frequency)) {
    case '1x_week':
    case 'weekly':
    case 'biweekly':
    case 'bi_weekly':
    case 'monthly':
    case 'quarterly':
      return 1;
    case '2x_week':
      return 2;
    case '3x_week':
      return 3;
    case '4x_week':
      return 4;
    case '5x_week':
    case 'daily':
      return 5;
    case '7x_week':
      return 7;
    default:
      return null;
  }
}

export function defaultWeekdaysForFrequency(
  frequency: string | null | undefined
): ServiceWeekday[] {
  switch (normalizeFrequencyKey(frequency)) {
    case '1x_week':
    case 'weekly':
    case 'biweekly':
    case 'bi_weekly':
    case 'monthly':
    case 'quarterly':
      return ['monday'];
    case '2x_week':
      return ['monday', 'thursday'];
    case '3x_week':
      return ['monday', 'wednesday', 'friday'];
    case '4x_week':
      return ['monday', 'tuesday', 'thursday', 'friday'];
    case '7x_week':
      return [...WEEKDAY_KEYS];
    case '5x_week':
    case 'daily':
    default:
      return [...BUSINESS_DAY_KEYS];
  }
}

export function mapProposalFrequencyToContractFrequency(
  frequency: string | null | undefined
): string | null {
  const key = normalizeFrequencyKey(frequency);

  switch (key) {
    case '':
      return null;
    case '1x_week':
    case 'weekly':
      return 'weekly';
    case '2x_week':
    case '3x_week':
    case '4x_week':
    case '5x_week':
      return 'custom';
    case '7x_week':
      return 'daily';
    case 'biweekly':
      return 'bi_weekly';
    case 'daily':
      return 'daily';
    case 'monthly':
      return 'monthly';
    case 'quarterly':
      return 'quarterly';
    default:
      return frequency || null;
  }
}

export function parseTimeToMinutes(value: string): number | null {
  if (!TIME_24H_REGEX.test(value)) return null;
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function sortWeekdays(days: ServiceWeekday[]): ServiceWeekday[] {
  const orderMap = new Map<ServiceWeekday, number>(
    WEEKDAY_KEYS.map((day, index) => [day, index])
  );

  return [...days].sort((a, b) => (orderMap.get(a) ?? 0) - (orderMap.get(b) ?? 0));
}

function previousDay(day: DayKey): DayKey {
  const index = DAY_ORDER.indexOf(day);
  if (index < 1) return DAY_ORDER[DAY_ORDER.length - 1];
  return DAY_ORDER[index - 1];
}

export function normalizeServiceSchedule(
  rawSchedule: unknown,
  frequency?: string | null
): NormalizedServiceSchedule | null {
  const raw = toObject(rawSchedule);
  if (!raw && !frequency) return null;

  const sourceDays = Array.isArray(raw?.days)
    ? raw?.days
    : Array.isArray(raw?.daysOfWeek)
      ? raw?.daysOfWeek
      : [];

  const uniqueDays = new Set<ServiceWeekday>();
  for (const dayValue of sourceDays) {
    const parsed = parseWeekday(dayValue);
    if (parsed) uniqueDays.add(parsed);
  }

  const days =
    uniqueDays.size > 0
      ? sortWeekdays(Array.from(uniqueDays))
      : defaultWeekdaysForFrequency(frequency);

  const legacy = parseLegacyTimeRange(raw?.time);

  const startRaw =
    (typeof raw?.allowedWindowStart === 'string' && raw.allowedWindowStart) ||
    (typeof raw?.windowStart === 'string' && raw.windowStart) ||
    (typeof raw?.startTime === 'string' && raw.startTime) ||
    legacy.start;
  const endRaw =
    (typeof raw?.allowedWindowEnd === 'string' && raw.allowedWindowEnd) ||
    (typeof raw?.windowEnd === 'string' && raw.windowEnd) ||
    (typeof raw?.endTime === 'string' && raw.endTime) ||
    legacy.end;

  const allowedWindowStart = startRaw ? normalizeHourMinute(startRaw) : '00:00';
  const allowedWindowEnd = endRaw ? normalizeHourMinute(endRaw) : '23:59';

  if (!allowedWindowStart || !allowedWindowEnd || days.length === 0) {
    return null;
  }

  return {
    days,
    allowedWindowStart,
    allowedWindowEnd,
    windowAnchor: 'start_day',
    timezoneSource: 'facility',
  };
}

export function formatWeekdayLabel(day: ServiceWeekday): string {
  const map: Record<ServiceWeekday, string> = {
    monday: 'Mon',
    tuesday: 'Tue',
    wednesday: 'Wed',
    thursday: 'Thu',
    friday: 'Fri',
    saturday: 'Sat',
    sunday: 'Sun',
  };
  return map[day];
}

export function formatTimeLabel(timeValue: string): string {
  const parsed = parseTimeToMinutes(timeValue);
  if (parsed === null) return timeValue;

  const hour24 = Math.floor(parsed / 60);
  const minute = parsed % 60;
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export function formatWeekdayList(days: ServiceWeekday[]): string {
  if (!days.length) return 'Not configured';
  return days.map(formatWeekdayLabel).join(', ');
}

export function extractFacilityTimezone(address: unknown): string | null {
  const raw = toObject(address);
  if (!raw) return null;

  const candidates = [
    raw.timezone,
    raw.timeZone,
    raw.tz,
    raw.ianaTimezone,
    raw.iana_time_zone,
    raw.time_zone,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string' || !candidate.trim()) continue;
    if (isValidTimezone(candidate)) return candidate.trim();
  }

  return null;
}

function isValidTimezone(value: string): boolean {
  try {
    // Throws RangeError for invalid timezone names.
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function getLocalNowParts(now: Date, timezone: string): {
  day: DayKey;
  localTime: string;
  dateIso: string;
} {
  const dayLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
  }).format(now).toLowerCase();
  const day = INTL_DAY_MAP[dayLabel];
  if (!day) {
    throw new Error(`Unable to resolve weekday for timezone ${timezone}`);
  }

  const timeParts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).formatToParts(now);

  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const hour = timeParts.find((part) => part.type === 'hour')?.value ?? '00';
  const minute = timeParts.find((part) => part.type === 'minute')?.value ?? '00';
  const year = dateParts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = dateParts.find((part) => part.type === 'month')?.value ?? '01';
  const dayOfMonth = dateParts.find((part) => part.type === 'day')?.value ?? '01';

  return {
    day,
    localTime: `${hour}:${minute}`,
    dateIso: `${year}-${month}-${dayOfMonth}`,
  };
}

export interface WindowValidationResult {
  allowed: boolean;
  timezone: string;
  localTime: string;
  localDate: string;
  currentDay: DayKey;
  effectiveDay: DayKey;
  reason?: string;
}

export function validateServiceWindow(
  schedule: NormalizedServiceSchedule,
  timezone: string,
  now = new Date()
): WindowValidationResult {
  const { day: currentDay, localTime, dateIso } = getLocalNowParts(now, timezone);

  const startMinutes = parseTimeToMinutes(schedule.allowedWindowStart);
  const endMinutes = parseTimeToMinutes(schedule.allowedWindowEnd);
  const currentMinutes = parseTimeToMinutes(localTime);

  if (startMinutes === null || endMinutes === null || currentMinutes === null) {
    return {
      allowed: false,
      timezone,
      localTime,
      localDate: dateIso,
      currentDay,
      effectiveDay: currentDay,
      reason: 'Invalid schedule time configuration',
    };
  }

  const overnight = startMinutes > endMinutes;
  const timeAllowed = overnight
    ? currentMinutes >= startMinutes || currentMinutes <= endMinutes
    : currentMinutes >= startMinutes && currentMinutes <= endMinutes;

  const effectiveDay =
    overnight && currentMinutes <= endMinutes
      ? previousDay(currentDay)
      : currentDay;

  if (!timeAllowed) {
    return {
      allowed: false,
      timezone,
      localTime,
      localDate: dateIso,
      currentDay,
      effectiveDay,
      reason: 'Outside allowed service window',
    };
  }

  const dayAllowed =
    WEEKDAY_SET.has(effectiveDay) && schedule.days.includes(effectiveDay as ServiceWeekday);

  if (!dayAllowed) {
    return {
      allowed: false,
      timezone,
      localTime,
      localDate: dateIso,
      currentDay,
      effectiveDay,
      reason: 'Outside allowed service day',
    };
  }

  return {
    allowed: true,
    timezone,
    localTime,
    localDate: dateIso,
    currentDay,
    effectiveDay,
  };
}
