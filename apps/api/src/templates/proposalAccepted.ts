import { companyConfig } from '../config/company';
import type { GlobalBranding } from '../types/branding';

interface AcceptedEmailData {
  proposalNumber: string;
  title: string;
  accountName: string;
  totalAmount: string;
  acceptedAt: string;
  signatureName?: string | null;
}

export function buildProposalAcceptedHtml(data: AcceptedEmailData): string {
  const branding: GlobalBranding = {
    companyName: companyConfig.name,
    companyAddress: companyConfig.address || null,
    companyPhone: companyConfig.phone || null,
    companyEmail: companyConfig.email || null,
    companyWebsite: companyConfig.website || null,
    logoDataUrl: companyConfig.logoPath || null,
    themePrimaryColor: '#166534',
    themeAccentColor: '#ffffff',
    themeBackgroundColor: '#f5f5f5',
    themeTextColor: '#333333',
  };

  return buildProposalAcceptedHtmlWithBranding(data, branding);
}

export function buildProposalAcceptedHtmlWithBranding(
  data: AcceptedEmailData,
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
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Proposal Accepted</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="color: #333; font-size: 14px; line-height: 1.6;">
                Great news! The proposal <strong>${data.proposalNumber}</strong> - "${data.title}" has been accepted.
              </p>
              <table cellpadding="8" cellspacing="0" style="margin: 15px 0; background-color: #f0fdf4; border-radius: 6px; width: 100%;">
                <tr><td style="color: #666; font-size: 13px;">Client</td><td style="font-weight: bold;">${data.accountName}</td></tr>
                <tr><td style="color: #666; font-size: 13px;">Total</td><td style="font-weight: bold;">${data.totalAmount}</td></tr>
                <tr><td style="color: #666; font-size: 13px;">Accepted</td><td style="font-weight: bold;">${data.acceptedAt}</td></tr>
                ${data.signatureName ? `<tr><td style="color: #666; font-size: 13px;">Signed by</td><td style="font-weight: bold;">${data.signatureName}</td></tr>` : ''}
              </table>
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

export function buildProposalAcceptedSubject(proposalNumber: string): string {
  return `Proposal ${proposalNumber} has been accepted!`;
}
