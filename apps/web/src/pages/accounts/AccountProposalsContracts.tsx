import { FileText, FileSignature, ChevronRight } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  CONTRACT_STATUS_VARIANTS,
  PROPOSAL_STATUS_VARIANTS,
  formatCurrency,
  formatShortDate,
} from './account-constants';
import type { Proposal } from '../../types/proposal';
import type { Contract } from '../../types/contract';

interface AccountProposalsContractsProps {
  accountId: string;
  proposals: Proposal[];
  contracts: Contract[];
  proposalTotal: number;
  contractTotal: number;
  activeContract: Contract | null;
  onNavigate: (path: string) => void;
}

export function AccountProposalsContracts({
  accountId,
  proposals,
  contracts,
  proposalTotal,
  contractTotal,
  activeContract,
  onNavigate,
}: AccountProposalsContractsProps) {
  const recentProposals = proposals.slice(0, 3);
  const activeAndRecentContracts: Contract[] = (() => {
    const seen = new Set<string>();
    const list: Contract[] = [];
    if (activeContract) {
      list.push(activeContract);
      seen.add(activeContract.id);
    }
    for (const contract of contracts) {
      if (list.length >= 3) break;
      if (seen.has(contract.id)) continue;
      list.push(contract);
      seen.add(contract.id);
    }
    return list;
  })();

  const totalProposalValue = proposals.reduce(
    (sum, proposal) => sum + (Number(proposal.totalAmount) || 0),
    0
  );
  const totalContractValue = contracts.reduce(
    (sum, contract) => sum + (Number(contract.monthlyValue) || 0),
    0
  );

  return (
    <Card className="p-5 space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-surface-900 dark:text-white">Proposals &amp; Contracts</h3>
        <p className="mt-0.5 text-sm text-surface-500 dark:text-surface-400">
          Deal pipeline and active commitments for this account.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-surface-700 dark:text-surface-200">
              <FileText className="h-4 w-4" />
              <h4 className="text-sm font-medium">Proposals</h4>
              <span className="text-xs text-surface-500">({proposalTotal})</span>
            </div>
            {proposalTotal > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate(`/proposals?accountId=${accountId}`)}
              >
                View all
              </Button>
            )}
          </div>
          {recentProposals.length === 0 ? (
            <p className="rounded-lg border border-dashed border-surface-200 p-4 text-center text-sm text-surface-500 dark:border-surface-700">
              No proposals yet
            </p>
          ) : (
            <ul className="space-y-2">
              {recentProposals.map((proposal) => (
                <li key={proposal.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate(`/proposals/${proposal.id}`)}
                    className="group flex w-full items-center gap-2 rounded-lg border border-surface-200 p-3 text-left transition-colors hover:border-surface-300 hover:bg-surface-50 dark:border-surface-700 dark:hover:border-surface-600 dark:hover:bg-surface-900/40"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium text-surface-900 dark:text-white">
                          {proposal.proposalNumber}
                        </span>
                        <Badge variant={PROPOSAL_STATUS_VARIANTS[proposal.status]} size="sm">
                          {proposal.status}
                        </Badge>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-surface-500 dark:text-surface-400">
                        {proposal.title}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between text-xs">
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(proposal.totalAmount)}
                        </span>
                        <span className="text-surface-500">{formatShortDate(proposal.createdAt)}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-surface-400 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-surface-700 dark:text-surface-200">
              <FileSignature className="h-4 w-4" />
              <h4 className="text-sm font-medium">Contracts</h4>
              <span className="text-xs text-surface-500">({contractTotal})</span>
            </div>
            {contractTotal > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate(`/contracts?accountId=${accountId}`)}
              >
                View all
              </Button>
            )}
          </div>
          {activeAndRecentContracts.length === 0 ? (
            <p className="rounded-lg border border-dashed border-surface-200 p-4 text-center text-sm text-surface-500 dark:border-surface-700">
              No contracts yet
            </p>
          ) : (
            <ul className="space-y-2">
              {activeAndRecentContracts.map((contract) => {
                const isActive = contract.id === activeContract?.id;
                return (
                  <li key={contract.id}>
                    <button
                      type="button"
                      onClick={() => onNavigate(`/contracts/${contract.id}`)}
                      className="group flex w-full items-center gap-2 rounded-lg border border-surface-200 p-3 text-left transition-colors hover:border-surface-300 hover:bg-surface-50 dark:border-surface-700 dark:hover:border-surface-600 dark:hover:bg-surface-900/40"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium text-surface-900 dark:text-white">
                            {contract.contractNumber}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {isActive && (
                              <Badge variant="success" size="sm">
                                Active
                              </Badge>
                            )}
                            <Badge variant={CONTRACT_STATUS_VARIANTS[contract.status]} size="sm">
                              {contract.status}
                            </Badge>
                          </div>
                        </div>
                        <p className="mt-0.5 truncate text-sm text-surface-500 dark:text-surface-400">
                          {contract.title}
                        </p>
                        <div className="mt-1.5 flex items-center justify-between text-xs">
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(contract.monthlyValue)}/mo
                          </span>
                          <span className="text-surface-500">
                            {formatShortDate(contract.startDate)}
                            {contract.endDate ? ` – ${formatShortDate(contract.endDate)}` : ''}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-surface-400 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {(proposalTotal > 0 || contractTotal > 0) && (
        <div className="grid grid-cols-2 gap-4 border-t border-surface-200 pt-4 dark:border-surface-700">
          <div>
            <div className="text-xs uppercase tracking-wide text-surface-500">Total Proposal Value</div>
            <div className="mt-1 text-base font-semibold text-surface-900 dark:text-white">
              {formatCurrency(totalProposalValue)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-surface-500">Total Monthly Contracts</div>
            <div className="mt-1 text-base font-semibold text-surface-900 dark:text-white">
              {formatCurrency(totalContractValue)}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
