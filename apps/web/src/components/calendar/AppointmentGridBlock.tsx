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

interface AppointmentGridBlockProps {
  appointment: Appointment;
  onEdit: (appointment: Appointment) => void;
  onCustomerClick: (appointment: Appointment) => void;
  className?: string;
  style?: React.CSSProperties;
  displayVariant?: AppointmentDisplayVariant;
}

export const AppointmentGridBlock: React.FC<AppointmentGridBlockProps> = ({
  appointment,
  onEdit,
  onCustomerClick,
  className,
  style,
  displayVariant = 'default',
}) => {
  const colors = getAppointmentColors(appointment);
  const startTime = formatTime(new Date(appointment.scheduledStart));
  const customerName = getAppointmentCustomerName(appointment);
  const bubbleStyle = colors.style ? { ...colors.style, color: undefined } : undefined;
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = React.useState(false);
  const [isPinned, setIsPinned] = React.useState(false);
  const showBubbleVariant = displayVariant === 'bubble';
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

  if (showBubbleVariant) {
    return (
      <div
        ref={wrapperRef}
        style={style}
        className={cn('relative m-0.5 flex items-start justify-start overflow-visible p-1', className)}
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
            'flex h-10 w-10 items-center justify-center rounded-full border text-[11px] font-semibold uppercase tracking-[0.14em] text-black shadow-md transition duration-150 hover:scale-[1.04] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-500/40 dark:text-white',
            colors.bg,
            colors.border,
            colors.text
          )}
        >
          {getAppointmentInitials(appointment)}
        </button>

        {showDetails ? (
          <div className="absolute left-0 top-12 z-30">
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
      type="button"
      onClick={handleBlockClick}
      style={{ ...colors.style, ...style }}
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
