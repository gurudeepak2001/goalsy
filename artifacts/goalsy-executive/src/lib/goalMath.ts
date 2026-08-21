export const MS_PER_MONTH = 30.44 * 24 * 60 * 60 * 1000;
export const WEEKS_PER_MONTH = 52 / 12;

export type ContributionFrequency = 'monthly' | 'weekly';

export function remainingBalance(targetAmount: number, currentAmount: number): number {
  return Math.max(0, targetAmount - currentAmount);
}

/** Converts the amount entered for a selected frequency into the canonical monthly amount. */
export function toMonthlyContribution(amount: number, frequency: ContributionFrequency): number {
  return frequency === 'weekly' ? amount * WEEKS_PER_MONTH : amount;
}

/** Converts the canonical monthly amount into the amount shown for a selected frequency. */
export function fromMonthlyContribution(monthlyAmount: number, frequency: ContributionFrequency): number {
  return frequency === 'weekly' ? monthlyAmount / WEEKS_PER_MONTH : monthlyAmount;
}

export function completionMonths(
  targetAmount: number,
  currentAmount: number,
  monthlyContribution: number,
): number | null {
  const remaining = remainingBalance(targetAmount, currentAmount);
  if (remaining === 0) return 0;
  if (monthlyContribution <= 0) return null;
  return remaining / monthlyContribution;
}

export function completionDateIso(
  targetAmount: number,
  currentAmount: number,
  monthlyContribution: number,
  now = new Date(),
): string | null {
  const months = completionMonths(targetAmount, currentAmount, monthlyContribution);
  if (months === null) return null;
  if (months === 0) return now.toISOString().split('T')[0];

  const ms = months * MS_PER_MONTH;
  if (ms > 30 * 365.25 * 24 * 60 * 60 * 1000) return null;
  return new Date(now.getTime() + ms).toISOString().split('T')[0];
}

export function requiredMonthlyContribution(
  targetAmount: number,
  currentAmount: number,
  targetDate: string,
  now = new Date(),
): number | null {
  const remaining = remainingBalance(targetAmount, currentAmount);
  if (remaining === 0) return 0;
  const months = (new Date(targetDate).getTime() - now.getTime()) / MS_PER_MONTH;
  if (months <= 0) return null;
  return Math.ceil(remaining / months);
}