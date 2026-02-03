import React, { useMemo } from 'react';
import { CalendarHeader } from './CalendarHeader';
import { AppointmentBlock } from './AppointmentBlock';
import { AppointmentGridBlock } from './AppointmentGridBlock';
import {
  formatWeekRangeLabel,
  getTimeSlots,
  getWeekDays,
  isToday,
} from '../../lib/calendar-utils';
import type { Appointment } from '../../types/crm';

type CalendarLayout = 'grid' | 'list';

interface WeekCalendarProps {
  date: Date;
  appointments: Appointment[];
  onDateChange: (date: Date) => void;
  onEdit: (appointment: Appointment) => void;
  onCustomerClick: (appointment: Appointment) => void;
  onCreateClick: (date: Date) => void;
  layout?: CalendarLayout;
  isLoading?: boolean;
}

const START_HOUR = 6;
const END_HOUR = 20;
const STEP_MINS = 30;

const toMinutes = (date: Date) => date.getHours() * 60 + date.getMinutes();

export const WeekCalendar: React.FC<WeekCalendarProps> = ({
  date,
  appointments,
  onDateChange,
  onEdit,
  onCustomerClick,
  onCreateClick,
  layout = 'grid',
  isLoading = false,
}) => {
  const weekDays = useMemo(() => getWeekDays(date), [date]);
  const timeSlots = useMemo(() => getTimeSlots(START_HOUR, END_HOUR, STEP_MINS), []);

  const gridAppointments = useMemo(() => {
    const segments: Array<{
      appointment: Appointment;
      dayIndex: number;
      rowStart: number;
      rowEnd: number;
    }> = [];
    const gridStart = START_HOUR * 60;
    const gridEnd = END_HOUR * 60;

    weekDays.forEach((day, dayIndex) => {
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);

      appointments.forEach((appointment) => {
        const apptStart = new Date(appointment.scheduledStart);
        const apptEnd = new Date(appointment.scheduledEnd);

        if (apptStart > dayEnd || apptEnd < dayStart) return;

        const segmentStart = apptStart > dayStart ? apptStart : dayStart;
        const segmentEnd = apptEnd < dayEnd ? apptEnd : dayEnd;

        const startMinutes = Math.max(gridStart, toMinutes(segmentStart));
        const endMinutes = Math.min(gridEnd, toMinutes(segmentEnd));

        if (endMinutes <= gridStart || startMinutes >= gridEnd) return;

        let rowStart = Math.floor((startMinutes - gridStart) / STEP_MINS) + 1;
        let rowEnd = Math.ceil((endMinutes - gridStart) / STEP_MINS) + 1;
        if (rowEnd <= rowStart) rowEnd = rowStart + 1;

        segments.push({ appointment, dayIndex, rowStart, rowEnd });
      });
    });

    return segments;
  }, [appointments, weekDays]);

  const listGroups = useMemo(
    () =>
      weekDays.map((day) => {
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);

        const items = appointments
          .filter((appointment) => {
            const apptStart = new Date(appointment.scheduledStart);
            const apptEnd = new Date(appointment.scheduledEnd);
            return apptStart <= dayEnd && apptEnd >= dayStart;
          })
          .sort(
            (a, b) =>
              new Date(a.scheduledStart).getTime() -
              new Date(b.scheduledStart).getTime()
          );

        return { day, items };
      }),
    [appointments, weekDays]
  );

  const handlePrev = () => {
    const prev = new Date(date);
    prev.setDate(prev.getDate() - 7);
    onDateChange(prev);
  };

  const handleNext = () => {
    const next = new Date(date);
    next.setDate(next.getDate() + 7);
    onDateChange(next);
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-surface-200 bg-white shadow-soft dark:border-surface-700 dark:bg-surface-800">
      <CalendarHeader
        label={formatWeekRangeLabel(date)}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
      />

      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-surface-800/50">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          </div>
        )}

        {layout === 'list' ? (
          <div className="divide-y divide-surface-200 dark:divide-surface-700">
            {listGroups.map(({ day, items }) => (
              <div key={day.toISOString()} className="p-4">
                <div className="mb-3 text-sm font-semibold text-surface-800 dark:text-surface-100">
                  {day.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                {items.length === 0 ? (
                  <div className="text-sm text-surface-500 dark:text-surface-400">
                    No appointments
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((appointment) => (
                      <AppointmentBlock
                        key={appointment.id}
                        appointment={appointment}
                        onEdit={onEdit}
                        onCustomerClick={onCustomerClick}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col">
            <div
              className="grid border-b border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-800/50"
              style={{ gridTemplateColumns: `80px repeat(${weekDays.length}, 1fr)` }}
            >
              <div className="border-r border-surface-200 px-2 py-2 text-xs font-medium uppercase tracking-wide text-surface-400 dark:border-surface-700" />
              {weekDays.map((day) => {
                const isTodayDate = isToday(day);
                return (
                  <div
                    key={day.toISOString()}
                    className="border-r border-surface-200 px-2 py-2 text-center text-xs font-medium uppercase tracking-wide text-surface-600 last:border-r-0 dark:border-surface-700 dark:text-surface-300"
                  >
                    <div className="text-[11px]">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div
                      className={isTodayDate ? 'text-primary-600 dark:text-primary-400' : ''}
                    >
                      {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              className="relative grid"
              style={{
                gridTemplateColumns: `80px repeat(${weekDays.length}, 1fr)`,
                gridTemplateRows: `repeat(${timeSlots.length}, 40px)`,
              }}
            >
              {timeSlots.map((slot, slotIndex) => (
                <React.Fragment key={slotIndex}>
                  <div className="border-b border-r border-surface-200 px-2 text-[11px] text-surface-500 dark:border-surface-700 dark:text-surface-400">
                    {slot.getMinutes() === 0
                      ? slot.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' })
                      : ''}
                  </div>
                  {weekDays.map((day) => {
                    const slotDate = new Date(day);
                    slotDate.setHours(slot.getHours(), slot.getMinutes(), 0, 0);
                    return (
                      <button
                        key={`${day.toISOString()}-${slotIndex}`}
                        type="button"
                        onClick={() => onCreateClick(slotDate)}
                        className="border-b border-r border-surface-200 transition-colors hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-800/50"
                      />
                    );
                  })}
                </React.Fragment>
              ))}

              {gridAppointments.map((segment, index) => (
                <AppointmentGridBlock
                  key={`${segment.appointment.id}-${segment.dayIndex}-${index}`}
                  appointment={segment.appointment}
                  onEdit={onEdit}
                  onCustomerClick={onCustomerClick}
                  style={{
                    gridColumn: segment.dayIndex + 2,
                    gridRow: `${segment.rowStart} / ${segment.rowEnd}`,
                  }}
                  className="m-0.5"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
