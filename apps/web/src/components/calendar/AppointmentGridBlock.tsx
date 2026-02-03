import React from 'react';
import { cn } from '../../lib/utils';
import { APPOINTMENT_TYPE_COLORS, formatTime } from '../../lib/calendar-utils';
import type { Appointment } from '../../types/crm';

interface AppointmentGridBlockProps {
  appointment: Appointment;
  onEdit: (appointment: Appointment) => void;
  onCustomerClick: (appointment: Appointment) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const AppointmentGridBlock: React.FC<AppointmentGridBlockProps> = ({
  appointment,
  onEdit,
  onCustomerClick,
  className,
  style,
}) => {
  const colors = APPOINTMENT_TYPE_COLORS[appointment.type];
  const startTime = formatTime(new Date(appointment.scheduledStart));

  const customerName =
    appointment.lead?.companyName ||
    appointment.lead?.contactName ||
    appointment.account?.name ||
    'Unknown';

  const handleBlockClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(appointment);
  };

  const handleCustomerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCustomerClick(appointment);
  };

  return (
    <button
      type="button"
      onClick={handleBlockClick}
      style={style}
      className={cn(
        'flex h-full w-full flex-col gap-1 overflow-hidden rounded border px-2 py-1 text-left text-xs shadow-sm transition-colors hover:opacity-90',
        colors.bg,
        colors.border,
        colors.text,
        className
      )}
    >
      <span className="text-[11px] font-semibold">{startTime}</span>
      <span onClick={handleCustomerClick} className="truncate text-[11px] hover:underline">
        {customerName}
      </span>
    </button>
  );
};
