import type { GlobalBranding } from '../types/branding';

interface ContractSentEmailData {
  contractNumber: string;
  title: string;
  accountName: string;
  monthlyValue: string;
  startDate: string;
  recipientName?: string;
  customMessage?: string;
  publicViewUrl?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildContractSentHtmlWithBranding(
  data: ContractSentEmailData,
  branding: GlobalBranding
): string {
  const viewButton = data.publicViewUrl
    ? `
      <tr>
        <td style="padding: 20px 0; text-align: center;">
          <a href="${data.publicViewUrl}"
             style="background-color: ${branding.themeAccentColor}; color: ${branding.themePrimaryColor}; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
            Review &amp; Sign Contract
          </a>
        </td>
      </tr>`
    : '';
  const logoBlock = branding.logoDataUrl
    ? `<img src="${branding.logoDataUrl}" alt="${branding.companyName} logo" style="max-height: 64px; margin-bottom: 12px;" />`
    : '';
  const recipientName = data.recipientName?.trim() || data.accountName;
  const messageHtml = data.customMessage?.trim()
    ? `<p style="color: #333; font-size: 14px; line-height: 1.6; white-space: pre-line;">${escapeHtml(data.customMessage)}</p>`
    : `<p style="color: #333; font-size: 14px; line-height: 1.6;">
        Dear ${escapeHtml(recipientName)},
      </p>
      <p style="color: #333; font-size: 14px; line-height: 1.6;">
        Please find the attached contract for your review.
        You can also review the full contract details and sign online using the button below.
      </p>`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: ${branding.themeBackgroundColor}; font-family: Arial, Helvetica, sans-serif;">
  <table cellpadding="0" cellspacing="0" width="100%" style="background-color: ${branding.themeBackgroundColor}; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${branding.themePrimaryColor}; padding: 30px; text-align: center;">
              ${logoBlock}
              <h1 style="color: ${branding.themeAccentColor}; margin: 0; font-size: 24px;">${branding.companyName}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="color: ${branding.themePrimaryColor}; margin: 0 0 10px 0; font-size: 20px;">Contract: ${data.title}</h2>
              <p style="color: #666; margin: 0 0 20px 0; font-size: 14px;">${data.contractNumber}</p>

              <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 12px; background-color: #f8f8f8; border-radius: 6px;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="color: #666; font-size: 13px; padding-bottom: 4px;">Prepared for</td>
                        <td style="color: #666; font-size: 13px; padding-bottom: 4px; text-align: right;">Monthly Value</td>
                      </tr>
                      <tr>
                        <td style="color: ${branding.themePrimaryColor}; font-size: 16px; font-weight: bold;">${data.accountName}</td>
                        <td style="color: ${branding.themePrimaryColor}; font-size: 16px; font-weight: bold; text-align: right;">${data.monthlyValue}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="color: #666; font-size: 13px; margin: 0 0 10px 0;">Start date: <strong>${data.startDate}</strong></p>

              ${messageHtml}
            </td>
          </tr>

          ${viewButton}

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                ${branding.companyName}
                ${branding.companyPhone ? ` | ${branding.companyPhone}` : ''}
                ${branding.companyEmail ? ` | ${branding.companyEmail}` : ''}
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

export function buildContractSentSubject(contractNumber: string, title: string): string {
  return `Contract ${contractNumber}: ${title}`;
}
