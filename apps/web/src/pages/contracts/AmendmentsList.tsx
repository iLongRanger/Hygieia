import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileDiff, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { listAllContractAmendments } from '../../lib/contracts';
import type { ContractAmendment, ContractAmendmentStatus } from '../../types/contract';

type ContractAmendmentWithContract = ContractAmendment & {
  contract?: {
    id: string;
    contractNumber: string;
    title: string;
    account?: { name: string } | null;
    facility?: { name: string } | null;
  } | null;
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'applied', label: 'Applied' },
  { value: 'canceled', label: 'Canceled' },
];

const STATUS_VARIANTS: Record<ContractAmendmentStatus, 'default' | 'warning' | 'success' | 'info' | 'error'> = {
  draft: 'default',
  pending_approval: 'warning',
  approved: 'info',
  applied: 'success',
  canceled: 'error',
};

function formatDate(value?: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}

export default function AmendmentsList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<ContractAmendmentWithContract[]>([]);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      const result = await listAllContractAmendments({
        page,
        limit: 20,
        search: search.trim() || undefined,
        status: (status || undefined) as ContractAmendmentStatus | undefined,
      });
      setRows(result.data as ContractAmendmentWithContract[]);
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (error) {
      console.error('Failed to load amendments:', error);
      toast.error('Failed to load amendments');
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const columns = [
    {
      header: 'Amendment',
      cell: (item: ContractAmendmentWithContract) => (
        <div>
          <div className="font-medium text-white">{item.title}</div>
          <div className="text-xs text-gray-400">{item.description || 'No description'}</div>
        </div>
      ),
    },
    {
      header: 'Contract',
      cell: (item: ContractAmendmentWithContract) => (
        <div className="text-sm text-gray-300">
          <div>{item.contract?.contractNumber || '-'}</div>
          <div className="text-xs text-gray-500">{item.contract?.title || '-'}</div>
        </div>
      ),
    },
    {
      header: 'Account / Facility',
      cell: (item: ContractAmendmentWithContract) => (
        <div className="text-sm text-gray-300">
          <div>{item.contract?.account?.name || '-'}</div>
          <div className="text-xs text-gray-500">{item.contract?.facility?.name || 'No facility'}</div>
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (item: ContractAmendmentWithContract) => (
        <Badge variant={STATUS_VARIANTS[item.status]}>
          {item.status.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      header: 'Effective',
      cell: (item: ContractAmendmentWithContract) => <span className="text-gray-300">{formatDate(item.effectiveDate)}</span>,
    },
    {
      header: 'Actions',
      cell: (item: ContractAmendmentWithContract) => (
        <Button size="sm" variant="secondary" onClick={() => navigate(`/amendments/${item.id}`)}>
          Open
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Contract Amendments</h1>
          <p className="text-sm text-gray-400">Track, review, and edit amendment requests.</p>
        </div>
        <div className="text-sm text-gray-400">Total: {total}</div>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input
            placeholder="Search title, contract, account..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            icon={<Search className="h-4 w-4" />}
          />
          <Select
            options={STATUS_OPTIONS}
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
          <Button variant="secondary" onClick={fetchRows}>
            Refresh
          </Button>
        </div>
      </Card>

      <Card className="p-0">
        <Table data={rows} columns={columns} isLoading={loading} />
      </Card>

      {!loading && rows.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-2 text-gray-400">
          <FileDiff className="h-8 w-8" />
          <span>No amendments found.</span>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Back
            </Button>
            <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
