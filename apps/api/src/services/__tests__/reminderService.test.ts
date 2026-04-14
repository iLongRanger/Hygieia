import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  sendAppointmentReminders,
  sendContractFollowUpReminders,
  sendProposalFollowUpReminders,
  sendUpcomingJobReminders,
} from '../reminderService';
import { sendSms } from '../smsService';
import { createNotification } from '../notificationService';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    appointment: { findMany: jest.fn(), update: jest.fn() },
    job: { findMany: jest.fn() },
    jobActivity: { findMany: jest.fn(), create: jest.fn() },
    proposal: { findMany: jest.fn() },
    contract: { findMany: jest.fn() },
    proposalActivity: { findMany: jest.fn() },
    contractActivity: { findMany: jest.fn() },
    userRole: { findMany: jest.fn() },
  },
}));

jest.mock('../globalSettingsService', () => ({
  getGlobalSettings: jest.fn().mockResolvedValue({}),
  getDefaultBranding: jest.fn().mockReturnValue({}),
}));

jest.mock('../notificationService', () => ({
  createBulkNotifications: jest.fn().mockResolvedValue([]),
  createNotification: jest.fn().mockResolvedValue({}),
}));

jest.mock('../smsService', () => ({
  sendSms: jest.fn().mockResolvedValue(true),
}));

jest.mock('../emailService', () => ({
  sendProposalEmail: jest.fn().mockResolvedValue(true),
  sendEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../config/email', () => ({
  isEmailConfigured: jest.fn().mockReturnValue(true),
}));

jest.mock('../proposalActivityService', () => ({
  logActivity: jest.fn().mockResolvedValue({}),
}));

jest.mock('../contractActivityService', () => ({
  logContractActivity: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../templates/proposalEmail', () => ({
  buildProposalEmailHtmlWithBranding: jest.fn().mockReturnValue('<html></html>'),
  buildProposalEmailSubject: jest.fn().mockReturnValue('Proposal'),
}));

jest.mock('../../templates/contractSent', () => ({
  buildContractSentHtmlWithBranding: jest.fn().mockReturnValue('<html></html>'),
  buildContractSentSubject: jest.fn().mockReturnValue('Contract'),
}));

jest.mock('../../templates/contractRenewalReminder', () => ({
  buildContractRenewalReminderHtmlWithBranding: jest.fn().mockReturnValue('<html></html>'),
  buildContractRenewalReminderSubject: jest.fn().mockReturnValue('Renewal'),
}));

jest.mock('../../templates/appointmentReminder', () => ({
  buildAppointmentReminderHtml: jest.fn().mockReturnValue('<html></html>'),
  buildAppointmentReminderSubject: jest.fn().mockReturnValue('Appointment'),
}));

jest.mock('../../lib/logger', () => ({
  __esModule: true,
  default: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('reminderService', () => {
  const originalFrontendUrl = process.env.FRONTEND_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-04-06T16:00:00.000Z'));
  });

  afterEach(() => {
    process.env.FRONTEND_URL = originalFrontendUrl;
    jest.useRealTimers();
  });

  it('skips proposal follow-up reminders when FRONTEND_URL is missing', async () => {
    delete process.env.FRONTEND_URL;

    await expect(sendProposalFollowUpReminders()).resolves.toBe(0);
  });

  it('skips contract follow-up reminders when FRONTEND_URL is missing', async () => {
    delete process.env.FRONTEND_URL;

    await expect(sendContractFollowUpReminders()).resolves.toBe(0);
  });

  it('sends appointment reminder SMS to the client phone when available', async () => {
    const { prisma } = await import('../../lib/prisma');

    (prisma.appointment.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'appt-1',
        type: 'walk_through',
        scheduledStart: new Date('2026-04-07T18:00:00.000Z'),
        scheduledEnd: new Date('2026-04-07T19:00:00.000Z'),
        location: '123 Main St',
        assignedToUserId: 'user-1',
        assignedToUser: { fullName: 'Rep One' },
        lead: { contactName: 'Jane Client', companyName: 'Acme', primaryPhone: '+15550001111' },
        account: null,
      },
    ]);
    (prisma.appointment.update as jest.Mock).mockResolvedValue({});

    await expect(sendAppointmentReminders()).resolves.toBe(1);
    expect(createNotification).toHaveBeenCalled();
    expect(sendSms).toHaveBeenCalledWith(
      '+15550001111',
      expect.stringContaining('walk through')
    );
  });

  it('sends upcoming job reminder SMS once per job', async () => {
    const { prisma } = await import('../../lib/prisma');

    (sendSms as jest.Mock).mockResolvedValue(true);
    (prisma.job.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'job-1',
        jobNumber: 'WO-2026-0001',
        jobType: 'scheduled_service',
        scheduledDate: new Date('2026-04-07T00:00:00.000Z'),
        scheduledStartTime: new Date('2026-04-07T16:00:00.000Z'),
        facility: { name: 'Maple Street Home' },
        account: {
          name: 'Jane Client',
          billingPhone: null,
          contacts: [{ phone: '+15550002222', isPrimary: true }],
        },
      },
    ]);
    (prisma.jobActivity.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.jobActivity.create as jest.Mock).mockResolvedValue({});

    await expect(sendUpcomingJobReminders()).resolves.toBe(1);
    expect(sendSms).toHaveBeenCalledWith(
      '+15550002222',
      expect.stringContaining('Maple Street Home')
    );
    expect(prisma.jobActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          jobId: 'job-1',
          action: 'client_reminder_sent',
        }),
      })
    );
  });
});
