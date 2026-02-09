import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import type { Contract, SendContractInput } from '../../types/contract';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract;
  onSend: (data: SendContractInput) => Promise<void>;
}

const SendContractModal: React.FC<Props> = ({ isOpen, onClose, contract, onSend }) => {
  const defaultBody = `Dear ${contract.account.name},

Please find the attached contract for your review. You can also view the full contract details and sign online using the link provided in this email.

Should you have any questions or require any modifications, please do not hesitate to reach out.

Best regards,
${contract.createdByUser.fullName}`;

  const [formData, setFormData] = useState<SendContractInput>({
    emailTo: '',
    emailCc: [],
    emailSubject: `Contract ${contract.contractNumber}: ${contract.title}`,
    emailBody: defaultBody,
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
    <Modal isOpen={isOpen} onClose={onClose} title="Send Contract">
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Contract</span>
            <span className="text-white font-medium">{contract.contractNumber}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-400">Client</span>
            <span className="text-white">{contract.account.name}</span>
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

        <p className="text-xs text-gray-500">
          A PDF of the contract will be attached to the email, along with a link to review and sign online.
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
            Send Contract
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SendContractModal;
