type PlaidBalanceAccount = {
  type: string;
  currentBalance: number | null;
};

const LIABILITY_ACCOUNT_TYPES = new Set(['credit', 'loan']);

export function isPlaidLiabilityAccount(account: Pick<PlaidBalanceAccount, 'type'>): boolean {
  return LIABILITY_ACCOUNT_TYPES.has(account.type.toLowerCase());
}

export function calculateNetPlaidBalance(accounts: PlaidBalanceAccount[]): number {
  return accounts.reduce((total, account) => {
    const balance = account.currentBalance ?? 0;
    return total + (isPlaidLiabilityAccount(account) ? -balance : balance);
  }, 0);
}