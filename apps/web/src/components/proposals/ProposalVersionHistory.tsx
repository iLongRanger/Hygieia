import React, { useState, useEffect } from 'react';
import { History, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { getProposalVersions, getProposalVersion } from '../../lib/proposals';
import type { ProposalVersionSummary } from '../../types/proposal';

const formatCurrency = (amount: string | number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(amount));
};

const formatDateTime = (date: string) => {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

interface Props {
  proposalId: string;
  refreshTrigger?: number;
}

const ProposalVersionHistory: React.FC<Props> = ({ proposalId, refreshTrigger }) => {
  const [versions, setVersions] = useState<ProposalVersionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);
  const [snapshotData, setSnapshotData] = useState<any>(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);

  useEffect(() => {
    fetchVersions();
  }, [proposalId, refreshTrigger]);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const data = await getProposalVersions(proposalId);
      setVersions(data);
    } catch (error) {
      console.error('Failed to fetch versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleVersion = async (versionNumber: number) => {
    if (expandedVersion === versionNumber) {
      setExpandedVersion(null);
      setSnapshotData(null);
      return;
    }

    setExpandedVersion(versionNumber);
    setLoadingSnapshot(true);
    try {
      const version = await getProposalVersion(proposalId, versionNumber);
      setSnapshotData(version.snapshot);
    } catch (error) {
      console.error('Failed to fetch version:', error);
    } finally {
      setLoadingSnapshot(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <History className="h-5 w-5 text-gold" />
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Version History</h2>
        </div>
        <div className="flex justify-center py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        </div>
      </Card>
    );
  }

  if (versions.length === 0) {
    return null;
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <History className="h-5 w-5 text-gold" />
        <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Version History</h2>
      </div>
      <div className="space-y-2">
        {versions.map((version) => (
          <div key={version.id}>
            <button
              onClick={() => toggleVersion(version.versionNumber)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-surface-100 dark:bg-surface-800/10 text-left transition-colors"
            >
              {expandedVersion === version.versionNumber ? (
                <ChevronDown className="h-4 w-4 text-surface-500 dark:text-surface-400 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-surface-500 dark:text-surface-400 shrink-0" />
              )}
              <FileText className="h-4 w-4 text-surface-500 dark:text-surface-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-surface-900 dark:text-white">
                    v{version.versionNumber}
                  </span>
                  {version.changeReason && (
                    <span className="text-xs text-surface-500 dark:text-surface-400 truncate">
                      {version.changeReason}
                    </span>
                  )}
                </div>
                <p className="text-xs text-surface-500">
                  {version.changedByUser.fullName} &middot;{' '}
                  {formatDateTime(version.createdAt)}
                </p>
              </div>
            </button>

            {expandedVersion === version.versionNumber && (
              <div className="ml-11 mt-1 mb-2 p-3 rounded-lg bg-surface-100 dark:bg-surface-800/10 border border-surface-200 dark:border-surface-700">
                {loadingSnapshot ? (
                  <div className="flex justify-center py-4">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gold border-t-transparent" />
                  </div>
                ) : snapshotData ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-surface-500 dark:text-surface-400">Status</span>
                      <Badge variant="default">
                        {snapshotData.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-surface-500 dark:text-surface-400">Total</span>
                      <span className="text-surface-900 dark:text-white font-medium">
                        {formatCurrency(snapshotData.totalAmount)}
                      </span>
                    </div>
                    {snapshotData.proposalServices?.length > 0 && (
                      <div>
                        <span className="text-surface-500 dark:text-surface-400">
                          {snapshotData.proposalServices.length} service(s)
                        </span>
                      </div>
                    )}
                    {snapshotData.proposalItems?.length > 0 && (
                      <div>
                        <span className="text-surface-500 dark:text-surface-400">
                          {snapshotData.proposalItems.length} line item(s)
                        </span>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};

export default ProposalVersionHistory;
