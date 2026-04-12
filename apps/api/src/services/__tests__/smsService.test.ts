import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import axios from 'axios';
import { normalizePhone, sendSms } from '../smsService';

jest.mock('axios');

jest.mock('../../config/sms', () => ({
  isSmsConfigured: jest.fn(),
  smsConfig: {
    twilioAccountSid: 'AC123',
    twilioAuthToken: 'token',
    twilioFromNumber: '+15550000000',
  },
}));

jest.mock('../../lib/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('smsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normalizePhone', () => {
    it('normalizes US local numbers to E.164', () => {
      expect(normalizePhone('(555) 123-4567')).toBe('+15551234567');
    });

    it('normalizes already international numbers with formatting', () => {
      expect(normalizePhone('+1 (555) 123-4567')).toBe('+15551234567');
    });

    it('rejects unsupported phone formats', () => {
      expect(normalizePhone('555-0100')).toBeNull();
    });
  });

  describe('sendSms', () => {
    it('sends Twilio payload with normalized phone numbers', async () => {
      const { isSmsConfigured } = await import('../../config/sms');
      (isSmsConfigured as jest.Mock).mockReturnValue(true);
      (axios.post as jest.Mock).mockResolvedValue({ data: { sid: 'SM123' } });

      await expect(sendSms('+1 (555) 123-4567', 'Test message')).resolves.toBe(true);

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json',
        expect.stringContaining('To=%2B15551234567'),
        expect.objectContaining({
          auth: { username: 'AC123', password: 'token' },
        })
      );
    });
  });
});
