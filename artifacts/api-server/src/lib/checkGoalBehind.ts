const MS_PER_MONTH = 30.44 * 24 * 60 * 60 * 1000;

/**
 * Compute whether a goal is "behind schedule".
 *
 * Two modes:
 *  1. targetDate present: behind when currentAmount < 90% of the linearly-
 *     expected amount based on elapsed time since creation.
 *  2. No targetDate but monthlyContribution > 0: behind when the actual
 *     monthly run-rate (currentAmount ÷ months elapsed) is < 90% of the
 *     planned monthly contribution.
 *
 * Returns { behind, expectedByNow, contributionShortfall }.
 * contributionShortfall is set (> 0) only for mode 2.
 */
export function checkGoalBehind(goal: {
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  targetDate: string | null;
  createdAt: Date;
}): { behind: boolean; expectedByNow: number; contributionShortfall: number } {
  const created = new Date(goal.createdAt).getTime();
  const now = Date.now();

  // ── Mode 1: target-date goal ──────────────────────────────────────────────
  if (goal.targetDate) {
    const target = new Date(goal.targetDate).getTime();
    const total = target - created;
    if (total <= 0) return { behind: false, expectedByNow: goal.targetAmount, contributionShortfall: 0 };

    const elapsed = Math.max(0, now - created);
    const fraction = Math.min(1, elapsed / total);
    const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
    const monthsRemaining = Math.max(0.01, (target - now) / MS_PER_MONTH);
    const requiredMonthly = remaining / monthsRemaining;
    const expectedByNow = goal.targetAmount - remaining * (1 - fraction);

    const behind = goal.monthlyContribution <= 0 || goal.monthlyContribution < requiredMonthly * 0.95;
    return { behind, expectedByNow, contributionShortfall: 0 };
  }

  // ── Mode 2: contribution-rate goal (no targetDate) ────────────────────────
  if (goal.monthlyContribution > 0) {
    const elapsedMs = Math.max(0, now - created);
    const monthsElapsed = elapsedMs / MS_PER_MONTH;

    // Need at least a few days of history to avoid false positives right after creation.
    if (monthsElapsed < 0.1) return { behind: false, expectedByNow: 0, contributionShortfall: 0 };

    const actualRate = goal.currentAmount / monthsElapsed;
    const behind = actualRate < goal.monthlyContribution * 0.9;
    const contributionShortfall = Math.max(0, goal.monthlyContribution - actualRate);
    return { behind, expectedByNow: 0, contributionShortfall };
  }

  return { behind: false, expectedByNow: 0, contributionShortfall: 0 };
}
