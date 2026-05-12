import type { GlobalBranding } from '../types/branding';
import { escapeHtml } from '../utils/escapeHtml';

interface ContractSignedEmailData {
  contractNumber: string;
  title: string;
  accountName: string;
  signedByName: string;
  signedByEmail: string;
  monthlyValue?: string | null;
  signedAt: string;
}

function safeColor(value: string | null | undefined, fallback: string): string {
  return value || fallback;
}

export function buildContractSignedHtmlWithBranding(
  data: ContractSignedEmailData,
  branding: GlobalBranding
): string {
  const primary = safeColor(branding.themePrimaryColor, '#0f172a');
  const accent = safeColor(branding.themeAccentColor, '#16a34a');
  const companyName = branding.companyName || 'Hygieia';
  const logoBlock = branding.logoDataUrl
    ? `<img src="${branding.logoDataUrl}" alt="${escapeHtml(companyName)} logo" style="max-height: 56px; margin-bottom: 12px;" />`
    : '';
  const monthlyValueRow = data.monthlyValue
    ? `<tr><td style="color: #64748b; font-size: 13px; padding: 8px 0;">Monthly Value</td><td style="font-weight: 700; color: #0f172a; padding: 8px 0; text-align: right;">${escapeHtml(data.monthlyValue)}</td></tr>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: Arial, Helvetica, sans-serif;">
  <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" width="620" style="background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 18px 45px rgba(15, 23, 42, 0.12);">
          <tr>
            <td style="background: linear-gradient(135deg, ${primary}, ${accent}); padding: 34px 30px; text-align: center;">
              ${logoBlock}
              <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.16); border: 1px solid rgba(255,255,255,0.28); color: #ffffff; border-radius: 999px; padding: 6px 12px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">
                New Signed Contract
              </div>
              <h1 style="color: #ffffff; margin: 16px 0 8px; font-size: 30px; line-height: 1.15;">Client Signed. Time to Activate.</h1>
              <p style="color: rgba(255, 255, 255, 0.88); margin: 0; font-size: 15px;">A client has approved the service agreement online.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="color: #334155; font-size: 15px; line-height: 1.7; margin: 0 0 18px;">
                <strong>${escapeHtml(data.signedByName)}</strong> signed contract
                <strong>${escapeHtml(data.contractNumber)}</strong> for
                <strong>${escapeHtml(data.accountName)}</strong>.
              </p>

              <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 18px; margin: 0 0 20px;">
                <tr><td style="color: #64748b; font-size: 13px; padding: 8px 0;">Contract</td><td style="font-weight: 700; color: #0f172a; padding: 8px 0; text-align: right;">${escapeHtml(data.contractNumber)}</td></tr>
                <tr><td style="color: #64748b; font-size: 13px; padding: 8px 0;">Title</td><td style="font-weight: 700; color: #0f172a; padding: 8px 0; text-align: right;">${escapeHtml(data.title)}</td></tr>
                <tr><td style="color: #64748b; font-size: 13px; padding: 8px 0;">Client</td><td style="font-weight: 700; color: #0f172a; padding: 8px 0; text-align: right;">${escapeHtml(data.accountName)}</td></tr>
                ${monthlyValueRow}
                <tr><td style="color: #64748b; font-size: 13px; padding: 8px 0;">Signed By</td><td style="font-weight: 700; color: #0f172a; padding: 8px 0; text-align: right;">${escapeHtml(data.signedByName)}</td></tr>
                <tr><td style="color: #64748b; font-size: 13px; padding: 8px 0;">Signer Email</td><td style="font-weight: 700; color: #0f172a; padding: 8px 0; text-align: right;">${escapeHtml(data.signedByEmail)}</td></tr>
                <tr><td style="color: #64748b; font-size: 13px; padding: 8px 0;">Signed At</td><td style="font-weight: 700; color: #0f172a; padding: 8px 0; text-align: right;">${escapeHtml(data.signedAt)}</td></tr>
              </table>

              <div style="background-color: #ecfdf5; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px 18px;">
                <p style="color: #166534; font-size: 14px; line-height: 1.6; margin: 0;">
                  Next step: review the signed contract, assign the service team if needed, then activate the contract to start service and billing.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 18px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">${escapeHtml(companyName)} contract notification</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildContractSignedSubject(contractNumber: string, accountName: string): string {
  return `Contract signed: ${contractNumber} for ${accountName}`;
}
