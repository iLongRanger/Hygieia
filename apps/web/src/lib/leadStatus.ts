export const LEAD_STATUS_LABELS: Record<string, string> = {
  lead: 'Lead',
  walk_through_booked: 'Walk Through Booked',
  walk_through_completed: 'Walk Through Completed',
  proposal_sent: 'Proposal Sent',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
  reopened: 'Reopened',
};

export function getLeadStatusLabel(status: string): string {
  return LEAD_STATUS_LABELS[status] ?? status;
}
