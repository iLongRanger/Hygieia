import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Receipt,
  ArrowLeft,
  Send,
  DollarSign,
  Ban,
  Building2,
  Calendar,
  FileText,
  Copy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import {
  getInvoice,
  sendInvoice,
  recordPayment,
  voidInvoice,
} from '../../lib/invoices';
import type { InvoiceDetail as InvoiceDetailType, InvoiceStatus, PaymentMethod } from '../../types/invoice';

const getStatusVariant = (status: InvoiceStatus): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  const map: Record<InvoiceStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    draft: 'default',
    sent: 'info',
    viewed: 'info',
    paid: 'success',
    partial: 'warning',
    overdue: 'error',
    void: 'error',
    written_off: 'error',
  };
  return map[status];
};

const formatCurrency = (value: string) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(value));
};

const PAYMENT_METHODS = [
  { value: 'check', label: 'Check' },
  { value: 'ach', label: 'ACH' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
];

const InvoiceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<InvoiceDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('check');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchInvoice = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getInvoice(id);
      setInvoice(data);
    } catch {
      toast.error('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const handleSend = async () => {
    if (!id) return;
    try {
      const data = await sendInvoice(id);
      setInvoice(data);
      toast.success('Invoice sent');
    } catch {
      toast.error('Failed to send invoice');
    }
  };

  const handleRecordPayment = async () => {
    if (!id || !paymentAmount) return;
    try {
      const data = await recordPayment(id, {
        paymentDate,
        amount: parseFloat(paymentAmount),
        paymentMethod,
        referenceNumber: paymentRef || null,
      });
      setInvoice(data);
      setShowPaymentForm(false);
      setPaymentAmount('');
      setPaymentRef('');
      toast.success('Payment recorded');
    } catch {
      toast.error('Failed to record payment');
    }
  };

  const handleVoid = async () => {
    if (!id) return;
    try {
      const data = await voidInvoice(id);
      setInvoice(data);
      toast.success('Invoice voided');
    } catch {
      toast.error('Failed to void invoice');
    }
  };

  const copyPublicLink = () => {
    if (!invoice?.publicToken) return;
    const url = `${window.location.origin}/i/${invoice.publicToken}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 skeleton rounded" />
        <div className="h-48 skeleton rounded-xl" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-16">
        <p className="text-surface-500">Invoice not found</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/invoices')}>
          Back to Invoices
        </Button>
      </div>
    );
  }

  const isEditable = invoice.status === 'draft';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/invoices')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="rounded-lg bg-primary-100 p-2.5 dark:bg-primary-900/30">
            <Receipt className="h-5 w-5 text-primary-700 dark:text-primary-400" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 truncate">
                {invoice.invoiceNumber}
              </h1>
              <Badge variant={getStatusVariant(invoice.status)}>
                {invoice.status}
              </Badge>
            </div>
            <p className="text-sm text-surface-500">{invoice.account.name}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {invoice.publicToken && (
            <Button variant="secondary" size="sm" onClick={copyPublicLink}>
              <Copy className="mr-1.5 h-4 w-4" />
              Copy Link
            </Button>
          )}
          {invoice.status !== 'void' && invoice.status !== 'paid' && (
            <Button variant="secondary" size="sm" onClick={handleSend}>
              <Send className="mr-1.5 h-4 w-4" />
              Send
            </Button>
          )}
          {invoice.status !== 'void' && invoice.status !== 'paid' && (
            <Button size="sm" onClick={() => setShowPaymentForm(!showPaymentForm)}>
              <DollarSign className="mr-1.5 h-4 w-4" />
              Record Payment
            </Button>
          )}
          {invoice.status !== 'void' && invoice.status !== 'paid' && (
            <Button variant="danger" size="sm" onClick={handleVoid}>
              <Ban className="mr-1.5 h-4 w-4" />
              Void
            </Button>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <div className="p-4 text-center">
            <p className="text-xs text-surface-500">Total</p>
            <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
              {formatCurrency(invoice.totalAmount)}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-xs text-surface-500">Paid</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(invoice.amountPaid)}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-xs text-surface-500">Balance Due</p>
            <p className={`text-2xl font-bold ${parseFloat(invoice.balanceDue) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {formatCurrency(invoice.balanceDue)}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-4 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-surface-500">Issued</span>
              <span>{new Date(invoice.issueDate).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-surface-500">Due</span>
              <span>{new Date(invoice.dueDate).toLocaleDateString()}</span>
            </div>
            {invoice.periodStart && invoice.periodEnd && (
              <div className="flex justify-between text-xs">
                <span className="text-surface-500">Period</span>
                <span>{new Date(invoice.periodStart).toLocaleDateString()} – {new Date(invoice.periodEnd).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Record payment form */}
      {showPaymentForm && (
        <Card>
          <div className="p-4 space-y-3 border-2 border-primary-200 dark:border-primary-800 rounded-xl">
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50">Record Payment</h3>
            <div className="flex flex-wrap items-end gap-4">
              <Input
                label="Amount"
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder={invoice.balanceDue}
                className="w-40"
              />
              <div className="w-40">
                <Select
                  label="Method"
                  options={PAYMENT_METHODS}
                  value={paymentMethod}
                  onChange={(val) => setPaymentMethod(val as PaymentMethod)}
                />
              </div>
              <Input
                label="Date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-40"
              />
              <Input
                label="Reference #"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="Check #, transaction ID"
                className="w-full sm:w-48"
              />
              <Button size="sm" onClick={handleRecordPayment}>Record</Button>
              <Button variant="secondary" size="sm" onClick={() => setShowPaymentForm(false)}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Line Items */}
      <Card>
        <div className="p-4">
          <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50 mb-4">Line Items</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200 dark:border-surface-700">
                  <th className="text-left py-2 text-xs font-medium text-surface-500">Description</th>
                  <th className="text-right py-2 text-xs font-medium text-surface-500 w-24">Qty</th>
                  <th className="text-right py-2 text-xs font-medium text-surface-500 w-32">Unit Price</th>
                  <th className="text-right py-2 text-xs font-medium text-surface-500 w-32">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} className="border-b border-surface-100 dark:border-surface-800">
                    <td className="py-2 text-surface-700 dark:text-surface-300">
                      <Badge variant="default" size="sm" className="mr-2">{item.itemType}</Badge>
                      {item.description}
                    </td>
                    <td className="py-2 text-right text-surface-600">{parseFloat(item.quantity).toFixed(2)}</td>
                    <td className="py-2 text-right text-surface-600">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-2 text-right font-medium text-surface-700 dark:text-surface-300">
                      {formatCurrency(item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-surface-200 dark:border-surface-700">
                  <td colSpan={3} className="py-2 text-right text-surface-500">Subtotal</td>
                  <td className="py-2 text-right font-medium">{formatCurrency(invoice.subtotal)}</td>
                </tr>
                {parseFloat(invoice.taxRate) > 0 && (
                  <tr>
                    <td colSpan={3} className="py-1 text-right text-surface-500">
                      Tax ({(parseFloat(invoice.taxRate) * 100).toFixed(1)}%)
                    </td>
                    <td className="py-1 text-right">{formatCurrency(invoice.taxAmount)}</td>
                  </tr>
                )}
                <tr className="text-lg font-bold">
                  <td colSpan={3} className="py-2 text-right">Total</td>
                  <td className="py-2 text-right">{formatCurrency(invoice.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </Card>

      {/* Notes */}
      {invoice.notes && (
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-medium text-surface-500 mb-2">Notes</h3>
            <p className="text-sm text-surface-700 dark:text-surface-300">{invoice.notes}</p>
          </div>
        </Card>
      )}

      {/* Payment History */}
      {invoice.payments.length > 0 && (
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50 mb-4">
              Payment History
            </h3>
            <div className="space-y-2">
              {invoice.payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between py-2 px-3 rounded bg-green-50 dark:bg-green-900/10">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-sm font-medium text-surface-700 dark:text-surface-300">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-xs text-surface-500">
                        {payment.paymentMethod} {payment.referenceNumber ? `#${payment.referenceNumber}` : ''} &middot; {payment.recordedByUser.fullName}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-surface-400">
                    {new Date(payment.paymentDate).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Activity */}
      {invoice.activities.length > 0 && (
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50 mb-4">Activity</h3>
            <div className="space-y-3">
              {invoice.activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-surface-300 dark:bg-surface-600 shrink-0" />
                  <div>
                    <p className="text-sm text-surface-700 dark:text-surface-300">
                      <span className="font-medium">{activity.performedByUser?.fullName || 'System'}</span>
                      {' '}{activity.action.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-surface-400">{new Date(activity.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default InvoiceDetail;
