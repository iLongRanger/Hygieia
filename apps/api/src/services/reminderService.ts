import { prisma } from '../lib/prisma';
import { getGlobalSettings, getDefaultBranding } from './globalSettingsService';
import { createBulkNotifications, createNotification } from './notificationService';
import { sendProposalEmail, sendEmail } from './emailService';
import { isEmailConfigured } from '../config/email';
import {
  buildAppointmentReminderHtml,
  buildAppointmentReminderSubject,
} from '../templates/appointmentReminder';
import {
  buildProposalEmailHtmlWithBranding,
  buildProposalEmailSubject,
} from '../templates/proposalEmail';
import {
  buildContractSentHtmlWithBranding,
  buildContractSentSubject,
} from '../templates/contractSent';
import {
  buildContractRenewalReminderHtmlWithBranding,
  buildContractRenewalReminderSubject,
} from '../templates/contractRenewalReminder';
import { logActivity as logProposalActivity } from './proposalActivityService';
import { logContractActivity } from './contractActivityService';
import logger from '../lib/logger';
import type { GlobalBranding } from '../types/branding';

async function getBrandingSafe(): Promise<GlobalBranding> {
  try {
    return await getGlobalSettings();
  } catch {
    return getDefaultBranding();
  }
}

function atUtcStartOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function shouldSendFollowUpReminder(
  baseDate: Date | null,
  now: Date,
  intervalDays: number
): boolean {
  if (!baseDate) return false;
  const baseDay = atUtcStartOfDay(baseDate);
  const today = atUtcStartOfDay(now);
  const diffDays = Math.floor(
    (today.getTime() - baseDay.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays <= 0) return false;
  return diffDays % intervalDays === 0;
}

function resolveContactRecipients(
  contacts: Array<{ email: string | null; isPrimary: boolean }>
): { to: string | null; cc: string[] } {
  const primary = contacts.find((contact) => contact.isPrimary && contact.email);
  const fallback = contacts.find((contact) => contact.email);
  const to = (primary?.email || fallback?.email || null) as string | null;
  const cc = contacts
    .filter((contact) => contact.email && contact.email !== to)
    .map((contact) => contact.email as string);
  return { to, cc };
}

async function getAdminUserIds(): Promise<string[]> {
  const roles = await prisma.userRole.findMany({
    where: {
      role: { key: { in: ['owner', 'admin'] } },
      user: { status: 'active' },
    },
    select: { user: { select: { id: true } } },
  });

  const userIds = new Set<string>();
  for (const role of roles) userIds.add(role.user.id);
  return [...userIds];
}

/**
 * Send reminders for appointments happening in the next 24 hours.
 * Returns the number of reminders sent.
 */
export async function sendAppointmentReminders(): Promise<number> {
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const appointments = await prisma.appointment.findMany({
    where: {
      status: 'scheduled',
      reminderSentAt: null,
      scheduledStart: {
        gte: now,
        lte: in24Hours,
      },
    },
    select: {
      id: true,
      type: true,
      scheduledStart: true,
      scheduledEnd: true,
      location: true,
      assignedToUserId: true,
      assignedToUser: {
        select: {
          fullName: true,
        },
      },
      lead: {
        select: {
          contactName: true,
          companyName: true,
        },
      },
      account: {
        select: {
          name: true,
        },
      },
    },
  });

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

      await prisma.appointment.update({
        where: { id: appt.id },
        data: { reminderSentAt: new Date() },
      });
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
      account: { select: { name: true, accountManagerId: true } },
    },
  });

  if (expiringContracts.length === 0) return 0;

  const branding = await getBrandingSafe();
  let sent = 0;

  for (const contract of expiringContracts) {
    if (!contract.account.accountManagerId || !contract.endDate) continue;

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
        userId: contract.account.accountManagerId,
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

/**
 * Send automated reminder emails for sent/viewed proposals that are awaiting client action.
 * Also creates internal in-app notifications when reminders are sent.
 */
export async function sendProposalFollowUpReminders(): Promise<number> {
  if (!isEmailConfigured()) {
    logger.warn('Email not configured — skipping proposal follow-up reminders');
    return 0;
  }

  const now = new Date();
  const startOfToday = atUtcStartOfDay(now);
  const reminderEveryDays = parsePositiveInt(
    process.env.PROPOSAL_REMINDER_INTERVAL_DAYS,
    3
  );
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const proposals = await prisma.proposal.findMany({
    where: {
      status: { in: ['sent', 'viewed'] },
      archivedAt: null,
    },
    select: {
      id: true,
      proposalNumber: true,
      title: true,
      sentAt: true,
      viewedAt: true,
      validUntil: true,
      totalAmount: true,
      publicToken: true,
      createdByUserId: true,
      account: {
        select: {
          name: true,
          accountManagerId: true,
          contacts: {
            where: {
              archivedAt: null,
              email: { not: null },
            },
            select: {
              email: true,
              isPrimary: true,
            },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          },
        },
      },
    },
  });

  if (proposals.length === 0) return 0;

  const remindedToday = await prisma.proposalActivity.findMany({
    where: {
      proposalId: { in: proposals.map((proposal) => proposal.id) },
      action: 'reminder_sent',
      createdAt: { gte: startOfToday },
    },
    select: { proposalId: true },
  });
  const remindedTodaySet = new Set(remindedToday.map((activity) => activity.proposalId));

  const adminUserIds = await getAdminUserIds();
  const branding = await getBrandingSafe();
  let sent = 0;

  for (const proposal of proposals) {
    if (proposal.validUntil && proposal.validUntil < now) continue;
    if (remindedTodaySet.has(proposal.id)) continue;

    const baseDate = proposal.viewedAt ?? proposal.sentAt;
    if (!shouldSendFollowUpReminder(baseDate, now, reminderEveryDays)) continue;

    const { to, cc } = resolveContactRecipients(proposal.account.contacts);
    if (!to) continue;

    const publicViewUrl = proposal.publicToken
      ? `${frontendUrl}/p/${proposal.publicToken}`
      : undefined;

    const emailSubject = `Reminder: ${buildProposalEmailSubject(
      proposal.proposalNumber,
      proposal.title
    )}`;
    const emailHtml = buildProposalEmailHtmlWithBranding(
      {
        proposalNumber: proposal.proposalNumber,
        title: proposal.title,
        accountName: proposal.account.name,
        totalAmount: new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(Number(proposal.totalAmount)),
        validUntil: proposal.validUntil
          ? new Date(proposal.validUntil).toLocaleDateString()
          : null,
        publicViewUrl,
      },
      branding
    );

    try {
      const emailSent = await sendProposalEmail(
        to,
        cc.length > 0 ? cc : undefined,
        emailSubject,
        emailHtml
      );
      if (!emailSent) continue;

      await logProposalActivity({
        proposalId: proposal.id,
        action: 'reminder_sent',
        metadata: {
          channel: 'automatic',
          to,
          cc,
          reminderEveryDays,
        },
      });

      const recipientUserIds = new Set<string>(adminUserIds);
      recipientUserIds.add(proposal.createdByUserId);
      if (proposal.account.accountManagerId) {
        recipientUserIds.add(proposal.account.accountManagerId);
      }

      await createBulkNotifications([...recipientUserIds], {
        type: 'proposal_reminder_sent',
        title: `Proposal reminder sent: ${proposal.proposalNumber}`,
        body: `Reminder sent to ${to} for proposal "${proposal.title}".`,
        metadata: {
          proposalId: proposal.id,
          proposalNumber: proposal.proposalNumber,
          to,
          cc,
          automatic: true,
        },
      });

      sent++;
    } catch (error) {
      logger.error(`Failed proposal reminder for ${proposal.id}:`, error);
    }
  }

  logger.info(`Sent ${sent} proposal follow-up reminders`);
  return sent;
}

/**
 * Send automated reminder emails for sent/viewed contracts awaiting client action.
 * Also creates internal in-app notifications when reminders are sent.
 */
export async function sendContractFollowUpReminders(): Promise<number> {
  if (!isEmailConfigured()) {
    logger.warn('Email not configured — skipping contract follow-up reminders');
    return 0;
  }

  const now = new Date();
  const startOfToday = atUtcStartOfDay(now);
  const reminderEveryDays = parsePositiveInt(
    process.env.CONTRACT_REMINDER_INTERVAL_DAYS,
    3
  );
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const contracts = await prisma.contract.findMany({
    where: {
      status: { in: ['sent', 'viewed'] },
      archivedAt: null,
    },
    select: {
      id: true,
      contractNumber: true,
      title: true,
      sentAt: true,
      viewedAt: true,
      startDate: true,
      monthlyValue: true,
      publicToken: true,
      createdByUserId: true,
      account: {
        select: {
          name: true,
          accountManagerId: true,
          contacts: {
            where: {
              archivedAt: null,
              email: { not: null },
            },
            select: {
              email: true,
              isPrimary: true,
              name: true,
            },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          },
        },
      },
    },
  });

  if (contracts.length === 0) return 0;

  const remindedToday = await prisma.contractActivity.findMany({
    where: {
      contractId: { in: contracts.map((contract) => contract.id) },
      action: 'reminder_sent',
      createdAt: { gte: startOfToday },
    },
    select: { contractId: true },
  });
  const remindedTodaySet = new Set(remindedToday.map((activity) => activity.contractId));

  const adminUserIds = await getAdminUserIds();
  const branding = await getBrandingSafe();
  let sent = 0;

  for (const contract of contracts) {
    if (remindedTodaySet.has(contract.id)) continue;

    const baseDate = contract.viewedAt ?? contract.sentAt;
    if (!shouldSendFollowUpReminder(baseDate, now, reminderEveryDays)) continue;

    const { to, cc } = resolveContactRecipients(contract.account.contacts);
    if (!to) continue;

    const recipientNameFromContact =
      contract.account.contacts.find((contact) => contact.isPrimary)?.name ||
      contract.account.contacts[0]?.name ||
      undefined;
    const publicViewUrl = contract.publicToken
      ? `${frontendUrl}/c/${contract.publicToken}`
      : undefined;

    const emailSubject = `Reminder: ${buildContractSentSubject(
      contract.contractNumber,
      contract.title
    )}`;
    const emailHtml = buildContractSentHtmlWithBranding(
      {
        contractNumber: contract.contractNumber,
        title: contract.title,
        accountName: contract.account.name,
        monthlyValue: new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(Number(contract.monthlyValue)),
        startDate: new Date(contract.startDate).toLocaleDateString(),
        recipientName: recipientNameFromContact || contract.account.name,
        customMessage: 'Friendly reminder to review and sign the contract.',
        publicViewUrl,
      },
      branding
    );

    try {
      const emailSent = await sendEmail({
        to,
        cc: cc.length > 0 ? cc : undefined,
        subject: emailSubject,
        html: emailHtml,
      });
      if (!emailSent) continue;

      await logContractActivity({
        contractId: contract.id,
        action: 'reminder_sent',
        metadata: {
          channel: 'automatic',
          to,
          cc,
          reminderEveryDays,
        },
      });

      const recipientUserIds = new Set<string>(adminUserIds);
      recipientUserIds.add(contract.createdByUserId);
      if (contract.account.accountManagerId) {
        recipientUserIds.add(contract.account.accountManagerId);
      }

      await createBulkNotifications([...recipientUserIds], {
        type: 'contract_reminder_sent',
        title: `Contract reminder sent: ${contract.contractNumber}`,
        body: `Reminder sent to ${to} for contract "${contract.title}".`,
        metadata: {
          contractId: contract.id,
          contractNumber: contract.contractNumber,
          to,
          cc,
          automatic: true,
        },
      });

      sent++;
    } catch (error) {
      logger.error(`Failed contract reminder for ${contract.id}:`, error);
    }
  }

  logger.info(`Sent ${sent} contract follow-up reminders`);
  return sent;
}
