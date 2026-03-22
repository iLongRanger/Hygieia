import React from 'react';
import type { Appointment } from '../../types/crm';

export type AppointmentDisplayVariant = 'default' | 'bubble';

export function getAppointmentCustomerName(appointment: Appointment) {
  return (
    appointment.lead?.companyName ||
    appointment.lead?.contactName ||
    appointment.account?.name ||
    'Unknown'
  );
}

export function getAppointmentAssigneeLabel(appointment: Appointment) {
  return appointment.assignedTeam?.name || appointment.assignedToUser?.fullName || 'Unassigned';
}

export function getAppointmentInitials(appointment: Appointment) {
  const source = getAppointmentCustomerName(appointment)
    .replace(/[^A-Za-z0-9 ]+/g, ' ')
    .trim();

  if (!source) return '??';

  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

interface AppointmentDetailCardProps {
  appointment: Appointment;
  startTime: string;
  colors: {
    style?: React.CSSProperties;
  };
  onOpen: (appointment: Appointment) => void;
  onCustomerClick: (appointment: Appointment) => void;
}

export function AppointmentDetailCard({
  appointment,
  startTime,
  colors,
  onOpen,
  onCustomerClick,
}: AppointmentDetailCardProps) {
  const customerName = getAppointmentCustomerName(appointment);
  const assigneeLabel = getAppointmentAssigneeLabel(appointment);
  const notes = appointment.notes?.trim();
  const badgeStyle = colors.style ? { ...colors.style, color: undefined } : undefined;

  return (
    <div className="w-64 rounded-2xl border border-surface-200 bg-surface-50/95 p-3 text-left shadow-xl backdrop-blur-sm dark:border-surface-700 dark:bg-surface-900/95">
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-current/20 text-xs font-semibold uppercase tracking-[0.18em] text-black dark:text-white"
          style={badgeStyle}
        >
          {getAppointmentInitials(appointment)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-surface-500 dark:text-surface-400">
            {startTime}
          </div>
          <div className="truncate text-sm font-semibold text-surface-900 dark:text-surface-100">
            {customerName}
          </div>
          <div className="truncate text-xs text-surface-500 dark:text-surface-400">
            {assigneeLabel}
          </div>
        </div>
      </div>

      {notes ? (
        <p className="mt-3 line-clamp-3 text-xs leading-5 text-surface-600 dark:text-surface-300">
          {notes}
        </p>
      ) : null}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          onClick={(event) => {
            event.stopPropagation();
            onOpen(appointment);
          }}
          className="rounded-full bg-surface-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-surface-700 dark:bg-surface-100 dark:text-surface-900 dark:hover:bg-surface-50"
        >
          Open job
        </button>
        {appointment.account?.id ? (
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            onClick={(event) => {
              event.stopPropagation();
              onCustomerClick(appointment);
            }}
            className="rounded-full border border-surface-200 px-3 py-1.5 text-xs font-semibold text-surface-700 transition hover:border-surface-300 hover:bg-surface-100 dark:border-surface-700 dark:text-surface-200 dark:hover:bg-surface-800"
          >
            Account
          </button>
        ) : null}
      </div>
    </div>
  );
}
