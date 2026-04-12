import { escapeHtml } from '../utils/escapeHtml';

interface LoginVerificationEmailData {
  fullName: string;
  code: string;
  expiresInMinutes: number;
}

export function buildLoginVerificationSubject(): string {
  return 'Your Hygieia login verification code';
}

export function buildLoginVerificationHtml(data: LoginVerificationEmailData): string {
  const safeName = escapeHtml(data.fullName);
  const safeCode = escapeHtml(data.code);

  return `
    <div style="font-family: Arial, sans-serif; background: #f7f7f5; padding: 32px 16px; color: #13211d;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #d9dfdc; overflow: hidden;">
        <div style="padding: 24px 28px; background: #13211d; color: #ffffff;">
          <p style="margin: 0; font-size: 12px; letter-spacing: 0.22em; text-transform: uppercase; opacity: 0.72;">Hygieia</p>
          <h1 style="margin: 12px 0 0; font-size: 28px; line-height: 1.1;">Login verification</h1>
        </div>
        <div style="padding: 28px;">
          <p style="margin: 0 0 14px; font-size: 15px; line-height: 1.7;">Hi ${safeName},</p>
          <p style="margin: 0 0 18px; font-size: 15px; line-height: 1.7;">
            Use the verification code below to finish signing in to Hygieia.
          </p>
          <div style="margin: 0 0 18px; padding: 18px 20px; border-radius: 14px; background: #f2ece4; border: 1px solid #e0d3bf; text-align: center;">
            <p style="margin: 0; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #7b5a3c;">Verification code</p>
            <p style="margin: 10px 0 0; font-size: 36px; letter-spacing: 0.22em; font-weight: 700; color: #13211d;">${safeCode}</p>
          </div>
          <p style="margin: 0; font-size: 14px; line-height: 1.7; color: #4f625b;">
            This code expires in ${data.expiresInMinutes} minutes. If you did not try to sign in, you can ignore this email.
          </p>
        </div>
      </div>
    </div>
  `;
}
