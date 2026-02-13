import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { sendNotificationEmail } from './emailService';
import { isEmailConfigured } from '../config/email';
import logger from '../lib/logger';
import { emitToUser, REALTIME_EVENTS } from '../lib/realtime';

export interface NotificationListParams {
  userId: string;
  page?: number;
  limit?: number;
  includeRead?: boolean;
  type?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  metadata?: Record<string, unknown>;
  sendEmail?: boolean;
  emailSubject?: string;
  emailHtml?: string;
}

const notificationSelect = {
  id: true,
  type: true,
  title: true,
  body: true,
  metadata: true,
  readAt: true,
  emailSent: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect;

export async function listNotifications(params: NotificationListParams) {
  const { userId, page = 1, limit = 20, includeRead = false, type, dateFrom, dateTo } = params;
  const where: Prisma.NotificationWhereInput = { userId };

  if (!includeRead) {
    where.readAt = null;
  }

  if (type) {
    where.type = type;
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = dateFrom;
    if (dateTo) where.createdAt.lte = dateTo;
  }

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      select: notificationSelect,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    data: notifications,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, readAt: null },
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

  const updated = await prisma.notification.update({
    where: { id },
    data: { readAt: read ? new Date() : null },
    select: notificationSelect,
  });

  await emitNotificationUpdated(userId, updated);
  return updated;
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });

  await emitNotificationAllRead(userId, result.count);
  return result.count;
}

/**
 * Create a notification and optionally send an email.
 * Checks user notification preferences to decide whether to email.
 */
export async function createNotification(input: CreateNotificationInput) {
  const { userId, type, title, body, metadata = {}, sendEmail: shouldSendEmail, emailSubject, emailHtml } = input;

  // Check user notification preferences
  let shouldEmail = shouldSendEmail ?? false;
  if (shouldEmail) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, notificationPreferences: true },
    });

    if (user) {
      const prefs = user.notificationPreferences as Record<string, unknown> | null;
      if (prefs && prefs[type] !== undefined) {
        const typePref = prefs[type] as Record<string, boolean> | boolean;
        if (typeof typePref === 'object' && typePref.email === false) {
          shouldEmail = false;
        } else if (typePref === false) {
          // If the entire type is disabled, skip both notification and email
          return null;
        }
      }
    }
  }

  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      metadata: metadata as Prisma.InputJsonValue,
      emailSent: false,
    },
    select: notificationSelect,
  });

  await emitNotificationCreated(userId, notification);

  // Send email if requested and configured
  if (shouldEmail && isEmailConfigured()) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (user?.email) {
        const subject = emailSubject || title;
        const html = emailHtml || buildDefaultNotificationHtml(title, body || '');
        const sent = await sendNotificationEmail(user.email, subject, html);

        if (sent) {
          await prisma.notification.update({
            where: { id: notification.id },
            data: { emailSent: true },
          });
        }
      }
    } catch (error) {
      logger.error('Failed to send notification email:', error);
    }
  }

  return notification;
}

/**
 * Create notifications for multiple users at once.
 */
export async function createBulkNotifications(
  userIds: string[],
  data: Omit<CreateNotificationInput, 'userId'>
) {
  const results = await Promise.allSettled(
    userIds.map((userId) => createNotification({ ...data, userId }))
  );

  return results.filter(
    (r): r is PromiseFulfilledResult<NonNullable<Awaited<ReturnType<typeof createNotification>>>> =>
      r.status === 'fulfilled' && r.value !== null
  ).map((r) => r.value);
}

function buildDefaultNotificationHtml(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, Helvetica, sans-serif;">
  <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background-color: #1a1a2e; padding: 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px;">${escapeHtml(title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="color: #333; font-size: 14px; line-height: 1.6;">${escapeHtml(body)}</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #999; font-size: 12px; margin: 0;">Hygieia Cleaning Services</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function emitNotificationCreated(
  userId: string,
  notification: Prisma.NotificationGetPayload<{ select: typeof notificationSelect }>
) {
  const unreadCount = await getUnreadCount(userId);
  emitToUser(userId, REALTIME_EVENTS.notificationCreated, {
    notification,
    unreadCount,
  });
}

async function emitNotificationUpdated(
  userId: string,
  notification: Prisma.NotificationGetPayload<{ select: typeof notificationSelect }>
) {
  const unreadCount = await getUnreadCount(userId);
  emitToUser(userId, REALTIME_EVENTS.notificationUpdated, {
    notification,
    unreadCount,
  });
}

async function emitNotificationAllRead(userId: string, markedCount: number) {
  emitToUser(userId, REALTIME_EVENTS.notificationAllRead, {
    markedCount,
    unreadCount: 0,
  });
}
