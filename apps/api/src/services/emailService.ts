import { Resend } from 'resend';
import { emailConfig, isEmailConfigured } from '../config/email';
import logger from '../lib/logger';

let resend: Resend | null = null;

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

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  if (!isEmailConfigured()) {
    logger.warn('Email not configured (RESEND_API_KEY not set), skipping send');
    return false;
  }

  try {
    logger.info(`Email config: from=${emailConfig.from}, to=${options.to}, apiKeySet=${!!emailConfig.resendApiKey}`);
    const { data, error } = await getResend().emails.send({
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

    if (error) {
      logger.error(`Resend error sending to ${options.to}:`, error);
      return false;
    }

    logger.info(`Email sent to ${options.to}: ${options.subject} (id: ${data?.id})`);
    return true;
  } catch (error) {
    logger.error('Failed to send email:', error);
    return false;
  }
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
