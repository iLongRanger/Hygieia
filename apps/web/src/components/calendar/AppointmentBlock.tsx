import React from 'react';
import { cn } from '../../lib/utils';
import { APPOINTMENT_TYPE_COLORS, formatTime } from '../../lib/calendar-utils';
import type { Appointment } from '../../types/crm';

interface AppointmentBlockProps {
  appointment: Appointment;
  onEdit: (appointment: Appointment) => void;
  onCustomerClick: (appointment: Appointment) => void;
  compact?: boolean;
}

export const AppointmentBlock: React.FC<AppointmentBlockProps> = ({
  appointment,
  onEdit,
  onCustomerClick,
  compact = false,
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

  if (compact) {
    // Mobile/compact view - just show a colored dot
    return (
      <button
        onClick={handleBlockClick}
        className={cn('h-2 w-2 rounded-full', colors.dot)}
        title={`${startTime} - ${customerName}`}
      />
    );
  }

  return (
    <button
      onClick={handleBlockClick}
      className={cn(
        'w-full rounded border px-1.5 py-0.5 text-left text-xs transition-colors hover:opacity-80',
        colors.bg,
        colors.border,
        colors.text
      )}
    >
      <div className="flex items-center gap-1 overflow-hidden">
        <span className="shrink-0 font-medium">{startTime}</span>
        <span
          onClick={handleCustomerClick}
          className="truncate hover:underline"
        >
          {customerName}
        </span>
      </div>
    </button>
  );
};
