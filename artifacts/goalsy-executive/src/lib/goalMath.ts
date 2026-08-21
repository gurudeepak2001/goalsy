export const MS_PER_MONTH = 30.44 * 24 * 60 * 60 * 1000;
export const WEEKS_PER_MONTH = 52 / 12;
export const ESTIMATE_BUFFER_DAYS = 21;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_COMPLETION_MS = 30 * 365.25 * MS_PER_DAY;

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

/** The exact mathematical date a contribution plan reaches the remaining balance. */
export function exactCompletionDate(
  targetAmount: number,
  currentAmount: number,
  monthlyContribution: number,
  now = new Date(),
): Date | null {
  const months = completionMonths(targetAmount, currentAmount, monthlyContribution);
  if (months === null) return null;
  if (months === 0) return now;

  const ms = months * MS_PER_MONTH;
  if (ms > MAX_COMPLETION_MS) return null;
  return new Date(now.getTime() + ms);
}

/**
 * A conservative completion estimate for user-facing projections.
 * The fixed buffer makes predictions useful without promising a date earlier
 * than the contribution math supports. Deadline feasibility always uses the
 * exact remaining-balance calculation instead.
 */
export function estimatedCompletionDate(
  targetAmount: number,
  currentAmount: number,
  monthlyContribution: number,
  now = new Date(),
): Date | null {
  const exactDate = exactCompletionDate(targetAmount, currentAmount, monthlyContribution, now);
  if (!exactDate) return null;
  if (remainingBalance(targetAmount, currentAmount) === 0) return exactDate;
  return new Date(exactDate.getTime() + ESTIMATE_BUFFER_DAYS * MS_PER_DAY);
}

/** Duration that corresponds to the buffered user-facing completion estimate. */
export function estimatedCompletionMonths(
  targetAmount: number,
  currentAmount: number,
  monthlyContribution: number,
): number | null {
  const exactMonths = completionMonths(targetAmount, currentAmount, monthlyContribution);
  if (exactMonths === null || exactMonths === 0) return exactMonths;
  return exactMonths + ESTIMATE_BUFFER_DAYS * MS_PER_DAY / MS_PER_MONTH;
}

function toIsoDate(date: Date): string {
  // Deadline fields parse YYYY-MM-DD as UTC midnight. Round up to the next
  // such calendar boundary so converting a timestamp to an input value can
  // never make a suggested date earlier than the estimate it represents.
  const utcMidnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const roundedUp = utcMidnight < date.getTime() ? utcMidnight + MS_PER_DAY : utcMidnight;
  return new Date(roundedUp).toISOString().split('T')[0];
}

export function exactCompletionDateIso(
  targetAmount: number,
  currentAmount: number,
  monthlyContribution: number,
  now = new Date(),
): string | null {
  const date = exactCompletionDate(targetAmount, currentAmount, monthlyContribution, now);
  return date ? toIsoDate(date) : null;
}

export function estimatedCompletionDateIso(
  targetAmount: number,
  currentAmount: number,
  monthlyContribution: number,
  now = new Date(),
): string | null {
  const date = estimatedCompletionDate(targetAmount, currentAmount, monthlyContribution, now);
  if (!date) return null;
  // A completed goal has no prediction to buffer or round forward.
  return remainingBalance(targetAmount, currentAmount) === 0
    ? date.toISOString().split('T')[0]
    : toIsoDate(date);
}

/**
 * Backwards-compatible name for the date used when forms suggest a target.
 * Suggested dates are estimates, so they deliberately include the buffer.
 */
export function completionDateIso(
  targetAmount: number,
  currentAmount: number,
  monthlyContribution: number,
  now = new Date(),
): string | null {
  return estimatedCompletionDateIso(targetAmount, currentAmount, monthlyContribution, now);
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