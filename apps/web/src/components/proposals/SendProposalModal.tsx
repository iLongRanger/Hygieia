import React, { useEffect, useState } from 'react';
import { Send, FileText, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { getProposalPdfBlobUrl } from '../../lib/proposals';
import type { Proposal, SendProposalInput } from '../../types/proposal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  proposal: Proposal;
  onSend: (data: SendProposalInput) => Promise<void>;
}

const SendProposalModal: React.FC<Props> = ({ isOpen, onClose, proposal, onSend }) => {
  // Auto-populate from account contacts
  const contacts = proposal.account.contacts || [];
  const primaryContact = contacts.find((c) => c.isPrimary && c.email);
  const ccContacts = contacts
    .filter((c) => !c.isPrimary && c.email)
    .map((c) => c.email!)
    .filter(Boolean);

  const defaultBody = `Dear ${primaryContact?.name || proposal.account.name},

Thank you for giving us the opportunity to present our proposal. Please find the attached document outlining the scope of services, pricing, and terms for your review.

You can also view and respond to this proposal online using the link provided in this email. Should you have any questions or require any modifications, please do not hesitate to reach out.

We look forward to working with you.

Best regards,
${proposal.createdByUser.fullName}`;

  const [formData, setFormData] = useState<SendProposalInput>({
    emailTo: primaryContact?.email || '',
    emailCc: ccContacts,
    emailSubject: `Proposal ${proposal.proposalNumber}: ${proposal.title}`,
    emailBody: defaultBody,
  });
  const [ccInput, setCcInput] = useState(ccContacts.join(', '));
  const [sending, setSending] = useState(false);

  // PDF preview state
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(false);

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
    getProposalPdfBlobUrl(proposal.id)
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
  }, [isOpen, proposal.id]);

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
    <Modal isOpen={isOpen} onClose={onClose} title="Send Proposal" size="2xl">
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
                title="Proposal PDF Preview"
              />
            )}
          </div>
        </div>

        {/* Send Form */}
        <div className="space-y-4">
          <div className="rounded-lg border border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-800/50">
            <div className="flex justify-between text-sm">
              <span className="text-surface-500 dark:text-surface-400">Proposal</span>
              <span className="font-medium text-surface-900 dark:text-surface-100">{proposal.proposalNumber}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-surface-500 dark:text-surface-400">Client</span>
              <span className="text-surface-900 dark:text-surface-100">{proposal.account.name}</span>
            </div>
          </div>

          <Input
            label="Send To"
            type="email"
            placeholder="client@example.com"
            value={formData.emailTo || ''}
            onChange={(e) => setFormData({ ...formData, emailTo: e.target.value })}
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
            A PDF of the proposal will be attached to the email, along with a link to view it online.
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
              Send Proposal
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SendProposalModal;
