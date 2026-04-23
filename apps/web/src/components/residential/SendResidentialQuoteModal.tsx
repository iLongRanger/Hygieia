import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, FileText, Send } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { getResidentialQuotePdfBlobUrl } from '../../lib/residential';
import type { ResidentialQuote } from '../../types/residential';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  quote: ResidentialQuote;
  onSend: (data: { emailTo?: string | null }) => Promise<void>;
}

const SendResidentialQuoteModal: React.FC<Props> = ({ isOpen, onClose, quote, onSend }) => {
  const defaultMessage = useMemo(
    () => `Hello ${quote.customerName},

Great news. Your residential quote is ready.

We pulled together the service details, pricing, and next steps for you. You can review everything online using the link in the email.

We’re excited about the opportunity to help care for your home. Let us know if you’d like any adjustments or if you’re ready for us to get started.

Thank you,`,
    [quote.customerName]
  );

  const [emailTo, setEmailTo] = useState(quote.customerEmail ?? quote.account?.billingEmail ?? '');
  const [message] = useState(defaultMessage);
  const [sending, setSending] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(false);

  useEffect(() => {
    setEmailTo(quote.customerEmail ?? quote.account?.billingEmail ?? '');
  }, [quote.customerEmail, quote.account?.billingEmail, quote.id]);

  useEffect(() => {
    if (!isOpen) {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      setPdfError(false);
      return;
    }

    let cancelled = false;
    setPdfLoading(true);
    setPdfError(false);

    getResidentialQuotePdfBlobUrl(quote.id)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        setPdfUrl(url);
        setPdfLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setPdfError(true);
          setPdfLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, quote.id]);

  const handleSend = async () => {
    try {
      setSending(true);
      await onSend({ emailTo: emailTo.trim() || undefined });
      onClose();
    } finally {
      setSending(false);
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Send Residential Quote" size="2xl">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-surface-700 dark:text-surface-300">
            <FileText className="h-4 w-4" />
            PDF Preview
          </div>
          <div
            className="relative flex-1 overflow-hidden rounded-lg border border-surface-200 bg-surface-100 dark:border-surface-700 dark:bg-surface-900"
            style={{ minHeight: '500px' }}
          >
            {pdfLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
                <span className="text-sm text-surface-500 dark:text-surface-400">Loading preview...</span>
              </div>
            )}
            {pdfError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
                <AlertCircle className="h-8 w-8 text-surface-400" />
                <span className="text-sm text-surface-500 dark:text-surface-400">Failed to load PDF preview</span>
              </div>
            )}
            {pdfUrl && (
              <iframe
                src={pdfUrl}
                className="h-full w-full"
                style={{ minHeight: '500px' }}
                title="Residential Quote PDF Preview"
              />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-800/50">
            <div className="flex justify-between text-sm">
              <span className="text-surface-500 dark:text-surface-400">Quote</span>
              <span className="font-medium text-surface-900 dark:text-surface-100">{quote.quoteNumber}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-surface-500 dark:text-surface-400">Client</span>
              <span className="text-surface-900 dark:text-surface-100">{quote.customerName}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-surface-500 dark:text-surface-400">Property</span>
              <span className="text-surface-900 dark:text-surface-100">{quote.property?.name || 'Residential Property'}</span>
            </div>
          </div>

          <Input
            label="Send To"
            type="email"
            placeholder="client@example.com"
            value={emailTo}
            onChange={(e) => setEmailTo(e.target.value)}
          />

          <Textarea
            label="Email Preview"
            value={message}
            readOnly
            rows={8}
          />

          <p className="text-xs text-surface-500 dark:text-surface-400">
            The client email includes the online review link and attaches this PDF quote.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Quote
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
};

export default SendResidentialQuoteModal;
