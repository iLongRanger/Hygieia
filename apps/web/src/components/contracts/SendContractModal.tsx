import React, { useEffect, useMemo, useState } from 'react';
import { Send, FileText, AlertCircle } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { getContractPdfBlobUrl } from '../../lib/contracts';
import type { Contract, SendContractInput } from '../../types/contract';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract;
  onSend: (data: SendContractInput) => Promise<void>;
}

const SendContractModal: React.FC<Props> = ({ isOpen, onClose, contract, onSend }) => {
  const { primaryContact, primaryContactFirstName, ccContacts } = useMemo(() => {
    const contacts = contract.account.contacts || [];
    const preferredPrimary =
      contacts.find((contact) => contact.isPrimary && contact.email) ||
      contacts.find((contact) => Boolean(contact.email));
    const firstName =
      preferredPrimary?.firstName || preferredPrimary?.name?.trim().split(/\s+/)[0] || '';
    const additionalCc = contacts
      .filter((contact) => contact.email && contact !== preferredPrimary)
      .map((contact) => contact.email!)
      .filter(Boolean);

    return {
      primaryContact: preferredPrimary,
      primaryContactFirstName: firstName,
      ccContacts: additionalCc,
    };
  }, [contract.account.contacts]);

  const defaultBody = `Dear ${primaryContactFirstName || contract.account.name},

Please find the attached contract for your review. You can also view the full contract details and sign online using the link provided in this email.

Should you have any questions or require any modifications, please do not hesitate to reach out.

Best regards,
${contract.createdByUser.fullName}`;
  const defaultFormData = useMemo<SendContractInput>(() => ({
    emailTo: primaryContact?.email || '',
    emailCc: ccContacts,
    emailSubject: `Contract ${contract.contractNumber}: ${contract.title}`,
    emailBody: defaultBody,
  }), [ccContacts, contract.contractNumber, contract.title, defaultBody, primaryContact?.email]);
  const defaultCcInput = useMemo(() => ccContacts.join(', '), [ccContacts]);

  const [formData, setFormData] = useState<SendContractInput>(defaultFormData);
  const [ccInput, setCcInput] = useState(defaultCcInput);
  const [sending, setSending] = useState(false);

  // PDF preview state
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFormData(defaultFormData);
    setCcInput(defaultCcInput);
  }, [defaultCcInput, defaultFormData, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      // Cleanup blob URL on close
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      setPdfError(false);
      return;
    }

    // Fetch PDF when modal opens
    let cancelled = false;
    setPdfLoading(true);
    setPdfError(false);
    getContractPdfBlobUrl(contract.id)
      .then((url) => {
        if (!cancelled) {
          setPdfUrl(url);
          setPdfLoading(false);
        } else {
          URL.revokeObjectURL(url);
        }
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
  }, [isOpen, contract.id]);

  const handleSend = async () => {
    try {
      setSending(true);
      await onSend({
        emailTo: formData.emailTo || undefined,
        emailSubject: formData.emailSubject || undefined,
        emailBody: formData.emailBody || undefined,
        emailCc: ccInput
          ? ccInput.split(',').map((e) => e.trim()).filter(Boolean)
          : [],
      });
      onClose();
    } catch (error) {
      // Error handling done by parent
    } finally {
      setSending(false);
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Send Contract" size="2xl">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* PDF Preview */}
        <div className="flex flex-col">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-surface-700 dark:text-surface-300">
            <FileText className="h-4 w-4" />
            PDF Preview
          </div>
          <div className="relative flex-1 overflow-hidden rounded-lg border border-surface-200 bg-surface-100 dark:border-surface-700 dark:bg-surface-900" style={{ minHeight: '500px' }}>
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
                title="Contract PDF Preview"
              />
            )}
          </div>
        </div>

        {/* Send Form */}
        <div className="space-y-4">
          <div className="rounded-lg border border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-800/50">
            <div className="flex justify-between text-sm">
              <span className="text-surface-500 dark:text-surface-400">Contract</span>
              <span className="font-medium text-surface-900 dark:text-surface-100">{contract.contractNumber}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-surface-500 dark:text-surface-400">Client</span>
              <span className="text-surface-900 dark:text-surface-100">{contract.account.name}</span>
            </div>
          </div>

          <Input
            label="Send To"
            type="email"
            placeholder="client@example.com"
            value={formData.emailTo || ''}
            onChange={(e) => setFormData({ ...formData, emailTo: e.target.value })}
            hint="Leave empty to auto-send to primary account contact"
          />

          <Input
            label="CC (comma separated)"
            placeholder="cc1@example.com, cc2@example.com"
            value={ccInput}
            onChange={(e) => setCcInput(e.target.value)}
          />

          <Input
            label="Subject"
            value={formData.emailSubject || ''}
            onChange={(e) => setFormData({ ...formData, emailSubject: e.target.value })}
          />

          <Textarea
            label="Message (optional)"
            placeholder="Add a personal message..."
            value={formData.emailBody || ''}
            onChange={(e) => setFormData({ ...formData, emailBody: e.target.value })}
            rows={4}
          />

          <p className="text-xs text-surface-500 dark:text-surface-400">
            A PDF of the contract will be attached to the email, along with a link to review and sign online.
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
              Send Contract
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
};

export default SendContractModal;
