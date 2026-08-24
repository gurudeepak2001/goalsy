import type { goals, goalProgressEntries } from "@workspace/db";

export type GoalRow = typeof goals.$inferSelect;
export type ProgressRow = typeof goalProgressEntries.$inferSelect;

export type LedgerRow = {
  entry: ProgressRow;
  weeklyDeposit: number;
  confirmedAmount: number;
};

/**
 * Old clients wrote multiple cumulative snapshots for a week. The latest one is
 * the effective value; retaining older rows preserves their audit trail.
 */
export function getEffectiveProgressEntries(entries: ProgressRow[]) {
  const latestByWeek = new Map<number, ProgressRow>();
  for (const entry of entries) {
    if (!latestByWeek.has(entry.weekIndex)) latestByWeek.set(entry.weekIndex, entry);
  }
  return [...latestByWeek.values()].sort((a, b) => a.weekIndex - b.weekIndex);
}

/**
 * Builds a single-deposit-per-week ledger. Legacy cumulative rows are converted
 * to differences without overwriting the original values until a user saves.
 */
export function buildProgressLedger(goal: GoalRow, entries: ProgressRow[]) {
  const hasLegacySnapshots = entries.some((entry) => entry.weeklyDeposit === null);
  const inferredOpeningAmount =
    entries.length === 0 && goal.openingAmount === 0 && goal.currentAmount > 0
      ? goal.currentAmount
      : goal.openingAmount;
  // Historical snapshots had already replaced currentAmount, so a zero baseline
  // preserves every historical total when they are converted to deposits.
  const openingAmount = hasLegacySnapshots ? 0 : inferredOpeningAmount;

  let runningTotal = openingAmount;
  const rows: LedgerRow[] = entries
    .slice()
    .sort((a, b) => a.weekIndex - b.weekIndex)
    .map((entry) => {
      const weeklyDeposit =
        entry.weeklyDeposit ?? entry.confirmedAmount - runningTotal;
      runningTotal += weeklyDeposit;
      return { entry, weeklyDeposit, confirmedAmount: runningTotal };
    });

  return { openingAmount, currentAmount: runningTotal, rows };
}

/**
 * Turns legacy cumulative snapshots into fixed weekly deposits before an edit.
 * This prevents a later legacy row from absorbing an earlier edited amount and
 * falsely keeping its old cumulative total.
 */
export function normalizeProgressEntries(goal: GoalRow, entries: ProgressRow[]) {
  return buildProgressLedger(goal, entries).rows.map(({ entry, weeklyDeposit }) => ({
    ...entry,
    weeklyDeposit,
  }));
}

export function serializeLedgerRows(rows: LedgerRow[]) {
  return rows.map(({ entry, weeklyDeposit, confirmedAmount }) => ({
    ...entry,
    weeklyDeposit,
    confirmedAmount,
  }));
}