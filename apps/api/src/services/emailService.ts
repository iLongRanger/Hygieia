import { Resend } from 'resend';
import { emailConfig, isEmailConfigured } from '../config/email';
import logger from '../lib/logger';

let resend: Resend | null = null;
let sendQueue: Promise<void> = Promise.resolve();
let lastSendTimestamp = 0;

const MIN_SEND_INTERVAL_MS = 550;
const MAX_RATE_LIMIT_RETRIES = 3;

function getResend(): Resend {
  if (!resend) {
    if (!isEmailConfigured()) {
      throw new Error('Email is not configured. Set RESEND_API_KEY environment variable.');
    }
    resend = new Resend(emailConfig.resendApiKey);
  }
  return resend;
}

interface SendEmailOptions {
  to: string;
  cc?: string[];
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractRateLimitMessage(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;

  const record = error as Record<string, unknown>;
  const name = typeof record.name === 'string' ? record.name.toLowerCase() : '';
  const message = typeof record.message === 'string' ? record.message : '';
  const messageLower = message.toLowerCase();

  if (
    name.includes('rate') ||
    messageLower.includes('too many requests') ||
    messageLower.includes('rate limit')
  ) {
    return message || 'Rate limit reached';
  }

  return null;
}

async function withSendThrottle<T>(operation: () => Promise<T>): Promise<T> {
  let result!: T;
  let operationError: unknown;

  sendQueue = sendQueue
    .catch(() => {
      // Keep queue alive even if previous send failed.
    })
    .then(async () => {
      const elapsed = Date.now() - lastSendTimestamp;
      const waitMs = Math.max(0, MIN_SEND_INTERVAL_MS - elapsed);
      if (waitMs > 0) {
        await sleep(waitMs);
      }

      try {
        result = await operation();
      } catch (error) {
        operationError = error;
      } finally {
        lastSendTimestamp = Date.now();
      }
    });

  await sendQueue;

  if (operationError) {
    throw operationError;
  }

  return result;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  if (!isEmailConfigured()) {
    logger.warn('Email not configured (RESEND_API_KEY not set), skipping send');
    return false;
  }

  const sendOperation = async (): Promise<{ data: unknown; error: unknown }> =>
    getResend().emails.send({
      from: emailConfig.from,
      to: [options.to],
      cc: options.cc,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments?.map((att) => ({
        filename: att.filename,
        content: att.content,
      })),
    });

  logger.info(
    `Email config: from=${emailConfig.from}, to=${options.to}, apiKeySet=${!!emailConfig.resendApiKey}`
  );

  for (let attempt = 1; attempt <= MAX_RATE_LIMIT_RETRIES + 1; attempt++) {
    try {
      const { data, error } = await withSendThrottle(sendOperation);
      if (!error) {
        const record = data as { id?: string } | null;
        logger.info(`Email sent to ${options.to}: ${options.subject} (id: ${record?.id})`);
        return true;
      }

      const rateLimitMessage = extractRateLimitMessage(error);
      if (rateLimitMessage && attempt <= MAX_RATE_LIMIT_RETRIES) {
        const backoffMs = MIN_SEND_INTERVAL_MS * attempt;
        logger.warn(
          `Resend rate limited for ${options.to}. Retrying attempt ${attempt}/${MAX_RATE_LIMIT_RETRIES} in ${backoffMs}ms.`
        );
        await sleep(backoffMs);
        continue;
      }

      logger.error(`Resend error sending to ${options.to}:`, error);
      return false;
    } catch (error) {
      const rateLimitMessage = extractRateLimitMessage(error);
      if (rateLimitMessage && attempt <= MAX_RATE_LIMIT_RETRIES) {
        const backoffMs = MIN_SEND_INTERVAL_MS * attempt;
        logger.warn(
          `Resend rate limited for ${options.to}. Retrying attempt ${attempt}/${MAX_RATE_LIMIT_RETRIES} in ${backoffMs}ms.`
        );
        await sleep(backoffMs);
        continue;
      }

      logger.error('Failed to send email:', error);
      return false;
    }
  }

  return false;
}

export async function sendProposalEmail(
  to: string,
  cc: string[] | undefined,
  subject: string,
  html: string,
  pdfBuffer?: Buffer,
  proposalNumber?: string
): Promise<boolean> {
  const attachments = pdfBuffer
    ? [
        {
          filename: `${proposalNumber || 'proposal'}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ]
    : undefined;

  return sendEmail({ to, cc, subject, html, attachments });
}

export async function sendNotificationEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  return sendEmail({ to, subject, html });
}
