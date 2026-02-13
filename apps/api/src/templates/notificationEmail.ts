import type { GlobalBranding } from '../types/branding';

interface NotificationEmailData {
  title: string;
  body: string | null;
  actionUrl?: string | null;
  actionLabel?: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildNotificationEmailHtml(
  data: NotificationEmailData,
  branding: GlobalBranding
): string {
  const logoBlock = branding.logoDataUrl
    ? `<img src="${branding.logoDataUrl}" alt="${branding.companyName} logo" style="max-height: 56px; margin-bottom: 12px;" />`
    : '';

  const actionBlock =
    data.actionUrl && data.actionLabel
      ? `<p style="text-align: center; margin: 20px 0;">
          <a href="${data.actionUrl}" style="display: inline-block; background-color: ${branding.themePrimaryColor}; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: bold;">
            ${escapeHtml(data.actionLabel)}
          </a>
        </p>`
      : '';

  const bodyBlock = data.body
    ? `<p style="color: #555; font-size: 14px; line-height: 1.6;">${escapeHtml(data.body)}</p>`
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
              <h1 style="color: #ffffff; margin: 0; font-size: 22px;">${escapeHtml(data.title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              ${bodyBlock}
              ${actionBlock}
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
