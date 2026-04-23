import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  DollarSign,
  Filter,
  Plus,
  X,
  ArrowLeft,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Drawer } from '../../components/ui/Drawer';
import {
  listExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  approveExpense,
  rejectExpense,
  listExpenseCategories,
} from '../../lib/expenses';
import type {
  Expense,
  ExpenseDetail,
  ExpenseCategory,
  CreateExpenseInput,
  ExpenseStatus,
} from '../../types/expense';
import type { Pagination } from '../../types/crm';
import { PERMISSIONS } from '../../lib/permissions';
import { useAuthStore } from '../../stores/authStore';

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const getStatusVariant = (status: ExpenseStatus): 'default' | 'success' | 'error' => {
  const map: Record<ExpenseStatus, 'default' | 'success' | 'error'> = {
    pending: 'default',
    approved: 'success',
    rejected: 'error',
  };
  return map[status];
};

const formatCurrency = (value: string) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    parseFloat(value)
  );
};

const emptyForm: CreateExpenseInput = {
  date: new Date().toISOString().split('T')[0],
  amount: 0,
  description: '',
  vendor: '',
  categoryId: '',
  receiptUrl: '',
  notes: '',
};

const ExpensesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const hasPermission = useAuthStore((state) => state.hasPermission);

  const canWrite = hasPermission(PERMISSIONS.EXPENSES_WRITE);
  const canApprove = hasPermission(PERMISSIONS.EXPENSES_APPROVE);

  // List state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);

  // Filter state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Detail state
  const [selectedExpense, setSelectedExpense] = useState<ExpenseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create/Edit modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseDetail | null>(null);
  const [form, setForm] = useState<CreateExpenseInput>({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  const page = Number(searchParams.get('page') || '1');
  const status = searchParams.get('status') || '';

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const result = await listExpenses({
        status: status || undefined,
        categoryId: categoryFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        limit: 20,
      });
      setExpenses(result.data);
      setPagination(result.pagination);
    } catch {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [page, status, categoryFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useEffect(() => {
    listExpenseCategories()
      .then(setCategories)
      .catch(() => undefined);
  }, []);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== 'page') params.set('page', '1');
    setSearchParams(params);
  };

  const handleSelectExpense = async (expense: Expense) => {
    try {
      setDetailLoading(true);
      setSelectedExpense(null);
      const detail = await getExpense(expense.id);
      setSelectedExpense(detail);
    } catch {
      toast.error('Failed to load expense details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleBackToList = () => {
    setSelectedExpense(null);
  };

  // Create / Edit
  const openCreateModal = () => {
    setEditingExpense(null);
    setForm({ ...emptyForm });
    setShowCreateModal(true);
  };

  const openEditModal = () => {
    if (!selectedExpense) return;
    setEditingExpense(selectedExpense);
    setForm({
      date: selectedExpense.date.split('T')[0],
      amount: parseFloat(selectedExpense.amount),
      description: selectedExpense.description,
      vendor: selectedExpense.vendor || '',
      categoryId: selectedExpense.categoryId,
      receiptUrl: selectedExpense.receiptUrl || '',
      notes: selectedExpense.notes || '',
    });
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    if (!form.description.trim()) {
      toast.error('Description is required');
      return;
    }
    if (!form.categoryId) {
      toast.error('Category is required');
      return;
    }
    if (form.amount <= 0) {
      toast.error('Amount must be greater than zero');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        ...form,
        vendor: form.vendor || null,
        receiptUrl: form.receiptUrl || null,
        notes: form.notes || null,
      };
      if (editingExpense) {
        const updated = await updateExpense(editingExpense.id, payload);
        toast.success('Expense updated');
        setSelectedExpense(updated);
      } else {
        toast.success('Expense created');
        await createExpense(payload);
      }
      setShowCreateModal(false);
      fetchExpenses();
    } catch {
      toast.error(editingExpense ? 'Failed to update expense' : 'Failed to create expense');
    } finally {
      setSaving(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!selectedExpense) return;
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await deleteExpense(selectedExpense.id);
      toast.success('Expense deleted');
      setSelectedExpense(null);
      fetchExpenses();
    } catch {
      toast.error('Failed to delete expense');
    }
  };

  // Approve / Reject
  const handleApprove = async () => {
    if (!selectedExpense) return;
    try {
      const updated = await approveExpense(selectedExpense.id);
      toast.success('Expense approved');
      setSelectedExpense(updated);
      fetchExpenses();
    } catch {
      toast.error('Failed to approve expense');
    }
  };

  const handleReject = async () => {
    if (!selectedExpense) return;
    try {
      const updated = await rejectExpense(selectedExpense.id, rejectNotes || undefined);
      toast.success('Expense rejected');
      setSelectedExpense(updated);
      setShowRejectModal(false);
      setRejectNotes('');
      fetchExpenses();
    } catch {
      toast.error('Failed to reject expense');
    }
  };

  // Category options for dropdowns
  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  const categoryFormOptions = [
    { value: '', label: 'Select category...' },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  // Table columns
  const columns = [
    {
      header: 'Date',
      cell: (row: Expense) => (
        <span className="text-sm text-surface-700 dark:text-surface-300">
          {new Date(row.date).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Description',
      cell: (row: Expense) => (
        <span className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate max-w-[200px] block">
          {row.description}
        </span>
      ),
    },
    {
      header: 'Amount',
      cell: (row: Expense) => (
        <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
          {formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      header: 'Category',
      cell: (row: Expense) => (
        <span className="text-sm text-surface-600 dark:text-surface-400">
          {row.category.name}
        </span>
      ),
    },
    {
      header: 'Vendor',
      cell: (row: Expense) => (
        <span className="text-sm text-surface-600 dark:text-surface-400">
          {row.vendor || '-'}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row: Expense) => (
        <Badge variant={getStatusVariant(row.status)} size="sm">
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Created By',
      cell: (row: Expense) => (
        <span className="text-sm text-surface-600 dark:text-surface-400">
          {row.createdByUser.fullName}
        </span>
      ),
    },
  ];

  // --- DETAIL VIEW ---
  if (selectedExpense || detailLoading) {
    return (
      <div className="space-y-6">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={handleBackToList}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Expenses
        </Button>

        {detailLoading && !selectedExpense ? (
          <Card>
            <div className="p-8 text-center text-surface-400">Loading...</div>
          </Card>
        ) : selectedExpense ? (
          <>
            {/* Header with actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                  Expense Detail
                </h1>
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  Created by {selectedExpense.createdByUser.fullName} on{' '}
                  {new Date(selectedExpense.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {selectedExpense.status === 'pending' && canApprove && (
                  <>
                    <Button size="sm" onClick={handleApprove}>
                      <CheckCircle className="mr-1.5 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowRejectModal(true)}
                    >
                      <XCircle className="mr-1.5 h-4 w-4" />
                      Reject
                    </Button>
                  </>
                )}
                {selectedExpense.status === 'pending' && canWrite && (
                  <>
                    <Button variant="secondary" size="sm" onClick={openEditModal}>
                      <Pencil className="mr-1.5 h-4 w-4" />
                      Edit
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleDelete}>
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Detail content */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <div className="space-y-4 p-5">
                  <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50">
                    Details
                  </h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-xs font-medium text-surface-500 dark:text-surface-400">
                        Date
                      </dt>
                      <dd className="text-sm text-surface-900 dark:text-surface-100">
                        {new Date(selectedExpense.date).toLocaleDateString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-surface-500 dark:text-surface-400">
                        Amount
                      </dt>
                      <dd className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                        {formatCurrency(selectedExpense.amount)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-surface-500 dark:text-surface-400">
                        Description
                      </dt>
                      <dd className="text-sm text-surface-900 dark:text-surface-100">
                        {selectedExpense.description}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-surface-500 dark:text-surface-400">
                        Vendor
                      </dt>
                      <dd className="text-sm text-surface-900 dark:text-surface-100">
                        {selectedExpense.vendor || '-'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-surface-500 dark:text-surface-400">
                        Category
                      </dt>
                      <dd className="text-sm text-surface-900 dark:text-surface-100">
                        {selectedExpense.category.name}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-surface-500 dark:text-surface-400">
                        Status
                      </dt>
                      <dd>
                        <Badge variant={getStatusVariant(selectedExpense.status)} size="sm">
                          {selectedExpense.status}
                        </Badge>
                      </dd>
                    </div>
                  </dl>
                </div>
              </Card>

              <Card>
                <div className="space-y-4 p-5">
                  <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50">
                    Additional Info
                  </h3>
                  <dl className="space-y-3">
                    {selectedExpense.notes && (
                      <div>
                        <dt className="text-xs font-medium text-surface-500 dark:text-surface-400">
                          Notes
                        </dt>
                        <dd className="text-sm text-surface-900 dark:text-surface-100 whitespace-pre-wrap">
                          {selectedExpense.notes}
                        </dd>
                      </div>
                    )}
                    {selectedExpense.receiptUrl && (
                      <div>
                        <dt className="text-xs font-medium text-surface-500 dark:text-surface-400">
                          Receipt
                        </dt>
                        <dd>
                          <a
                            href={selectedExpense.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400"
                          >
                            View Receipt
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </dd>
                      </div>
                    )}
                    {selectedExpense.job && (
                      <div>
                        <dt className="text-xs font-medium text-surface-500 dark:text-surface-400">
                          Job
                        </dt>
                        <dd className="text-sm text-surface-900 dark:text-surface-100">
                          {selectedExpense.job.jobNumber}
                        </dd>
                      </div>
                    )}
                    {selectedExpense.contract && (
                      <div>
                        <dt className="text-xs font-medium text-surface-500 dark:text-surface-400">
                          Contract
                        </dt>
                        <dd className="text-sm text-surface-900 dark:text-surface-100">
                          {selectedExpense.contract.contractNumber}
                        </dd>
                      </div>
                    )}
                    {selectedExpense.facility && (
                      <div>
                        <dt className="text-xs font-medium text-surface-500 dark:text-surface-400">
                          Facility
                        </dt>
                        <dd className="text-sm text-surface-900 dark:text-surface-100">
                          {selectedExpense.facility.name}
                        </dd>
                      </div>
                    )}
                    {selectedExpense.approvedByUser && (
                      <div>
                        <dt className="text-xs font-medium text-surface-500 dark:text-surface-400">
                          {selectedExpense.status === 'approved' ? 'Approved By' : 'Reviewed By'}
                        </dt>
                        <dd className="text-sm text-surface-900 dark:text-surface-100">
                          {selectedExpense.approvedByUser.fullName}
                          {selectedExpense.approvedAt && (
                            <span className="text-xs text-surface-400 ml-2">
                              on {new Date(selectedExpense.approvedAt).toLocaleDateString()}
                            </span>
                          )}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </Card>
            </div>

            {/* Reject modal */}
            <Drawer
              isOpen={showRejectModal}
              onClose={() => {
                setShowRejectModal(false);
                setRejectNotes('');
              }}
              title="Reject Expense"
              size="sm"
            >
              <div className="space-y-4">
                <Textarea
                  label="Rejection Notes (optional)"
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  placeholder="Reason for rejection..."
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowRejectModal(false);
                      setRejectNotes('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleReject}>
                    Confirm Reject
                  </Button>
                </div>
              </div>
            </Drawer>

            {/* Edit modal (reuses create modal) */}
            <Drawer
              isOpen={showCreateModal}
              onClose={() => setShowCreateModal(false)}
              title={editingExpense ? 'Edit Expense' : 'Add Expense'}
              size="lg"
            >
              <ExpenseForm
                form={form}
                setForm={setForm}
                categories={categoryFormOptions}
                saving={saving}
                onSave={handleSave}
                onCancel={() => setShowCreateModal(false)}
              />
            </Drawer>
          </>
        ) : null}
      </div>
    );
  }

  // --- LIST VIEW ---
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary-100 p-2.5 dark:bg-primary-900/30">
            <DollarSign className="h-5 w-5 text-primary-700 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Expenses</h1>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Track and manage expenses
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-1.5 h-4 w-4" />
            Filters
          </Button>
          {canWrite && (
            <Button size="sm" onClick={openCreateModal}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Expense
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <div className="flex flex-wrap items-end gap-4 p-4">
            <div className="w-full sm:w-48">
              <Select
                label="Status"
                options={STATUSES}
                value={status}
                onChange={(val) => updateParam('status', val)}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                label="Category"
                options={categoryOptions}
                value={categoryFilter}
                onChange={(val) => setCategoryFilter(val)}
              />
            </div>
            <div className="w-full sm:w-44">
              <Input
                label="From"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-44">
              <Input
                label="To"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setCategoryFilter('');
                setSearchParams({});
              }}
            >
              <X className="mr-1 h-4 w-4" />
              Clear
            </Button>
          </div>
        </Card>
      )}

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          data={expenses}
          isLoading={loading}
          onRowClick={(row) => handleSelectExpense(row)}
        />
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-surface-500">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => updateParam('page', String(pagination.page - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => updateParam('page', String(pagination.page + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create modal */}
      <Drawer
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add Expense"
        size="lg"
      >
        <ExpenseForm
          form={form}
          setForm={setForm}
          categories={categoryFormOptions}
          saving={saving}
          onSave={handleSave}
          onCancel={() => setShowCreateModal(false)}
        />
      </Drawer>
    </div>
  );
};

// --- Expense Form sub-component ---
interface ExpenseFormProps {
  form: CreateExpenseInput;
  setForm: React.Dispatch<React.SetStateAction<CreateExpenseInput>>;
  categories: { value: string; label: string }[];
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

function ExpenseForm({ form, setForm, categories, saving, onSave, onCancel }: ExpenseFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Date"
          type="date"
          required
          value={form.date}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
        />
        <Input
          label="Amount"
          type="number"
          required
          min="0.01"
          step="0.01"
          value={form.amount || ''}
          onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
        />
      </div>
      <Textarea
        label="Description"
        required
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        placeholder="What was this expense for?"
        rows={2}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Vendor"
          value={form.vendor || ''}
          onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
          placeholder="Vendor name"
        />
        <Select
          label="Category"
          options={categories}
          value={form.categoryId}
          onChange={(val) => setForm((f) => ({ ...f, categoryId: val }))}
        />
      </div>
      <Input
        label="Receipt URL"
        value={form.receiptUrl || ''}
        onChange={(e) => setForm((f) => ({ ...f, receiptUrl: e.target.value }))}
        placeholder="https://..."
      />
      <Textarea
        label="Notes"
        value={form.notes || ''}
        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        placeholder="Additional notes..."
        rows={2}
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

export default ExpensesPage;
