import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import * as notificationService from '../notificationService';
import { prisma } from '../../lib/prisma';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    notification: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../emailService', () => ({
  sendNotificationEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../config/email', () => ({
  isEmailConfigured: jest.fn().mockReturnValue(true),
}));

jest.mock('../../lib/realtime', () => ({
  REALTIME_EVENTS: {
    notificationCreated: 'notificationCreated',
    notificationUpdated: 'notificationUpdated',
    notificationAllRead: 'notificationAllRead',
  },
  emitToUser: jest.fn(),
}));

describe('notificationService', () => {
  const originalResendApiKey = process.env.RESEND_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-key';
    (prisma.notification.count as jest.Mock).mockResolvedValue(0);
  });

  afterEach(() => {
    process.env.RESEND_API_KEY = originalResendApiKey;
  });

  it('listNotifications should filter unread by default', async () => {
    (prisma.notification.findMany as jest.Mock).mockResolvedValue([{ id: 'notification-1' }]);

    const result = await notificationService.listNotifications({ userId: 'user-1' });

    expect(result).toHaveLength(1);
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', readAt: null },
        take: 20,
      })
    );
  });

  it('markNotificationRead should return null when notification is not owned by user', async () => {
    (prisma.notification.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await notificationService.markNotificationRead('notification-1', 'user-1', true);

    expect(result).toBeNull();
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it('markNotificationRead should clear readAt when read is false', async () => {
    (prisma.notification.findFirst as jest.Mock).mockResolvedValue({ id: 'notification-1' });
    (prisma.notification.update as jest.Mock).mockResolvedValue({ id: 'notification-1', readAt: null });

    const result = await notificationService.markNotificationRead('notification-1', 'user-1', false);

    expect(result).toEqual({ id: 'notification-1', readAt: null });
    expect(prisma.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'notification-1' },
        data: { readAt: null },
      })
    );
  });

  it('createNotification enables email delivery by default', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      email: 'admin@example.com',
      notificationPreferences: null,
    });
    (prisma.notification.create as jest.Mock).mockResolvedValue({
      id: 'notification-1',
      userId: 'user-1',
      type: 'job_missed',
      title: 'Job missed',
      body: 'Review required',
      metadata: {},
      readAt: null,
      emailSent: false,
      createdAt: new Date('2026-05-13T12:00:00.000Z'),
    });
    (prisma.notification.update as jest.Mock).mockResolvedValue({});

    await notificationService.createNotification({
      userId: 'user-1',
      type: 'job_missed',
      title: 'Job missed',
      body: 'Review required',
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { email: true, notificationPreferences: true },
    });
  });

  it('createNotification respects explicit email opt-out', async () => {
    const { sendNotificationEmail } = await import('../emailService');
    (prisma.notification.create as jest.Mock).mockResolvedValue({
      id: 'notification-2',
      userId: 'user-1',
      type: 'job_missed',
      title: 'Job missed',
      body: 'Review required',
      metadata: {},
      readAt: null,
      emailSent: false,
      createdAt: new Date('2026-05-13T12:00:00.000Z'),
    });

    await notificationService.createNotification({
      userId: 'user-1',
      type: 'job_missed',
      title: 'Job missed',
      body: 'Review required',
      sendEmail: false,
    });

    expect(sendNotificationEmail).not.toHaveBeenCalled();
  });
});
