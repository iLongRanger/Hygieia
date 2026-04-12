import axios from 'axios';
import logger from '../lib/logger';
import { isSmsConfigured, smsConfig } from '../config/sms';

export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+')) {
    if (digits.length >= 8 && digits.length <= 15) {
      return `+${digits}`;
    }

    return null;
  }
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

export async function sendSms(to: string, body: string): Promise<boolean> {
  if (!isSmsConfigured()) {
    logger.warn('SMS not configured, skipping SMS send');
    return false;
  }

  const normalized = normalizePhone(to);
  if (!normalized) {
    logger.warn(`Invalid phone number format for SMS: "${to}"`);
    return false;
  }

  const accountSid = smsConfig.twilioAccountSid;
  const authToken = smsConfig.twilioAuthToken;
  const from = smsConfig.twilioFromNumber;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const form = new URLSearchParams();
  form.set('To', normalized);
  form.set('From', from);
  form.set('Body', body);

  try {
    const response = await axios.post(url, form.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      auth: { username: accountSid, password: authToken },
      timeout: 10_000,
    });
    const sid = (response.data as { sid?: string } | undefined)?.sid;
    logger.info(`SMS sent to ${normalized}${sid ? ` (sid: ${sid})` : ''}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send SMS to ${normalized}`, error);
    return false;
  }
}
