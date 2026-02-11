import type { GlobalBranding } from '../types/branding';

interface RenewalReminderEmailData {
  contractNumber: string;
  title: string;
  accountName: string;
  endDate: string;
  daysUntilExpiry: number;
}

export function buildContractRenewalReminderHtmlWithBranding(
  data: RenewalReminderEmailData,
  branding: GlobalBranding
): string {
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
            <td style="background-color: ${branding.themePrimaryColor}; padding: 30px; text-align: center;">
              ${logoBlock}
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Contract Expiring Soon</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="color: #333; font-size: 14px; line-height: 1.6;">
                Contract <strong>${data.contractNumber}</strong> - "${data.title}" is expiring in <strong>${data.daysUntilExpiry} days</strong>.
              </p>
              <table cellpadding="8" cellspacing="0" style="margin: 15px 0; background-color: #fffbeb; border-radius: 6px; width: 100%;">
                <tr><td style="color: #666; font-size: 13px;">Client</td><td style="font-weight: bold;">${data.accountName}</td></tr>
                <tr><td style="color: #666; font-size: 13px;">End Date</td><td style="font-weight: bold;">${data.endDate}</td></tr>
                <tr><td style="color: #666; font-size: 13px;">Days Remaining</td><td style="font-weight: bold;">${data.daysUntilExpiry}</td></tr>
              </table>
              <p style="color: #666; font-size: 13px; line-height: 1.5;">
                Please review this contract and take action to renew or let it expire.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #999; font-size: 12px; margin: 0;">${branding.companyName}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildContractRenewalReminderSubject(contractNumber: string, daysUntilExpiry: number): string {
  return `Contract ${contractNumber} expires in ${daysUntilExpiry} days`;
}
