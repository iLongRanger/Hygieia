import type { GlobalBranding } from '../types/branding';

interface TeamAssignedEmailData {
  contractNumber: string;
  title: string;
  subcontractPay: string;
  startDate: string;
  serviceFrequency: string;
  facilityName: string;
  facilityAddress: string;
  buildingType: string;
  teamName: string;
  proposalServices: Array<{ serviceName: string; frequency: string; description?: string | null }>;
  facilityTasks: Array<{ name: string; area?: string; frequency: string }>;
}

function buildServiceRows(services: TeamAssignedEmailData['proposalServices']): string {
  if (!services.length) return '<tr><td colspan="2" style="padding: 6px 8px; color: #999;">No services listed</td></tr>';
  return services
    .map(
      (s) =>
        `<tr>
          <td style="padding: 6px 8px; border-bottom: 1px solid #eee;">${s.serviceName}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #eee;">${s.frequency}</td>
        </tr>`
    )
    .join('');
}

function buildTaskRows(tasks: TeamAssignedEmailData['facilityTasks']): string {
  if (!tasks.length) return '<tr><td colspan="3" style="padding: 6px 8px; color: #999;">No tasks listed</td></tr>';
  return tasks
    .map(
      (t) =>
        `<tr>
          <td style="padding: 6px 8px; border-bottom: 1px solid #eee;">${t.name}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #eee;">${t.area || '—'}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #eee;">${t.frequency}</td>
        </tr>`
    )
    .join('');
}

export function buildContractTeamAssignedHtmlWithBranding(
  data: TeamAssignedEmailData,
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

          <!-- Header -->
          <tr>
            <td style="background-color: ${branding.themePrimaryColor}; padding: 30px; text-align: center;">
              ${logoBlock}
              <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Team Assignment</h1>
              <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Contract ${data.contractNumber}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 30px;">

              <!-- Contract Details -->
              <p style="color: #333; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
                <strong>${data.teamName}</strong> has been assigned to contract <strong>${data.contractNumber}</strong> — "${data.title}".
              </p>

              <table cellpadding="8" cellspacing="0" style="margin: 0 0 24px; background-color: #f0fdf4; border-radius: 6px; width: 100%;">
                <tr><td style="color: #666; font-size: 13px; width: 140px;">Contract</td><td style="font-weight: bold;">${data.contractNumber}</td></tr>
                <tr><td style="color: #666; font-size: 13px;">Title</td><td style="font-weight: bold;">${data.title}</td></tr>
                <tr><td style="color: #666; font-size: 13px;">Start Date</td><td style="font-weight: bold;">${data.startDate}</td></tr>
                <tr><td style="color: #666; font-size: 13px;">Frequency</td><td style="font-weight: bold;">${data.serviceFrequency}</td></tr>
              </table>

              <!-- Facility Info -->
              <h3 style="color: #333; font-size: 15px; margin: 0 0 10px; border-bottom: 2px solid ${branding.themePrimaryColor}; padding-bottom: 6px;">Facility</h3>
              <table cellpadding="8" cellspacing="0" style="margin: 0 0 24px; width: 100%;">
                <tr><td style="color: #666; font-size: 13px; width: 140px;">Name</td><td style="font-weight: bold;">${data.facilityName}</td></tr>
                <tr><td style="color: #666; font-size: 13px;">Address</td><td>${data.facilityAddress}</td></tr>
                <tr><td style="color: #666; font-size: 13px;">Building Type</td><td>${data.buildingType}</td></tr>
              </table>

              <!-- Subcontract Pay -->
              <div style="background-color: #e0f2fe; border-radius: 8px; padding: 20px; text-align: center; margin: 0 0 24px;">
                <div style="color: #0369a1; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Subcontract Pay</div>
                <div style="color: #0c4a6e; font-size: 28px; font-weight: bold;">${data.subcontractPay}/month</div>
              </div>

              <!-- Scope of Work -->
              <h3 style="color: #333; font-size: 15px; margin: 0 0 10px; border-bottom: 2px solid ${branding.themePrimaryColor}; padding-bottom: 6px;">Scope of Work</h3>
              <table cellpadding="0" cellspacing="0" style="margin: 0 0 24px; width: 100%; font-size: 13px;">
                <tr style="background-color: #f8f8f8;">
                  <th style="padding: 8px; text-align: left; color: #666;">Service</th>
                  <th style="padding: 8px; text-align: left; color: #666;">Frequency</th>
                </tr>
                ${buildServiceRows(data.proposalServices)}
              </table>

              <!-- Task Checklist -->
              <h3 style="color: #333; font-size: 15px; margin: 0 0 10px; border-bottom: 2px solid ${branding.themePrimaryColor}; padding-bottom: 6px;">Task Checklist</h3>
              <table cellpadding="0" cellspacing="0" style="margin: 0 0 24px; width: 100%; font-size: 13px;">
                <tr style="background-color: #f8f8f8;">
                  <th style="padding: 8px; text-align: left; color: #666;">Task</th>
                  <th style="padding: 8px; text-align: left; color: #666;">Area</th>
                  <th style="padding: 8px; text-align: left; color: #666;">Frequency</th>
                </tr>
                ${buildTaskRows(data.facilityTasks)}
              </table>

            </td>
          </tr>

          <!-- Footer -->
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

export function buildContractTeamAssignedSubject(contractNumber: string, teamName: string): string {
  return `Team Assigned: ${teamName} — Contract ${contractNumber}`;
}
