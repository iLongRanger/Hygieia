import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Mail, Phone } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Card } from '../../components/ui/Card';

const ContactsList = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setData([
        {
          id: 1,
          name: 'John Smith',
          role: 'Facility Manager',
          email: 'john@grandplaza.com',
          phone: '(555) 123-4567',
        },
        {
          id: 2,
          name: 'Sarah Wilson',
          role: 'Operations Director',
          email: 'sarah@techpark.com',
          phone: '(555) 987-6543',
        },
        {
          id: 3,
          name: 'Mike Johnson',
          role: 'Property Manager',
          email: 'mike@citycenter.com',
          phone: '(555) 456-7890',
        },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const columns = [
    { header: 'Name', accessorKey: 'name' as const },
    { header: 'Role', accessorKey: 'role' as const },
    {
      header: 'Email',
      cell: (item: any) => (
        <div className="flex items-center gap-2">
          <Mail className="h-3 w-3 text-gray-400" />
          {item.email}
        </div>
      ),
    },
    {
      header: 'Phone',
      cell: (item: any) => (
        <div className="flex items-center gap-2">
          <Phone className="h-3 w-3 text-gray-400" />
          {item.phone}
        </div>
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
        <h1 className="text-2xl font-bold text-white">Contacts</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add New Contact
        </Button>
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="border-b border-white/10 bg-navy-dark/30 p-4">
          <div className="flex gap-4">
            <div className="w-full max-w-sm">
              <Input
                placeholder="Search contacts..."
                icon={<Search className="h-4 w-4" />}
              />
            </div>
            <Button variant="secondary" className="px-3">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Table data={data} columns={columns} isLoading={loading} />
      </Card>
    </div>
  );
};

export default ContactsList;
