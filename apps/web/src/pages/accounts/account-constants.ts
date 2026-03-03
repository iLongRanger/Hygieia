import type { Proposal } from '../../types/proposal';
import type { ContractStatus } from '../../types/contract';

export const ACCOUNT_TYPES = [
  { value: 'commercial', label: 'Commercial' },
  { value: 'residential', label: 'Residential' },
];

export const INDUSTRIES = [
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'retail', label: 'Retail' },
  { value: 'office', label: 'Office' },
  { value: 'education', label: 'Education' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'government', label: 'Government' },
  { value: 'other', label: 'Other' },
];

export const PAYMENT_TERMS = [
  { value: 'NET15', label: 'Net 15' },
  { value: 'NET30', label: 'Net 30' },
  { value: 'NET45', label: 'Net 45' },
  { value: 'NET60', label: 'Net 60' },
  { value: 'DUE_ON_RECEIPT', label: 'Due on Receipt' },
];

export const BUILDING_TYPES = [
  { value: 'office', label: 'Office' },
  { value: 'retail', label: 'Retail' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'medical', label: 'Medical' },
  { value: 'educational', label: 'Educational' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'residential', label: 'Residential' },
  { value: 'other', label: 'Other' },
];

export const FACILITY_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
];

export const CONTRACT_STATUS_VARIANTS: Record<
  ContractStatus,
  'default' | 'success' | 'warning' | 'error' | 'info'
> = {
  draft: 'default',
  sent: 'info',
  viewed: 'info',
  pending_signature: 'success',
  active: 'success',
  expired: 'default',
  terminated: 'error',
};

export const PROPOSAL_STATUS_VARIANTS: Record<
  Proposal['status'],
  'default' | 'success' | 'warning' | 'error' | 'info'
> = {
  draft: 'default',
  sent: 'info',
  viewed: 'warning',
  accepted: 'success',
  rejected: 'error',
  expired: 'default',
};

export function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function formatShortDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
  }).format(value);
}

export function getTypeVariant(type: string): 'info' | 'success' | 'default' {
  switch (type) {
    case 'commercial': return 'info';
    case 'residential': return 'success';
    default: return 'default';
  }
}
