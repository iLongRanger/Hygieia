import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  sendContractFollowUpReminders,
  sendProposalFollowUpReminders,
} from '../reminderService';

jest.mock('../../lib/prisma', () => ({
  prisma: {
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
  });

  afterEach(() => {
    process.env.FRONTEND_URL = originalFrontendUrl;
  });

  it('skips proposal follow-up reminders when FRONTEND_URL is missing', async () => {
    delete process.env.FRONTEND_URL;

    await expect(sendProposalFollowUpReminders()).resolves.toBe(0);
  });

  it('skips contract follow-up reminders when FRONTEND_URL is missing', async () => {
    delete process.env.FRONTEND_URL;

    await expect(sendContractFollowUpReminders()).resolves.toBe(0);
  });
});
