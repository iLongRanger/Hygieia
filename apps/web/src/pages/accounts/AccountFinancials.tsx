import React from 'react';
import { DollarSign, FileText, FileSignature } from 'lucide-react';
import type { Account } from '../../types/crm';
import type { Contract } from '../../types/contract';
import type { Proposal } from '../../types/proposal';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  PROPOSAL_STATUS_VARIANTS,
  CONTRACT_STATUS_VARIANTS,
  formatCurrency,
  formatShortDate,
  PAYMENT_TERMS,
} from './account-constants';

interface AccountFinancialsProps {
  account: Account;
  activeContract: Contract | null;
  proposals: Proposal[];
  contracts: Contract[];
  proposalTotal: number;
  contractTotal: number;
  onNavigate: (path: string) => void;
}

function getPaymentTermsLabel(value: string): string {
  const found = PAYMENT_TERMS.find((pt) => pt.value === value);
  return found ? found.label : value;
}

export const AccountFinancials: React.FC<AccountFinancialsProps> = ({
  account,
  activeContract,
  proposals,
  contracts,
  proposalTotal,
  contractTotal,
  onNavigate,
}) => {
  const recentProposals = proposals.slice(0, 5);
  const recentContracts = contracts.slice(0, 5);

  return (
    <div className="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800/30 p-5">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-emerald-400" />
        <h3 className="text-lg font-semibold text-surface-900 dark:text-white">Financial Summary</h3>
      </div>

      {/* Stats Grid */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-surface-500">Monthly Value</p>
          <p className="text-lg font-semibold text-surface-900 dark:text-white">
            {activeContract ? formatCurrency(activeContract.monthlyValue) : '-'}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-surface-500">Payment Terms</p>
          <p className="text-lg font-semibold text-surface-900 dark:text-white">
            {getPaymentTermsLabel(account.paymentTerms)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-surface-500">Total Proposals</p>
          <p className="text-lg font-semibold text-surface-900 dark:text-white">{proposalTotal}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-surface-500">Total Contracts</p>
          <p className="text-lg font-semibold text-surface-900 dark:text-white">{contractTotal}</p>
        </div>
      </div>

      {/* Recent Proposals */}
      <div className="mb-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-surface-500 dark:text-surface-400" />
            <h4 className="text-sm font-medium text-surface-900 dark:text-white">Recent Proposals</h4>
          </div>
          {proposalTotal > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate(`/proposals?accountId=${account.id}`)}
            >
              View all
            </Button>
          )}
        </div>

        {recentProposals.length === 0 ? (
          <p className="py-4 text-center text-sm text-surface-500">No proposals yet</p>
        ) : (
          <div className="space-y-2">
            {recentProposals.map((proposal) => (
              <div
                key={proposal.id}
                className="cursor-pointer rounded-lg bg-surface-100 dark:bg-surface-800/10 p-3 transition-colors hover:bg-surface-100 dark:bg-surface-800/20"
                onClick={() => onNavigate(`/proposals/${proposal.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-surface-900 dark:text-white">{proposal.proposalNumber}</p>
                    <p className="truncate text-sm text-surface-500 dark:text-surface-400">{proposal.title}</p>
                  </div>
                  <Badge variant={PROPOSAL_STATUS_VARIANTS[proposal.status]} size="sm">
                    {proposal.status}
                  </Badge>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-emerald-400">{formatCurrency(proposal.totalAmount)}</span>
                  <span className="text-xs text-surface-500">
                    {formatShortDate(proposal.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Contracts */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <FileSignature className="h-4 w-4 text-surface-500 dark:text-surface-400" />
            <h4 className="text-sm font-medium text-surface-900 dark:text-white">Recent Contracts</h4>
          </div>
          {contractTotal > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate(`/contracts?accountId=${account.id}`)}
            >
              View all
            </Button>
          )}
        </div>

        {recentContracts.length === 0 ? (
          <p className="py-4 text-center text-sm text-surface-500">No contracts yet</p>
        ) : (
          <div className="space-y-2">
            {recentContracts.map((contract) => (
              <div
                key={contract.id}
                className="cursor-pointer rounded-lg bg-surface-100 dark:bg-surface-800/10 p-3 transition-colors hover:bg-surface-100 dark:bg-surface-800/20"
                onClick={() => onNavigate(`/contracts/${contract.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-surface-900 dark:text-white">{contract.contractNumber}</p>
                    <p className="truncate text-sm text-surface-500 dark:text-surface-400">{contract.title}</p>
                  </div>
                  <Badge variant={CONTRACT_STATUS_VARIANTS[contract.status]} size="sm">
                    {contract.status}
                  </Badge>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-emerald-400">
                    {formatCurrency(contract.monthlyValue)}/mo
                  </span>
                  <span className="text-xs text-surface-500">
                    {formatShortDate(contract.startDate)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
