import { companyConfig } from '../config/company';
import type { GlobalBranding } from '../types/branding';

interface ProposalEmailData {
  proposalNumber: string;
  title: string;
  accountName: string;
  totalAmount: string;
  validUntil: string | null;
  publicViewUrl?: string;
}

export function buildProposalEmailHtml(data: ProposalEmailData): string {
  const branding: GlobalBranding = {
    companyName: companyConfig.name,
    companyAddress: companyConfig.address || null,
    companyPhone: companyConfig.phone || null,
    companyEmail: companyConfig.email || null,
    companyWebsite: companyConfig.website || null,
    logoDataUrl: companyConfig.logoPath || null,
    themePrimaryColor: '#1a1a2e',
    themeAccentColor: '#d4af37',
    themeBackgroundColor: '#f5f5f5',
    themeTextColor: '#333333',
  };
  return buildProposalEmailHtmlWithBranding(data, branding);
}

export function buildProposalEmailHtmlWithBranding(
  data: ProposalEmailData,
  branding: GlobalBranding
): string {
  const viewButton = data.publicViewUrl
    ? `
      <tr>
        <td style="padding: 20px 0; text-align: center;">
          <a href="${data.publicViewUrl}"
             style="background-color: ${branding.themeAccentColor}; color: ${branding.themePrimaryColor}; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
            View Proposal Online
          </a>
        </td>
      </tr>`
    : '';
  const logoBlock = branding.logoDataUrl
    ? `<img src="${branding.logoDataUrl}" alt="${branding.companyName} logo" style="max-height: 64px; margin-bottom: 12px;" />`
    : '';

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
              <h2 style="color: ${branding.themePrimaryColor}; margin: 0 0 10px 0; font-size: 20px;">Proposal: ${data.title}</h2>
              <p style="color: #666; margin: 0 0 20px 0; font-size: 14px;">${data.proposalNumber}</p>

              <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 12px; background-color: #f8f8f8; border-radius: 6px;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="color: #666; font-size: 13px; padding-bottom: 4px;">Prepared for</td>
                        <td style="color: #666; font-size: 13px; padding-bottom: 4px; text-align: right;">Total Amount</td>
                      </tr>
                      <tr>
                        <td style="color: ${branding.themePrimaryColor}; font-size: 16px; font-weight: bold;">${data.accountName}</td>
                        <td style="color: ${branding.themePrimaryColor}; font-size: 16px; font-weight: bold; text-align: right;">${data.totalAmount}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${data.validUntil ? `<p style="color: #666; font-size: 13px; margin: 0 0 10px 0;">Valid until: <strong>${data.validUntil}</strong></p>` : ''}

              <p style="color: #333; font-size: 14px; line-height: 1.6;">
                Please find the attached proposal for your review. You can also view the full proposal details online using the button below.
              </p>
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

export function buildProposalEmailSubject(proposalNumber: string, title: string): string {
  return `Proposal ${proposalNumber}: ${title}`;
}
