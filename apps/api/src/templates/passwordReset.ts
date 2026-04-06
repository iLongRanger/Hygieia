import { companyConfig } from '../config/company';

interface PasswordResetEmailData {
  fullName: string;
  resetUrl: string;
}

export function buildPasswordResetSubject(): string {
  return `Reset your ${companyConfig.name} password`;
}

export function buildPasswordResetHtml({
  fullName,
  resetUrl,
}: PasswordResetEmailData): string {
  return `
    <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 32px; color: #0f172a;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: #134e4a; padding: 24px 28px; color: #ffffff;">
          <div style="font-size: 18px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">
            ${companyConfig.name}
          </div>
          <div style="margin-top: 10px; font-size: 28px; font-weight: 700;">
            Reset your password
          </div>
        </div>
        <div style="padding: 28px;">
          <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6;">
            Hi ${fullName},
          </p>
          <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6;">
            We received a request to reset your password. Use the button below to choose a new one.
          </p>
          <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6;">
            This link expires in 2 hours. If you did not request this change, you can safely ignore this email.
          </p>
          <a
            href="${resetUrl}"
            style="display: inline-block; background: #0f766e; color: #ffffff; text-decoration: none; padding: 14px 22px; border-radius: 999px; font-weight: 700;"
          >
            Reset Password
          </a>
          <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.6; color: #475569;">
            If the button does not work, copy and paste this link into your browser:<br />
            <span style="word-break: break-all;">${resetUrl}</span>
          </p>
        </div>
      </div>
    </div>
  `;
}
