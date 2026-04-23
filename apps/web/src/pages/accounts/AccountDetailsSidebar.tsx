import { Card } from '../../components/ui/Card';
import { formatCurrency, PAYMENT_TERMS } from './account-constants';
import type { Account } from '../../types/crm';

interface AccountDetailsSidebarProps {
  account: Account;
}

function getPaymentTermsLabel(value: string): string {
  return PAYMENT_TERMS.find((pt) => pt.value === value)?.label || value;
}

export function AccountDetailsSidebar({ account }: AccountDetailsSidebarProps) {
  const creditLimit = account.creditLimit ? Number(account.creditLimit) : null;
  const rows: { label: string; value: React.ReactNode }[] = [];

  if (account.paymentTerms) {
    rows.push({ label: 'Payment Terms', value: getPaymentTermsLabel(account.paymentTerms) });
  }
  if (creditLimit !== null && !Number.isNaN(creditLimit)) {
    rows.push({ label: 'Credit Limit', value: formatCurrency(creditLimit) });
  }
  if (account.billingEmail) {
    rows.push({
      label: 'Billing Email',
      value: (
        <a
          href={`mailto:${account.billingEmail}`}
          className="break-all text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          {account.billingEmail}
        </a>
      ),
    });
  }
  if (account.billingPhone) {
    rows.push({
      label: 'Billing Phone',
      value: (
        <a
          href={`tel:${account.billingPhone}`}
          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          {account.billingPhone}
        </a>
      ),
    });
  }
  if (account.website) {
    const href = account.website.startsWith('http') ? account.website : `https://${account.website}`;
    rows.push({
      label: 'Website',
      value: (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="break-all text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          {account.website}
        </a>
      ),
    });
  }

  if (rows.length === 0) return null;

  return (
    <Card className="p-5">
      <h3 className="mb-4 font-semibold text-surface-900 dark:text-white">Account Details</h3>
      <dl className="space-y-3">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-xs uppercase tracking-wide text-surface-500">{row.label}</dt>
            <dd className="mt-0.5 text-sm text-surface-900 dark:text-white">{row.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
