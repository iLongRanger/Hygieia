import type { GlobalBranding } from '../types/branding';

interface SubcontractorWelcomeData {
  teamName: string;
  contractNumber: string;
  facilityName: string;
  setPasswordUrl: string;
}

export function buildSubcontractorWelcomeSubject(): string {
  return 'Welcome to Hygieia — Set Up Your Account';
}

export function buildSubcontractorWelcomeHtml(
  data: SubcontractorWelcomeData,
  branding: GlobalBranding
): string {
  const primaryColor = branding.themePrimaryColor || '#0d9488';

  const logoBlock = branding.logoDataUrl
    ? `<img src="${branding.logoDataUrl}" alt="${branding.companyName} logo" style="max-height: 56px; margin-bottom: 12px;" />`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, Helvetica, sans-serif;">
  <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background-color: ${primaryColor}; padding: 30px; text-align: center;">
              ${logoBlock}
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Welcome to ${branding.companyName}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="color: #333; font-size: 14px; line-height: 1.6;">
                Hello <strong>${data.teamName}</strong>,
              </p>
              <p style="color: #333; font-size: 14px; line-height: 1.6;">
                You've been assigned to contract <strong>${data.contractNumber}</strong> at <strong>${data.facilityName}</strong>.
              </p>
              <p style="color: #333; font-size: 14px; line-height: 1.6;">
                A portal account has been created for you. Click the button below to set your password and access your contracts, jobs, and time tracking:
              </p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${data.setPasswordUrl}" style="background-color: ${primaryColor}; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                  Set Your Password
                </a>
              </p>
              <p style="color: #666; font-size: 13px; line-height: 1.5;">
                This link expires in 72 hours. If you have any questions, contact your account manager.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                ${branding.companyName}${branding.companyPhone ? ` | ${branding.companyPhone}` : ''}${branding.companyEmail ? ` | ${branding.companyEmail}` : ''}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
