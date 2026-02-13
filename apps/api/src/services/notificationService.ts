import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export interface NotificationListParams {
  userId: string;
  limit?: number;
  includeRead?: boolean;
}

const notificationSelect = {
  id: true,
  type: true,
  title: true,
  body: true,
  metadata: true,
  readAt: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect;

export async function listNotifications(params: NotificationListParams) {
  const { userId, limit = 20, includeRead = false } = params;
  const where: Prisma.NotificationWhereInput = { userId };

  if (!includeRead) {
    where.readAt = null;
  }

  return prisma.notification.findMany({
    where,
    select: notificationSelect,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function markNotificationRead(id: string, userId: string, read: boolean) {
  const notification = await prisma.notification.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!notification) {
    return null;
  }

  return prisma.notification.update({
    where: { id },
    data: { readAt: read ? new Date() : null },
    select: notificationSelect,
  });
}
