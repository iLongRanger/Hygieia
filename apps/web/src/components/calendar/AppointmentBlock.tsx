import React from 'react';
import { cn } from '../../lib/utils';
import { formatTime, getAppointmentColors } from '../../lib/calendar-utils';
import type { Appointment } from '../../types/crm';
import {
  AppointmentDetailCard,
  type AppointmentDisplayVariant,
  getAppointmentCustomerName,
  getAppointmentInitials,
} from './appointmentPresentation';

interface AppointmentBlockProps {
  appointment: Appointment;
  onEdit: (appointment: Appointment) => void;
  onCustomerClick: (appointment: Appointment) => void;
  compact?: boolean;
  displayVariant?: AppointmentDisplayVariant;
}

export const AppointmentBlock: React.FC<AppointmentBlockProps> = ({
  appointment,
  onEdit,
  onCustomerClick,
  compact = false,
  displayVariant = 'default',
}) => {
  const colors = getAppointmentColors(appointment);
  const startTime = formatTime(new Date(appointment.scheduledStart));
  const customerName = getAppointmentCustomerName(appointment);
  const bubbleStyle = colors.style ? { ...colors.style, color: undefined } : undefined;
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = React.useState(false);
  const [isPinned, setIsPinned] = React.useState(false);
  const showBubbleVariant = displayVariant === 'bubble' && !compact;
  const showDetails = showBubbleVariant && (isHovered || isPinned);

  const handleBlockClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showBubbleVariant) {
      setIsPinned((current) => !current);
      return;
    }
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
        style={colors.dotStyle}
        title={`${startTime} - ${customerName}`}
      />
    );
  }

  if (showBubbleVariant) {
    return (
      <div
        ref={wrapperRef}
        className="relative inline-flex"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsPinned(false);
        }}
      >
        <button
          type="button"
          onClick={handleBlockClick}
          onFocus={() => setIsHovered(true)}
          onBlur={(event) => {
            const nextTarget = event.relatedTarget as Node | null;
            if (nextTarget && wrapperRef.current?.contains(nextTarget)) return;
            if (!isPinned) setIsHovered(false);
          }}
          style={bubbleStyle}
          aria-label={`Show job details for ${customerName}`}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full border text-[11px] font-semibold uppercase tracking-[0.14em] text-surface-900 shadow-sm transition duration-150 hover:scale-[1.04] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500/40 dark:text-white',
            colors.bg,
            colors.border,
            colors.text
          )}
        >
          {getAppointmentInitials(appointment)}
        </button>

        {showDetails ? (
          <div className="absolute left-0 top-full z-30 mt-2">
            <AppointmentDetailCard
              appointment={appointment}
              startTime={startTime}
              colors={colors}
              onOpen={onEdit}
              onCustomerClick={onCustomerClick}
            />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <button
      onClick={handleBlockClick}
      style={colors.style}
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
