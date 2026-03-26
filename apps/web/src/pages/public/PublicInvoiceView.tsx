import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Receipt, Calendar, Building2, Mail, Phone, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { getPublicInvoice } from '../../lib/invoices';
import type { InvoiceDetail } from '../../types/invoice';
import type { GlobalBranding } from '../../types/globalSettings';

const formatCurrency = (amount: number | string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount));

const formatDate = (date: string | null | undefined) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const statusConfig: Record<string, { label: string; className: string; icon: typeof CheckCircle }> = {
  draft: { label: 'Draft', className: 'bg-surface-100 text-surface-700', icon: Clock },
  sent: { label: 'Sent', className: 'bg-blue-100 text-blue-700', icon: Clock },
  viewed: { label: 'Viewed', className: 'bg-blue-100 text-blue-700', icon: Clock },
  partial: { label: 'Partially Paid', className: 'bg-amber-100 text-amber-700', icon: AlertCircle },
  paid: { label: 'Paid', className: 'bg-green-100 text-green-700', icon: CheckCircle },
  overdue: { label: 'Overdue', className: 'bg-red-100 text-red-700', icon: AlertCircle },
  void: { label: 'Void', className: 'bg-surface-100 text-surface-500', icon: AlertCircle },
  written_off: { label: 'Written Off', className: 'bg-surface-100 text-surface-500', icon: AlertCircle },
};

const PublicInvoiceView = () => {
  const { token } = useParams<{ token: string }>();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [branding, setBranding] = useState<GlobalBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        setLoading(true);
        const result = await getPublicInvoice(token);
        setInvoice(result.data);
        setBranding(result.branding);
      } catch {
        setError('This invoice link is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const primaryColor = branding?.themePrimaryColor || '#1a1a2e';
  const accentColor = branding?.themeAccentColor || '#d4af37';
  const companyName = branding?.companyName || 'Hygieia Cleaning Services';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="animate-spin h-8 w-8 border-4 border-surface-300 border-t-blue-600 rounded-full" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="text-center max-w-md">
          <Receipt className="h-16 w-16 text-surface-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-surface-800 mb-2">Invoice Not Found</h1>
          <p className="text-surface-500">{error || 'This link may have expired.'}</p>
        </div>
      </div>
    );
  }

  const status = statusConfig[invoice.status] || statusConfig.sent;
  const StatusIcon = status.icon;
  const isOverdue =
    invoice.status !== 'paid' &&
    invoice.status !== 'void' &&
    invoice.status !== 'written_off' &&
    new Date(invoice.dueDate) < new Date();

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <div style={{ backgroundColor: primaryColor }} className="py-8 px-4">
        <div className="max-w-3xl mx-auto text-center">
          {branding?.logoDataUrl && (
            <img src={branding.logoDataUrl} alt="Logo" className="h-16 mx-auto mb-4" />
          )}
          <h1 style={{ color: accentColor }} className="text-2xl font-bold">{companyName}</h1>
          <p className="text-white/70 text-sm mt-1">Invoice</p>
        </div>
      </div>

      {/* Paid Banner */}
      {invoice.status === 'paid' && (
        <div className="py-4 px-4 text-center text-white bg-green-600">
          <p className="font-semibold text-lg flex items-center justify-center gap-2">
            <CheckCircle className="h-5 w-5" />
            This invoice has been paid in full. Thank you!
          </p>
        </div>
      )}

      {/* Overdue Banner */}
      {isOverdue && invoice.status !== 'partial' && (
        <div className="py-4 px-4 text-center text-white bg-red-600">
          <p className="font-semibold text-lg flex items-center justify-center gap-2">
            <AlertCircle className="h-5 w-5" />
            This invoice is past due. Please remit payment at your earliest convenience.
          </p>
        </div>
      )}

      {/* Content */}
      <div className="max-w-3xl mx-auto py-8 px-4">
        {/* Invoice Header */}
        <div className="bg-surface-50 rounded-lg shadow-sm border border-surface-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-surface-800">Invoice {invoice.invoiceNumber}</h2>
              {invoice.contract && (
                <p className="text-sm text-surface-500">Contract: {invoice.contract.contractNumber}</p>
              )}
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5 ${status.className}`}>
              <StatusIcon className="h-3.5 w-3.5" />
              {isOverdue && invoice.status !== 'partial' ? 'Overdue' : status.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-surface-500">Billed To</p>
              <p className="font-medium text-surface-800">{invoice.account.name}</p>
              {invoice.facility && (
                <p className="text-surface-600 flex items-center gap-1 mt-0.5">
                  <Building2 className="h-3.5 w-3.5" />
                  {invoice.facility.name}
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="mb-2">
                <p className="text-surface-500">Issue Date</p>
                <p className="font-medium text-surface-800 flex items-center justify-end gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(invoice.issueDate)}
                </p>
              </div>
              <div>
                <p className="text-surface-500">Due Date</p>
                <p className={`font-medium flex items-center justify-end gap-1 ${isOverdue ? 'text-red-600' : 'text-surface-800'}`}>
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(invoice.dueDate)}
                </p>
              </div>
            </div>
          </div>

          {(invoice.periodStart || invoice.periodEnd) && (
            <p className="mt-3 text-sm text-surface-500">
              Service period: {formatDate(invoice.periodStart)} &ndash; {formatDate(invoice.periodEnd)}
            </p>
          )}
        </div>

        {/* Line Items */}
        <div className="bg-surface-50 rounded-lg shadow-sm border border-surface-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-surface-800 mb-4">Line Items</h3>
          <div className="space-y-1">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-surface-500 uppercase tracking-wide pb-2 border-b border-surface-200">
              <div className="col-span-6">Description</div>
              <div className="col-span-2 text-right">Qty</div>
              <div className="col-span-2 text-right">Unit Price</div>
              <div className="col-span-2 text-right">Total</div>
            </div>
            {invoice.items.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 py-3 border-b border-surface-100 last:border-0 text-sm">
                <div className="col-span-6">
                  <p className="font-medium text-surface-800">{item.description}</p>
                  {item.itemType !== 'service' && (
                    <span className="text-xs text-surface-500 capitalize">{item.itemType}</span>
                  )}
                </div>
                <div className="col-span-2 text-right text-surface-600">{Number(item.quantity)}</div>
                <div className="col-span-2 text-right text-surface-600">{formatCurrency(item.unitPrice)}</div>
                <div className="col-span-2 text-right font-medium text-surface-800">{formatCurrency(item.totalPrice)}</div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-4 pt-4 border-t border-surface-200">
            <div className="flex justify-end">
              <div className="w-64 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500">Subtotal</span>
                  <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                </div>
                {Number(invoice.taxRate) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-500">
                      Tax ({(Number(invoice.taxRate) * 100).toFixed(1)}%)
                    </span>
                    <span>{formatCurrency(invoice.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total</span>
                  <span style={{ color: primaryColor }}>{formatCurrency(invoice.totalAmount)}</span>
                </div>
                {Number(invoice.amountPaid) > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Amount Paid</span>
                      <span>-{formatCurrency(invoice.amountPaid)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-1 border-t">
                      <span>Balance Due</span>
                      <span className={isOverdue ? 'text-red-600' : ''}>{formatCurrency(invoice.balanceDue)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Instructions */}
        {invoice.paymentInstructions && (
          <div className="bg-surface-50 rounded-lg shadow-sm border border-surface-200 p-6 mb-6">
            <h3 className="text-sm font-semibold text-surface-500 uppercase mb-2">Payment Instructions</h3>
            <p className="text-sm text-surface-600 whitespace-pre-wrap">{invoice.paymentInstructions}</p>
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div className="bg-surface-50 rounded-lg shadow-sm border border-surface-200 p-6 mb-6">
            <h3 className="text-sm font-semibold text-surface-500 uppercase mb-2">Notes</h3>
            <p className="text-sm text-surface-600 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* Payments */}
        {invoice.payments.length > 0 && (
          <div className="bg-surface-50 rounded-lg shadow-sm border border-surface-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-surface-800 mb-4">Payment History</h3>
            <div className="space-y-3">
              {invoice.payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between py-2 border-b border-surface-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-surface-800">{formatDate(payment.paymentDate)}</p>
                    <p className="text-xs text-surface-500 capitalize">
                      {payment.paymentMethod.replace(/_/g, ' ')}
                      {payment.referenceNumber && ` - Ref: ${payment.referenceNumber}`}
                    </p>
                  </div>
                  <span className="font-semibold text-green-600">{formatCurrency(payment.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact */}
        <div className="mt-8 text-center text-sm text-surface-500">
          <p>Questions about this invoice? Contact us:</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            {branding?.companyEmail && (
              <a href={`mailto:${branding.companyEmail}`} className="flex items-center gap-1 hover:text-surface-700">
                <Mail className="h-3.5 w-3.5" /> {branding.companyEmail}
              </a>
            )}
            {branding?.companyPhone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> {branding.companyPhone}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicInvoiceView;
