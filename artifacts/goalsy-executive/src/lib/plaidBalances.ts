type PlaidBalanceAccount = {
  type: string;
  currentBalance: number | null;
};

const LIABILITY_ACCOUNT_TYPES = new Set(['credit', 'loan']);

export function isPlaidLiabilityAccount(account: Pick<PlaidBalanceAccount, 'type'>): boolean {
  return LIABILITY_ACCOUNT_TYPES.has(account.type.toLowerCase());
}

export function calculateNetPlaidBalance(accounts: PlaidBalanceAccount[]): number {
  return summarizePlaidBalances(accounts).net;
}

export function summarizePlaidBalances(accounts: PlaidBalanceAccount[]) {
  return accounts.reduce((summary, account) => {
    const balance = account.currentBalance ?? 0;
    if (isPlaidLiabilityAccount(account)) {
      summary.liabilities += balance;
      summary.net -= balance;
    } else {
      summary.assets += balance;
      summary.net += balance;
    }
    return summary;
  }, { assets: 0, liabilities: 0, net: 0 });
}