import { useCallback, useEffect, useMemo, useState } from 'react';
import { Home, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { listAccounts } from '../../lib/accounts';
import { getAccountDetailPath, getPropertyDetailPath } from '../../lib/accountRoutes';
import type { Account, ResidentialPropertySummary } from '../../types/crm';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';

interface PropertyRow {
  id: string;
  property: ResidentialPropertySummary;
  account: Account;
}

function formatAddress(property: ResidentialPropertySummary) {
  return [
    property.serviceAddress?.street,
    property.serviceAddress?.city,
    property.serviceAddress?.state,
    property.serviceAddress?.postalCode,
  ]
    .filter(Boolean)
    .join(', ') || 'No service address set';
}

const PropertiesList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch] = useState('');

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      const response = await listAccounts({
        type: 'residential',
        limit: 100,
        includeArchived: false,
      });
      setAccounts(response.data ?? []);
    } catch (error) {
      console.error('Failed to load residential properties', error);
      toast.error('Failed to load residential properties');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const rows = useMemo<PropertyRow[]>(() => {
    return accounts.flatMap((account) =>
      (account.residentialProperties ?? []).map((property) => ({
        id: property.id,
        property,
        account,
      }))
    );
  }, [accounts]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;

    return rows.filter(({ property, account }) => {
      const address = formatAddress(property).toLowerCase();
      return (
        property.name.toLowerCase().includes(term)
        || account.name.toLowerCase().includes(term)
        || address.includes(term)
      );
    });
  }, [rows, search]);

  const columns = [
    {
      header: 'Property',
      cell: (row: PropertyRow) => (
        <div>
          <div className="font-medium text-surface-900 dark:text-surface-100">{row.property.name}</div>
          <div className="text-sm text-surface-500 dark:text-surface-400">{formatAddress(row.property)}</div>
        </div>
      ),
    },
    {
      header: 'Account',
      cell: (row: PropertyRow) => (
        <button
          type="button"
          className="text-left text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400"
          onClick={(event) => {
            event.stopPropagation();
            navigate(getAccountDetailPath(row.account), {
              state: {
                backLabel: 'Properties',
                backPath: '/properties',
              },
            });
          }}
        >
          {row.account.name}
        </button>
      ),
    },
    {
      header: 'Home Profile',
      cell: (row: PropertyRow) => (
        <div className="text-sm text-surface-600 dark:text-surface-300">
          {row.property.homeProfile?.homeType
            ? row.property.homeProfile.homeType.replace('_', ' ')
            : 'Unknown type'}
          {row.property.homeProfile?.squareFeet ? ` • ${row.property.homeProfile.squareFeet} sq ft` : ''}
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (row: PropertyRow) => (
        <div className="flex items-center gap-2">
          {row.property.isPrimary ? <Badge variant="success">Primary</Badge> : null}
          <Badge variant={row.property.status === 'active' ? 'info' : 'default'}>
            {row.property.status}
          </Badge>
        </div>
      ),
    },
    {
      header: 'Scope',
      cell: (row: PropertyRow) => (
        <Badge variant={row.property.facility?.id ? 'success' : 'warning'}>
          {row.property.facility?.id ? 'Linked' : 'Missing Link'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cell: (row: PropertyRow) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={(event) => {
            event.stopPropagation();
            navigate(getPropertyDetailPath(row.property), {
              state: {
                backLabel: 'Properties',
                backPath: '/properties',
              },
            });
          }}
        >
          Open
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary-100 p-2.5 dark:bg-primary-900/30">
            <Home className="h-5 w-5 text-primary-700 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Properties</h1>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              All residential service properties across residential accounts.
            </p>
          </div>
        </div>
        <div className="w-full max-w-sm">
          <Input
            placeholder="Search properties..."
            icon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <Card>
        <Table
          data={filteredRows}
          columns={columns}
          isLoading={loading}
          onRowClick={(row) =>
            navigate(getPropertyDetailPath(row.property), {
              state: {
                backLabel: 'Properties',
                backPath: '/properties',
              },
            })}
        />
      </Card>
    </div>
  );
};

export default PropertiesList;
