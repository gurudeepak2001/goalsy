import { describe, expect, it } from 'vitest';
import { calculateNetPlaidBalance, isPlaidLiabilityAccount, summarizePlaidBalances } from './plaidBalances';

describe('Plaid balance calculations', () => {
  it('subtracts credit-card debt from deposit balances', () => {
    expect(calculateNetPlaidBalance([
      { type: 'depository', currentBalance: 110 },
      { type: 'depository', currentBalance: 210 },
      { type: 'depository', currentBalance: 1_000 },
      { type: 'credit', currentBalance: 410 },
    ])).toBe(910);
  });

  it('subtracts loan balances and adds investment assets', () => {
    expect(calculateNetPlaidBalance([
      { type: 'investment', currentBalance: 5_000 },
      { type: 'loan', currentBalance: 1_250 },
    ])).toBe(3_750);
  });

  it('treats missing balances as zero and preserves credit overpayments', () => {
    expect(calculateNetPlaidBalance([
      { type: 'depository', currentBalance: null },
      { type: 'credit', currentBalance: -25 },
    ])).toBe(25);
  });

  it('recognizes Plaid liability account types case-insensitively', () => {
    expect(isPlaidLiabilityAccount({ type: 'CREDIT' })).toBe(true);
    expect(isPlaidLiabilityAccount({ type: 'loan' })).toBe(true);
    expect(isPlaidLiabilityAccount({ type: 'depository' })).toBe(false);
  });

  it('separates assets, liabilities, and net balance for detail views', () => {
    expect(summarizePlaidBalances([
      { type: 'depository', currentBalance: 1_320 },
      { type: 'credit', currentBalance: 410 },
    ])).toEqual({ assets: 1_320, liabilities: 410, net: 910 });
  });
});