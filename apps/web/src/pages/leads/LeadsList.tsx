import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import api from '../../lib/api';

const LeadsList = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setData([
        {
          id: 1,
          name: 'Metro Office Complex',
          company: 'Metro Properties',
          status: 'New',
          value: '$12,000',
        },
        {
          id: 2,
          name: 'TechHub Downtown',
          company: 'TechHub Inc',
          status: 'Contacted',
          value: '$8,500',
        },
        {
          id: 3,
          name: 'Medical Center West',
          company: 'HealthFirst',
          status: 'Proposal',
          value: '$24,000',
        },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const columns = [
    { header: 'Lead Name', accessorKey: 'name' as const },
    { header: 'Company', accessorKey: 'company' as const },
    {
      header: 'Value',
      accessorKey: 'value' as const,
      className: 'font-mono',
    },
    {
      header: 'Status',
      cell: (item: any) => (
        <Badge
          variant={
            item.status === 'New'
              ? 'info'
              : item.status === 'Proposal'
                ? 'warning'
                : 'default'
          }
        >
          {item.status}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cell: () => (
        <Button variant="ghost" size="sm">
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-white">Leads</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add New Lead
        </Button>
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="border-b border-white/10 bg-navy-dark/30 p-4">
          <div className="flex gap-4">
            <div className="w-full max-w-sm">
              <Input
                placeholder="Search leads..."
                icon={<Search className="h-4 w-4" />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
            <span>Showing 1-3 of 3 leads</span>
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

export default LeadsList;
