import React, { useMemo } from 'react';
import { CalendarHeader } from './CalendarHeader';
import { AppointmentBlock } from './AppointmentBlock';
import { AppointmentGridBlock } from './AppointmentGridBlock';
import { getTimeSlots } from '../../lib/calendar-utils';
import type { Appointment } from '../../types/crm';

type CalendarLayout = 'grid' | 'list';

interface DayCalendarProps {
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

export const DayCalendar: React.FC<DayCalendarProps> = ({
  date,
  appointments,
  onDateChange,
  onEdit,
  onCustomerClick,
  onCreateClick,
  layout = 'grid',
  isLoading = false,
}) => {
  const timeSlots = useMemo(() => getTimeSlots(START_HOUR, END_HOUR, STEP_MINS), []);

  const dayStart = useMemo(() => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
  }, [date]);

  const dayEnd = useMemo(() => {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
  }, [date]);

  const dayAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => {
          const apptStart = new Date(appointment.scheduledStart);
          const apptEnd = new Date(appointment.scheduledEnd);
          return apptStart <= dayEnd && apptEnd >= dayStart;
        })
        .sort(
          (a, b) =>
            new Date(a.scheduledStart).getTime() -
            new Date(b.scheduledStart).getTime()
        ),
    [appointments, dayEnd, dayStart]
  );

  const gridAppointments = useMemo(() => {
    const segments: Array<{
      appointment: Appointment;
      rowStart: number;
      rowEnd: number;
    }> = [];
    const gridStart = START_HOUR * 60;
    const gridEnd = END_HOUR * 60;

    dayAppointments.forEach((appointment) => {
      const apptStart = new Date(appointment.scheduledStart);
      const apptEnd = new Date(appointment.scheduledEnd);

      const segmentStart = apptStart > dayStart ? apptStart : dayStart;
      const segmentEnd = apptEnd < dayEnd ? apptEnd : dayEnd;

      const startMinutes = Math.max(gridStart, toMinutes(segmentStart));
      const endMinutes = Math.min(gridEnd, toMinutes(segmentEnd));

      if (endMinutes <= gridStart || startMinutes >= gridEnd) return;

      let rowStart = Math.floor((startMinutes - gridStart) / STEP_MINS) + 1;
      let rowEnd = Math.ceil((endMinutes - gridStart) / STEP_MINS) + 1;
      if (rowEnd <= rowStart) rowEnd = rowStart + 1;

      segments.push({ appointment, rowStart, rowEnd });
    });

    return segments;
  }, [dayAppointments, dayEnd, dayStart]);

  const handlePrev = () => {
    const prev = new Date(date);
    prev.setDate(prev.getDate() - 1);
    onDateChange(prev);
  };

  const handleNext = () => {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    onDateChange(next);
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const dayLabel = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-surface-200 bg-white shadow-soft dark:border-surface-700 dark:bg-surface-800">
      <CalendarHeader
        label={dayLabel}
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
          <div className="p-4">
            {dayAppointments.length === 0 ? (
              <div className="text-sm text-surface-500 dark:text-surface-400">
                No appointments
              </div>
            ) : (
              <div className="space-y-2">
                {dayAppointments.map((appointment) => (
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
        ) : (
          <div
            className="relative grid"
            style={{
              gridTemplateColumns: '80px 1fr',
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
                <button
                  type="button"
                  onClick={() => {
                    const slotDate = new Date(date);
                    slotDate.setHours(slot.getHours(), slot.getMinutes(), 0, 0);
                    onCreateClick(slotDate);
                  }}
                  className="border-b border-r border-surface-200 transition-colors hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-800/50"
                />
              </React.Fragment>
            ))}

            {gridAppointments.map((segment, index) => (
              <AppointmentGridBlock
                key={`${segment.appointment.id}-${index}`}
                appointment={segment.appointment}
                onEdit={onEdit}
                onCustomerClick={onCustomerClick}
                style={{
                  gridColumn: 2,
                  gridRow: `${segment.rowStart} / ${segment.rowEnd}`,
                }}
                className="m-0.5"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
