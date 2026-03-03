import { Users, Star, CreditCard, Mail, Phone, ExternalLink } from 'lucide-react';
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
    <Card className="rounded-lg border border-white/10 bg-navy-dark/30 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-white font-semibold">Contacts</h3>
          <span className="text-gray-400 text-sm">({contacts.length})</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate(`/contacts?accountId=${accountId}`)}
          className="text-gray-400 hover:text-white gap-1"
        >
          View All
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </div>

      {contacts.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <Users className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">No contacts yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Primary contact highlighted */}
          {primaryContact && (
            <ContactCard contact={primaryContact} isPrimaryHighlight />
          )}

          {/* Other contacts */}
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
          ? 'bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3'
          : 'rounded-lg p-3'
      }
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium truncate">{contact.name}</span>
            {contact.isPrimary && (
              <Star className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" fill="currentColor" />
            )}
            {contact.isBilling && (
              <Badge variant="default" size="sm" className="flex-shrink-0 gap-1">
                <CreditCard className="h-3 w-3" />
                Billing
              </Badge>
            )}
          </div>
          {contact.title && (
            <p className="text-gray-400 text-sm mt-0.5 truncate">{contact.title}</p>
          )}
        </div>
      </div>

      <div className="mt-2 space-y-1">
        {contact.email && (
          <div className="flex items-center gap-2 text-gray-300 text-sm">
            <Mail className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
            <span className="truncate">{contact.email}</span>
          </div>
        )}
        {contact.phone && (
          <div className="flex items-center gap-2 text-gray-300 text-sm">
            <Phone className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
            <span className="truncate">{contact.phone}</span>
          </div>
        )}
      </div>
    </div>
  );
}
