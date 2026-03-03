import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import type { Address } from '../../../types/facility';

type ServiceScheduleDay =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

type FacilitySchedule = {
  frequency: string;
  days: ServiceScheduleDay[];
  allowedWindowStart: string;
  allowedWindowEnd: string;
};

const SCHEDULE_FREQUENCIES = [
  { value: '1x_week', label: '1x per Week' },
  { value: '2x_week', label: '2x per Week' },
  { value: '3x_week', label: '3x per Week' },
  { value: '4x_week', label: '4x per Week' },
  { value: '5x_week', label: '5x per Week' },
  { value: '7x_week', label: '7x per Week (Daily)' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

const DAY_OPTIONS: { value: ServiceScheduleDay; label: string }[] = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
];

function getDefaultDaysForFrequency(frequency: string): ServiceScheduleDay[] {
  switch (frequency) {
    case '1x_week':
    case 'weekly':
    case 'biweekly':
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
      return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    case '5x_week':
    default:
      return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  }
}

function readSchedule(address?: Address): FacilitySchedule {
  const schedule =
    (address?.serviceSchedule as Partial<FacilitySchedule> | undefined) ||
    (address?.clientServiceSchedule as Partial<FacilitySchedule> | undefined) ||
    {};
  const frequency = schedule.frequency || '5x_week';
  const days = Array.isArray(schedule.days)
    ? (schedule.days as ServiceScheduleDay[])
    : getDefaultDaysForFrequency(frequency);
  return {
    frequency,
    days,
    allowedWindowStart: schedule.allowedWindowStart || '18:00',
    allowedWindowEnd: schedule.allowedWindowEnd || '06:00',
  };
}

interface FacilityServiceScheduleFieldsProps {
  address?: Address;
  onChange: (nextAddress: Address) => void;
}

export function FacilityServiceScheduleFields({
  address,
  onChange,
}: FacilityServiceScheduleFieldsProps): React.JSX.Element {
  const schedule = readSchedule(address);

  const updateSchedule = (patch: Partial<FacilitySchedule>) => {
    const nextSchedule = { ...schedule, ...patch };
    onChange({
      ...(address || {}),
      serviceSchedule: nextSchedule,
      serviceFrequency: nextSchedule.frequency,
      serviceDays: nextSchedule.days,
      allowedWindowStart: nextSchedule.allowedWindowStart,
      allowedWindowEnd: nextSchedule.allowedWindowEnd,
    });
  };

  const toggleDay = (day: ServiceScheduleDay) => {
    const exists = schedule.days.includes(day);
    const nextDays = exists
      ? schedule.days.filter((d) => d !== day)
      : [...schedule.days, day];
    updateSchedule({ days: nextDays });
  };

  return (
    <div className="rounded-lg border border-white/10 bg-navy-darker/20 p-4 space-y-3">
      <div className="text-sm font-medium text-white">Client Service Schedule</div>
      <Select
        label="Service Frequency"
        options={SCHEDULE_FREQUENCIES}
        value={schedule.frequency}
        onChange={(value) =>
          updateSchedule({
            frequency: value,
            days: getDefaultDaysForFrequency(value),
          })
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Window Start"
          type="time"
          value={schedule.allowedWindowStart}
          onChange={(e) => updateSchedule({ allowedWindowStart: e.target.value || '00:00' })}
        />
        <Input
          label="Window End"
          type="time"
          value={schedule.allowedWindowEnd}
          onChange={(e) => updateSchedule({ allowedWindowEnd: e.target.value || '23:59' })}
        />
      </div>
      <div>
        <div className="mb-2 text-sm text-gray-300">Service Days</div>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {DAY_OPTIONS.map((day) => {
            const checked = schedule.days.includes(day.value);
            return (
              <label
                key={day.value}
                className={`inline-flex items-center justify-center rounded-md border px-2 py-1 text-xs cursor-pointer ${
                  checked
                    ? 'border-emerald bg-emerald/10 text-white'
                    : 'border-white/10 text-gray-400'
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() => toggleDay(day.value)}
                />
                {day.label}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
