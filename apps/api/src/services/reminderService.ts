import { prisma } from '../lib/prisma';
import { getGlobalSettings, getDefaultBranding } from './globalSettingsService';
import { createNotification } from './notificationService';
import {
  getAppointmentsNeedingReminders,
  markReminderSent,
} from './appointmentService';
import {
  buildAppointmentReminderHtml,
  buildAppointmentReminderSubject,
} from '../templates/appointmentReminder';
import {
  buildContractRenewalReminderHtmlWithBranding,
  buildContractRenewalReminderSubject,
} from '../templates/contractRenewalReminder';
import logger from '../lib/logger';
import type { GlobalBranding } from '../types/branding';

async function getBrandingSafe(): Promise<GlobalBranding> {
  try {
    return await getGlobalSettings();
  } catch {
    return getDefaultBranding();
  }
}

/**
 * Send reminders for appointments happening in the next 24 hours.
 * Returns the number of reminders sent.
 */
export async function sendAppointmentReminders(): Promise<number> {
  const appointments = await getAppointmentsNeedingReminders();

  if (appointments.length === 0) return 0;

  const branding = await getBrandingSafe();
  let sent = 0;

  for (const appt of appointments) {
    try {
      const contactName =
        appt.lead?.contactName ?? appt.account?.name ?? 'Client';
      const companyName = appt.lead?.companyName ?? null;

      const emailSubject = buildAppointmentReminderSubject(
        appt.type,
        contactName
      );
      const emailHtml = buildAppointmentReminderHtml(
        {
          appointmentType: appt.type,
          scheduledStart: new Date(appt.scheduledStart).toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
          scheduledEnd: new Date(appt.scheduledEnd).toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
          location: appt.location ?? null,
          contactName,
          companyName,
          assignedToName: appt.assignedToUser.fullName,
        },
        branding
      );

      await createNotification({
        userId: appt.assignedToUserId,
        type: 'appointment_reminder',
        title: `Appointment reminder: ${contactName}`,
        body: `Your ${appt.type.replace(/_/g, ' ')} is scheduled for ${new Date(appt.scheduledStart).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}.`,
        metadata: {
          appointmentId: appt.id,
          type: appt.type,
          scheduledStart: appt.scheduledStart,
        },
        sendEmail: true,
        emailSubject,
        emailHtml,
      });

      await markReminderSent(appt.id);
      sent++;
    } catch (error) {
      logger.error(`Failed to send reminder for appointment ${appt.id}:`, error);
    }
  }

  logger.info(`Sent ${sent} appointment reminders`);
  return sent;
}

/**
 * Send reminders for contracts expiring within the specified number of days.
 * Returns the number of reminders sent.
 */
export async function sendContractExpiryReminders(
  daysThreshold: number = 30
): Promise<number> {
  const now = new Date();
  const thresholdDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + daysThreshold
  );

  const expiringContracts = await prisma.contract.findMany({
    where: {
      status: 'active',
      endDate: {
        gte: now,
        lte: thresholdDate,
      },
    },
    select: {
      id: true,
      contractNumber: true,
      title: true,
      endDate: true,
      accountManagerId: true,
      account: { select: { name: true } },
    },
  });

  if (expiringContracts.length === 0) return 0;

  const branding = await getBrandingSafe();
  let sent = 0;

  for (const contract of expiringContracts) {
    if (!contract.accountManagerId || !contract.endDate) continue;

    const daysUntilExpiry = Math.ceil(
      (contract.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Skip if not at a meaningful reminder interval (30, 14, 7 days)
    if (![30, 14, 7, 3, 1].includes(daysUntilExpiry)) continue;

    try {
      const emailSubject = buildContractRenewalReminderSubject(
        contract.contractNumber,
        daysUntilExpiry
      );
      const emailHtml = buildContractRenewalReminderHtmlWithBranding(
        {
          contractNumber: contract.contractNumber,
          title: contract.title,
          accountName: contract.account.name,
          endDate: contract.endDate.toISOString().slice(0, 10),
          daysUntilExpiry,
        },
        branding
      );

      await createNotification({
        userId: contract.accountManagerId,
        type: 'contract_expiring',
        title: `Contract ${contract.contractNumber} expires in ${daysUntilExpiry} days`,
        body: `Contract "${contract.title}" for ${contract.account.name} is expiring on ${contract.endDate.toISOString().slice(0, 10)}.`,
        metadata: {
          contractId: contract.id,
          contractNumber: contract.contractNumber,
          daysUntilExpiry,
        },
        sendEmail: true,
        emailSubject,
        emailHtml,
      });

      sent++;
    } catch (error) {
      logger.error(
        `Failed to send expiry reminder for contract ${contract.id}:`,
        error
      );
    }
  }

  logger.info(`Sent ${sent} contract expiry reminders`);
  return sent;
}
