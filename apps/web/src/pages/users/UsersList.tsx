import React, { useState, useEffect } from 'react';
import { Plus, Search, Shield } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';

const UsersList = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setData([
        {
          id: 1,
          name: 'Admin User',
          email: 'admin@hygieia.com',
          role: 'Administrator',
          status: 'Active',
        },
        {
          id: 2,
          name: 'Jane Doe',
          email: 'jane@hygieia.com',
          role: 'Manager',
          status: 'Active',
        },
        {
          id: 3,
          name: 'Bob Smith',
          email: 'bob@hygieia.com',
          role: 'Staff',
          status: 'Inactive',
        },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const columns = [
    { header: 'User Name', accessorKey: 'name' as const },
    { header: 'Email', accessorKey: 'email' as const },
    {
      header: 'Role',
      cell: (item: any) => (
        <div className="flex items-center gap-2">
          <Shield className="h-3 w-3 text-gold" />
          {item.role}
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (item: any) => (
        <Badge variant={item.status === 'Active' ? 'success' : 'default'}>
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
        <h1 className="text-2xl font-bold text-white">System Users</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add New User
        </Button>
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="border-b border-white/10 bg-navy-dark/30 p-4">
          <div className="flex gap-4">
            <div className="w-full max-w-sm">
              <Input
                placeholder="Search users..."
                icon={<Search className="h-4 w-4" />}
              />
            </div>
          </div>
        </div>

        <Table data={data} columns={columns} isLoading={loading} />
      </Card>
    </div>
  );
};

export default UsersList;
