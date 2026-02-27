import type { Notification } from '../types/crm';

type Metadata = Record<string, unknown>;

function toMetadata(raw: unknown): Metadata {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? (parsed as Metadata) : {};
    } catch {
      return {};
    }
  }
  return typeof raw === 'object' ? (raw as Metadata) : {};
}

function getString(meta: Metadata, keys: string[]): string | null {
  for (const key of keys) {
    const value = meta[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

export function getNotificationRoute(notification: Notification): string | null {
  const meta = toMetadata(notification.metadata);

  const inspectionId = getString(meta, ['inspectionId', 'inspection_id']);
  if (inspectionId) return `/inspections/${inspectionId}`;

  const proposalId = getString(meta, ['proposalId', 'proposal_id']);
  if (proposalId) return `/proposals/${proposalId}`;

  const contractId = getString(meta, ['contractId', 'contract_id']);
  if (contractId) return `/contracts/${contractId}`;

  const quotationId = getString(meta, ['quotationId', 'quotation_id']);
  if (quotationId) return `/quotations/${quotationId}`;

  const leadId = getString(meta, ['leadId', 'lead_id']);
  if (leadId) return `/leads/${leadId}`;

  const jobId = getString(meta, ['jobId', 'job_id']);
  if (jobId) return `/jobs/${jobId}`;

  const facilityId = getString(meta, ['facilityId', 'facility_id']);
  if (facilityId) return `/facilities/${facilityId}`;

  const appointmentId = getString(meta, ['appointmentId', 'appointment_id']);
  if (appointmentId) return `/appointments/${appointmentId}`;

  return null;
}

