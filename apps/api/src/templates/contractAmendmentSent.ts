import type { GlobalBranding } from '../types/branding';
import { escapeHtml } from '../utils/escapeHtml';

interface ContractAmendmentSentEmailData {
  amendmentNumber: number;
  title: string;
  contractNumber: string;
  accountName: string;
  newMonthlyValue: string;
  effectiveDate: string;
  recipientName?: string;
  publicViewUrl?: string;
}

export function buildContractAmendmentSentHtmlWithBranding(
  data: ContractAmendmentSentEmailData,
  branding: GlobalBranding
): string {
  const viewButton = data.publicViewUrl
    ? `
      <tr>
        <td style="padding: 20px 0; text-align: center;">
          <a href="${data.publicViewUrl}"
             style="background-color: ${branding.themeAccentColor}; color: ${branding.themePrimaryColor}; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
            Review &amp; Sign Amendment
          </a>
        </td>
      </tr>`
    : '';
  const logoBlock = branding.logoDataUrl
    ? `<img src="${branding.logoDataUrl}" alt="${branding.companyName} logo" style="max-height: 64px; margin-bottom: 12px;" />`
    : '';
  const recipientName = data.recipientName?.trim() || data.accountName;

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
          <tr>
            <td style="background-color: ${branding.themePrimaryColor}; padding: 30px; text-align: center;">
              ${logoBlock}
              <h1 style="color: ${branding.themeAccentColor}; margin: 0; font-size: 24px;">${branding.companyName}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <h2 style="color: ${branding.themePrimaryColor}; margin: 0 0 10px 0; font-size: 20px;">Contract Amendment: ${escapeHtml(data.title)}</h2>
              <p style="color: #666; margin: 0 0 20px 0; font-size: 14px;">#${data.amendmentNumber} for ${escapeHtml(data.contractNumber)}</p>
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 12px; background-color: #f8f8f8; border-radius: 6px;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="color: #666; font-size: 13px; padding-bottom: 4px;">Prepared for</td>
                        <td style="color: #666; font-size: 13px; padding-bottom: 4px; text-align: right;">Updated Monthly Value</td>
                      </tr>
                      <tr>
                        <td style="color: ${branding.themePrimaryColor}; font-size: 16px; font-weight: bold;">${escapeHtml(data.accountName)}</td>
                        <td style="color: ${branding.themePrimaryColor}; font-size: 16px; font-weight: bold; text-align: right;">${data.newMonthlyValue}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="color: #666; font-size: 13px; margin: 0 0 10px 0;">Effective date: <strong>${escapeHtml(data.effectiveDate)}</strong></p>
              <p style="color: #333; font-size: 14px; line-height: 1.6;">Dear ${escapeHtml(recipientName)},</p>
              <p style="color: #333; font-size: 14px; line-height: 1.6;">
                Please review the attached amendment for contract <strong>${escapeHtml(data.contractNumber)}</strong>.
                You can also review the full amendment details and sign online using the button below.
              </p>
            </td>
          </tr>
          ${viewButton}
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

export function buildContractAmendmentSentSubject(amendmentNumber: number, title: string): string {
  return `Contract Amendment #${amendmentNumber}: ${title}`;
}
