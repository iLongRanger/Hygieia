import type { GlobalBranding } from '../types/branding';

interface AppointmentReminderEmailData {
  appointmentType: string;
  scheduledStart: string;
  scheduledEnd: string;
  location: string | null;
  contactName: string;
  companyName: string | null;
  assignedToName: string;
}

function formatType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function buildAppointmentReminderHtml(
  data: AppointmentReminderEmailData,
  branding: GlobalBranding
): string {
  const logoBlock = branding.logoDataUrl
    ? `<img src="${branding.logoDataUrl}" alt="${branding.companyName} logo" style="max-height: 56px; margin-bottom: 12px;" />`
    : '';

  const locationRow = data.location
    ? `<tr><td style="color: #666; font-size: 13px; padding: 6px 8px;">Location</td><td style="font-weight: bold; padding: 6px 8px;">${data.location}</td></tr>`
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
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Appointment Reminder</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="color: #333; font-size: 14px; line-height: 1.6;">
                Hi ${data.assignedToName}, this is a reminder about your upcoming appointment.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin: 15px 0; background-color: #eff6ff; border-radius: 6px; width: 100%;">
                <tr><td style="color: #666; font-size: 13px; padding: 6px 8px;">Type</td><td style="font-weight: bold; padding: 6px 8px;">${formatType(data.appointmentType)}</td></tr>
                <tr><td style="color: #666; font-size: 13px; padding: 6px 8px;">Contact</td><td style="font-weight: bold; padding: 6px 8px;">${data.contactName}${data.companyName ? ` (${data.companyName})` : ''}</td></tr>
                <tr><td style="color: #666; font-size: 13px; padding: 6px 8px;">Start</td><td style="font-weight: bold; padding: 6px 8px;">${data.scheduledStart}</td></tr>
                <tr><td style="color: #666; font-size: 13px; padding: 6px 8px;">End</td><td style="font-weight: bold; padding: 6px 8px;">${data.scheduledEnd}</td></tr>
                ${locationRow}
              </table>
              <p style="color: #666; font-size: 13px; line-height: 1.5;">
                Please make sure to arrive prepared and on time.
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

export function buildAppointmentReminderSubject(
  type: string,
  contactName: string
): string {
  return `Reminder: ${formatType(type)} with ${contactName} tomorrow`;
}
