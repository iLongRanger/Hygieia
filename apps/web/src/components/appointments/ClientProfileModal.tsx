import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building,
  Mail,
  Phone,
  User as UserIcon,
  MapPin,
  FileText,
  FileSignature,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { getAccount } from '../../lib/accounts';
import { getLead } from '../../lib/leads';
import { listFacilities } from '../../lib/facilities';
import { listProposals } from '../../lib/proposals';
import { listContracts } from '../../lib/contracts';
import type { Account, Lead } from '../../types/crm';
import type { Facility } from '../../types/facility';
import type { Proposal } from '../../types/proposal';
import type { Contract, ContractStatus } from '../../types/contract';

interface ClientProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId?: string | null;
  accountId?: string | null;
}

const CONTRACT_STATUS_VARIANTS: Record<
  ContractStatus,
  'default' | 'success' | 'warning' | 'error' | 'info'
> = {
  draft: 'default',
  sent: 'info',
  viewed: 'info',
  pending_signature: 'warning',
  active: 'success',
  expired: 'default',
  terminated: 'error',
  renewed: 'info',
};

const PROPOSAL_STATUS_VARIANTS: Record<
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

export const ClientProfileModal = ({
  isOpen,
  onClose,
  leadId,
  accountId,
}: ClientProfileModalProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState<Lead | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);

  const fetchData = useCallback(async () => {
    if (!isOpen) return;

    setLoading(true);
    setLead(null);
    setAccount(null);
    setFacilities([]);
    setProposals([]);
    setContracts([]);

    try {
      // If we have a lead ID, fetch lead data first
      if (leadId) {
        const leadData = await getLead(leadId);
        setLead(leadData);

        // If lead is converted, also fetch account data
        if (leadData.convertedToAccountId) {
          const accountData = await getAccount(leadData.convertedToAccountId);
          setAccount(accountData);

          // Fetch related data for the converted account
          const [facilitiesRes, proposalsRes, contractsRes] = await Promise.all([
            listFacilities({ accountId: leadData.convertedToAccountId, limit: 5 }),
            listProposals({ accountId: leadData.convertedToAccountId, limit: 5, includeArchived: false }),
            listContracts({ accountId: leadData.convertedToAccountId, limit: 5, includeArchived: false }),
          ]);

          setFacilities(facilitiesRes?.data || []);
          setProposals(proposalsRes?.data || []);
          setContracts(contractsRes?.data || []);
        }
      } else if (accountId) {
        // Fetch account data directly
        const accountData = await getAccount(accountId);
        setAccount(accountData);

        // Fetch related data
        const [facilitiesRes, proposalsRes, contractsRes] = await Promise.all([
          listFacilities({ accountId, limit: 5 }),
          listProposals({ accountId, limit: 5, includeArchived: false }),
          listContracts({ accountId, limit: 5, includeArchived: false }),
        ]);

        setFacilities(facilitiesRes?.data || []);
        setProposals(proposalsRes?.data || []);
        setContracts(contractsRes?.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch client data:', error);
    } finally {
      setLoading(false);
    }
  }, [isOpen, leadId, accountId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (value: number | string) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(typeof value === 'string' ? parseFloat(value) : value);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getLeadStatusVariant = (status: string) => {
    switch (status) {
      case 'converted':
        return 'success';
      case 'qualified':
        return 'info';
      case 'proposal_sent':
        return 'warning';
      case 'lost':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleViewFull = () => {
    onClose();
    if (accountId) {
      navigate(`/accounts/${accountId}`);
    } else if (leadId) {
      navigate(`/leads/${leadId}`);
    }
  };

  const clientName = lead?.companyName || lead?.contactName || account?.name || 'Client';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={clientName} size="xl">
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Lead Info (if applicable) */}
          {lead && !lead.convertedToAccountId && (
            <Card noPadding className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
                  <UserIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-surface-900 dark:text-surface-100">
                    {lead.companyName || lead.contactName}
                  </div>
                  <Badge variant={getLeadStatusVariant(lead.status)}>
                    {lead.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div className="flex items-center gap-2 text-surface-600 dark:text-surface-400">
                  <UserIcon className="h-4 w-4" />
                  <span>{lead.contactName}</span>
                </div>
                {lead.primaryEmail && (
                  <div className="flex items-center gap-2 text-surface-600 dark:text-surface-400">
                    <Mail className="h-4 w-4" />
                    <span>{lead.primaryEmail}</span>
                  </div>
                )}
                {lead.primaryPhone && (
                  <div className="flex items-center gap-2 text-surface-600 dark:text-surface-400">
                    <Phone className="h-4 w-4" />
                    <span>{lead.primaryPhone}</span>
                  </div>
                )}
                {lead.estimatedValue && (
                  <div className="flex items-center gap-2 text-surface-600 dark:text-surface-400">
                    <FileText className="h-4 w-4" />
                    <span>Est. Value: {formatCurrency(lead.estimatedValue)}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                This is an unconverted lead. Convert to an account to manage facilities, proposals, and contracts.
              </div>
            </Card>
          )}

          {/* Account Info */}
          {account && (
            <Card noPadding className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
                  <Building className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-surface-900 dark:text-surface-100">
                    {account.name}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={account.type === 'commercial' ? 'info' : 'success'}>
                      {account.type}
                    </Badge>
                    {account.industry && (
                      <span className="text-sm text-surface-500 dark:text-surface-400 capitalize">
                        {account.industry}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                {account.billingEmail && (
                  <div className="flex items-center gap-2 text-surface-600 dark:text-surface-400">
                    <Mail className="h-4 w-4" />
                    <span>{account.billingEmail}</span>
                  </div>
                )}
                {account.billingPhone && (
                  <div className="flex items-center gap-2 text-surface-600 dark:text-surface-400">
                    <Phone className="h-4 w-4" />
                    <span>{account.billingPhone}</span>
                  </div>
                )}
                {account.accountManager && (
                  <div className="flex items-center gap-2 text-surface-600 dark:text-surface-400">
                    <UserIcon className="h-4 w-4" />
                    <span>Manager: {account.accountManager.fullName}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-surface-600 dark:text-surface-400">
                  <span>Payment: {account.paymentTerms?.replace('_', ' ') || 'NET30'}</span>
                </div>
              </div>
            </Card>
          )}

          {/* Quick Stats (only for accounts) */}
          {account && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Card noPadding className="p-4 text-center">
                <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {facilities.length}
                </div>
                <div className="text-sm text-surface-500 dark:text-surface-400">Facilities</div>
              </Card>
              <Card noPadding className="p-4 text-center">
                <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {proposals.length}
                </div>
                <div className="text-sm text-surface-500 dark:text-surface-400">Proposals</div>
              </Card>
              <Card noPadding className="p-4 text-center">
                <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {contracts.filter((c) => c.status === 'active').length}
                </div>
                <div className="text-sm text-surface-500 dark:text-surface-400">Active Contracts</div>
              </Card>
              <Card noPadding className="p-4 text-center">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(
                    contracts
                      .filter((c) => c.status === 'active')
                      .reduce((sum, c) => sum + parseFloat(String(c.monthlyValue) || '0'), 0)
                  )}
                </div>
                <div className="text-sm text-surface-500 dark:text-surface-400">Monthly Value</div>
              </Card>
            </div>
          )}

          {/* Facilities Section */}
          {account && facilities.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                <h3 className="font-semibold text-surface-900 dark:text-surface-100">
                  Facilities
                </h3>
              </div>
              <div className="space-y-2">
                {facilities.map((facility) => (
                  <div
                    key={facility.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-800/50"
                  >
                    <div>
                      <div className="font-medium text-surface-900 dark:text-surface-100">
                        {facility.name}
                      </div>
                      <div className="text-sm text-surface-500 dark:text-surface-400">
                        {[facility.address?.city, facility.address?.state]
                          .filter(Boolean)
                          .join(', ') || 'No address'}
                      </div>
                    </div>
                    <Badge
                      variant={
                        facility.status === 'active'
                          ? 'success'
                          : facility.status === 'pending'
                          ? 'warning'
                          : 'default'
                      }
                    >
                      {facility.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Proposals Section */}
          {account && proposals.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                <h3 className="font-semibold text-surface-900 dark:text-surface-100">
                  Recent Proposals
                </h3>
              </div>
              <div className="space-y-2">
                {proposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-800/50"
                  >
                    <div>
                      <div className="font-medium text-surface-900 dark:text-surface-100">
                        {proposal.proposalNumber}
                      </div>
                      <div className="text-sm text-surface-500 dark:text-surface-400">
                        {proposal.title} - {formatDate(proposal.createdAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(proposal.totalAmount)}
                      </span>
                      <Badge variant={PROPOSAL_STATUS_VARIANTS[proposal.status]}>
                        {proposal.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contracts Section */}
          {account && contracts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileSignature className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                <h3 className="font-semibold text-surface-900 dark:text-surface-100">
                  Contracts
                </h3>
              </div>
              <div className="space-y-2">
                {contracts.map((contract) => (
                  <div
                    key={contract.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-800/50"
                  >
                    <div>
                      <div className="font-medium text-surface-900 dark:text-surface-100">
                        {contract.contractNumber}
                      </div>
                      <div className="text-sm text-surface-500 dark:text-surface-400">
                        {contract.title} - {formatDate(contract.startDate)} to {formatDate(contract.endDate)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(contract.monthlyValue)}/mo
                      </span>
                      <Badge variant={CONTRACT_STATUS_VARIANTS[contract.status]}>
                        {contract.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-surface-200 dark:border-surface-700">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button onClick={handleViewFull}>
              <ExternalLink className="mr-2 h-4 w-4" />
              View Full Profile
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
