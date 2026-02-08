import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import type { Proposal, SendProposalInput } from '../../types/proposal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  proposal: Proposal;
  onSend: (data: SendProposalInput) => Promise<void>;
}

const SendProposalModal: React.FC<Props> = ({ isOpen, onClose, proposal, onSend }) => {
  const [formData, setFormData] = useState<SendProposalInput>({
    emailTo: '',
    emailCc: [],
    emailSubject: `Proposal ${proposal.proposalNumber}: ${proposal.title}`,
    emailBody: '',
  });
  const [ccInput, setCcInput] = useState('');
  const [sending, setSending] = useState(false);

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
    <Modal isOpen={isOpen} onClose={onClose} title="Send Proposal">
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Proposal</span>
            <span className="text-white font-medium">{proposal.proposalNumber}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-400">Client</span>
            <span className="text-white">{proposal.account.name}</span>
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

        <p className="text-xs text-gray-500">
          A PDF of the proposal will be attached to the email, along with a link to view it online.
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Send Proposal
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SendProposalModal;
