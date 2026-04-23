import { Users, Star, CreditCard, Mail, Phone, ExternalLink, Plus } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { Contact } from '../../types/contact';

interface AccountContactsProps {
  contacts: Contact[];
  accountId: string;
  onNavigate: (path: string) => void;
}

export function AccountContacts({ contacts, accountId, onNavigate }: AccountContactsProps) {
  const primaryContact = contacts.find((c) => c.isPrimary);
  const otherContacts = contacts.filter((c) => !c.isPrimary);

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-surface-900 dark:text-white">Contacts</h3>
          <span className="text-sm text-surface-500 dark:text-surface-400">({contacts.length})</span>
        </div>
        {contacts.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(`/contacts?accountId=${accountId}`)}
          >
            View All
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-6 text-surface-500 dark:text-surface-400">
          <Users className="h-8 w-8 opacity-50" />
          <p className="text-sm">No contacts yet</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate(`/contacts/new?accountId=${accountId}`)}
          >
            <Plus className="h-4 w-4" />
            Add contact
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {primaryContact && <ContactCard contact={primaryContact} isPrimaryHighlight />}
          {otherContacts.map((contact) => (
            <ContactCard key={contact.id} contact={contact} />
          ))}
        </div>
      )}
    </Card>
  );
}

function ContactCard({
  contact,
  isPrimaryHighlight = false,
}: {
  contact: Contact;
  isPrimaryHighlight?: boolean;
}) {
  return (
    <div
      className={
        isPrimaryHighlight
          ? 'rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3'
          : 'rounded-lg border border-surface-200 p-3 dark:border-surface-700'
      }
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-surface-900 dark:text-white">{contact.name}</span>
            {contact.isPrimary && (
              <Star className="h-3.5 w-3.5 flex-shrink-0 text-yellow-500" fill="currentColor" />
            )}
            {contact.isBilling && (
              <Badge variant="default" size="sm" className="flex-shrink-0 gap-1">
                <CreditCard className="h-3 w-3" />
                Billing
              </Badge>
            )}
          </div>
          {contact.title && (
            <p className="mt-0.5 truncate text-sm text-surface-500 dark:text-surface-400">{contact.title}</p>
          )}
        </div>
      </div>

      <div className="mt-2 space-y-1">
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            className="flex items-center gap-2 text-sm text-surface-600 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400"
          >
            <Mail className="h-3.5 w-3.5 flex-shrink-0 text-surface-500 dark:text-surface-400" />
            <span className="truncate">{contact.email}</span>
          </a>
        )}
        {contact.phone && (
          <a
            href={`tel:${contact.phone}`}
            className="flex items-center gap-2 text-sm text-surface-600 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400"
          >
            <Phone className="h-3.5 w-3.5 flex-shrink-0 text-surface-500 dark:text-surface-400" />
            <span className="truncate">{contact.phone}</span>
          </a>
        )}
      </div>
    </div>
  );
}
