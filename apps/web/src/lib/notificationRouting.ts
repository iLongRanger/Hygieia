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

function getStringDeep(value: unknown, keys: string[]): string | null {
  if (!value) return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = getStringDeep(item, keys);
      if (found) return found;
    }
    return null;
  }

  if (typeof value !== 'object') return null;

  const meta = value as Metadata;
  const direct = getString(meta, keys);
  if (direct) return direct;

  for (const nested of Object.values(meta)) {
    const found = getStringDeep(nested, keys);
    if (found) return found;
  }

  return null;
}

export function getNotificationRoute(notification: Notification): string | null {
  const meta = toMetadata(notification.metadata);

  const inspectionId = getStringDeep(meta, ['inspectionId', 'inspection_id']);
  if (inspectionId) return `/inspections/${inspectionId}`;

  const proposalId = getStringDeep(meta, ['proposalId', 'proposal_id']);
  if (proposalId) return `/proposals/${proposalId}`;

  const contractId = getStringDeep(meta, ['contractId', 'contract_id']);
  if (contractId) return `/contracts/${contractId}`;

  const quotationId = getStringDeep(meta, ['quotationId', 'quotation_id']);
  if (quotationId) return `/quotations/${quotationId}`;

  const leadId = getStringDeep(meta, ['leadId', 'lead_id']);
  if (leadId) return `/leads/${leadId}`;

  const jobId = getStringDeep(meta, ['jobId', 'job_id']);
  if (jobId) return `/jobs/${jobId}`;

  const facilityId = getStringDeep(meta, ['facilityId', 'facility_id']);
  if (facilityId) return `/facilities/${facilityId}`;

  const appointmentId = getStringDeep(meta, ['appointmentId', 'appointment_id']);
  if (appointmentId) return `/appointments/${appointmentId}`;

  return null;
}
