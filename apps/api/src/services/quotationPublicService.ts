import crypto from 'crypto';
import { prisma } from '../lib/prisma';

const PUBLIC_TOKEN_EXPIRY_DAYS = parseInt(process.env.PUBLIC_TOKEN_EXPIRY_DAYS || '30', 10);

const publicQuotationSelect = {
  id: true,
  quotationNumber: true,
  title: true,
  status: true,
  description: true,
  subtotal: true,
  taxRate: true,
  taxAmount: true,
  totalAmount: true,
  validUntil: true,
  createdAt: true,
  sentAt: true,
  termsAndConditions: true,
  account: {
    select: { name: true },
  },
  facility: {
    select: { name: true, address: true },
  },
  createdByUser: {
    select: { fullName: true, email: true },
  },
  services: {
    select: {
      serviceName: true,
      description: true,
      price: true,
      includedTasks: true,
      sortOrder: true,
    },
    orderBy: { sortOrder: 'asc' as const },
  },
} as const;

export async function generatePublicToken(quotationId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + PUBLIC_TOKEN_EXPIRY_DAYS);

  await prisma.quotation.update({
    where: { id: quotationId },
    data: {
      publicToken: token,
      publicTokenExpiresAt: expiresAt,
    },
  });

  return token;
}

export async function getQuotationByPublicToken(token: string) {
  const quotation = await prisma.quotation.findUnique({
    where: { publicToken: token },
    select: {
      ...publicQuotationSelect,
      publicTokenExpiresAt: true,
      signatureName: true,
      signatureDate: true,
    },
  });

  if (!quotation) return null;

  if (quotation.publicTokenExpiresAt && new Date() > quotation.publicTokenExpiresAt) {
    return null;
  }

  return quotation;
}

export async function markPublicViewed(token: string, ipAddress?: string) {
  const quotation = await prisma.quotation.findUnique({
    where: { publicToken: token },
    select: { id: true, status: true, viewedAt: true },
  });

  if (!quotation) return null;

  if (!quotation.viewedAt) {
    return prisma.quotation.update({
      where: { id: quotation.id },
      data: {
        status: quotation.status === 'sent' ? 'viewed' : quotation.status,
        viewedAt: new Date(),
      },
      select: { id: true },
    });
  }

  return { id: quotation.id };
}

export async function acceptQuotationPublic(
  token: string,
  signatureName: string,
  ipAddress?: string
) {
  const quotation = await prisma.quotation.findUnique({
    where: { publicToken: token },
    select: { id: true, status: true, publicTokenExpiresAt: true },
  });

  if (!quotation) throw new Error('Quotation not found');

  if (quotation.publicTokenExpiresAt && new Date() > quotation.publicTokenExpiresAt) {
    throw new Error('This quotation link has expired');
  }

  if (!['sent', 'viewed'].includes(quotation.status)) {
    throw new Error('This quotation can no longer be accepted');
  }

  return prisma.quotation.update({
    where: { id: quotation.id },
    data: {
      status: 'accepted',
      acceptedAt: new Date(),
      signatureName,
      signatureDate: new Date(),
      signatureIp: ipAddress ?? null,
    },
    select: publicQuotationSelect,
  });
}

export async function rejectQuotationPublic(
  token: string,
  rejectionReason: string,
  ipAddress?: string
) {
  const quotation = await prisma.quotation.findUnique({
    where: { publicToken: token },
    select: { id: true, status: true, publicTokenExpiresAt: true },
  });

  if (!quotation) throw new Error('Quotation not found');

  if (quotation.publicTokenExpiresAt && new Date() > quotation.publicTokenExpiresAt) {
    throw new Error('This quotation link has expired');
  }

  if (!['sent', 'viewed'].includes(quotation.status)) {
    throw new Error('This quotation can no longer be rejected');
  }

  return prisma.quotation.update({
    where: { id: quotation.id },
    data: {
      status: 'rejected',
      rejectedAt: new Date(),
      rejectionReason,
    },
    select: publicQuotationSelect,
  });
}
