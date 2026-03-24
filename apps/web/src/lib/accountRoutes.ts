export function getAccountDetailPath(account: { id: string; type?: string | null }) {
  return account.type === 'residential'
    ? `/residential/accounts/${account.id}`
    : `/accounts/${account.id}`;
}
