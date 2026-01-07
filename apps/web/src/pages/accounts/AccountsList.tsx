import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';

const AccountsList = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setData([
        {
          id: 1,
          name: 'Grand Plaza Hotel',
          type: 'Hospitality',
          status: 'Active',
          location: 'Downtown',
        },
        {
          id: 2,
          name: 'City Center Mall',
          type: 'Retail',
          status: 'Active',
          location: 'North Side',
        },
        {
          id: 3,
          name: 'Tech Park One',
          type: 'Office',
          status: 'On Hold',
          location: 'Business District',
        },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const columns = [
    { header: 'Account Name', accessorKey: 'name' as const },
    { header: 'Type', accessorKey: 'type' as const },
    { header: 'Location', accessorKey: 'location' as const },
    {
      header: 'Status',
      cell: (item: any) => (
        <Badge variant={item.status === 'Active' ? 'success' : 'warning'}>
          {item.status}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cell: () => (
        <Button variant="ghost" size="sm">
          Manage
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-white">Accounts</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add New Account
        </Button>
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="border-b border-white/10 bg-navy-dark/30 p-4">
          <div className="flex gap-4">
            <div className="w-full max-w-sm">
              <Input
                placeholder="Search accounts..."
                icon={<Search className="h-4 w-4" />}
              />
            </div>
            <Button variant="secondary" className="px-3">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Table data={data} columns={columns} isLoading={loading} />

        <div className="border-t border-white/10 bg-navy-dark/30 p-4">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>Showing 1-3 of 3 accounts</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled>
                Previous
              </Button>
              <Button variant="secondary" size="sm" disabled>
                Next
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AccountsList;
