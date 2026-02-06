import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as notificationService from '../notificationService';
import { prisma } from '../../lib/prisma';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    notification: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('notificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
