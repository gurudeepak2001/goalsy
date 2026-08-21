/**
 * Pure roadmap computation — no UI imports, fully unit-testable.
 * Imported by GoalDetailScreen and the roadmap unit tests.
 */

import type { Goal, FinancialProfile } from '@workspace/api-client-react';
import {
  estimatedCompletionDate,
  estimatedCompletionMonths,
  MS_PER_MONTH,
  remainingBalance,
  WEEKS_PER_MONTH,
} from './goalMath';

// ── Constants ─────────────────────────────────────────────────────────────────

export { MS_PER_MONTH, WEEKS_PER_MONTH };

// ── Types ─────────────────────────────────────────────────────────────────────

export type OverallStatus = 'ahead' | 'on_track' | 'behind' | 'complete' | 'no_data';

export interface PlanStep {
  icon: 'save' | 'spend' | 'rate' | 'setup';
  label: string;
  description: string;
}

export interface RoadmapResult {
  overallStatus: OverallStatus;
  expectedByNow: number | null;
  plan: PlanStep[];
  estimatedCompletionDate: string | null;
  requiredMonthly: number | null;
  /** Set (> 0) when behind on a contribution-rate goal (no targetDate). */
  contributionShortfall: number | null;
}

// ── computeRoadmap ────────────────────────────────────────────────────────────

export function computeRoadmap(
  goal: Goal,
  fp: FinancialProfile | null | undefined,
  now = new Date(),
): RoadmapResult {
  const gap = remainingBalance(goal.targetAmount, goal.currentAmount);
  const monthly = goal.monthlyContribution ?? 0;
  const createdAt = new Date(goal.createdAt);
  const targetDate = goal.targetDate ? new Date(goal.targetDate) : null;

  const msToTarget = targetDate ? targetDate.getTime() - now.getTime() : null;
  const monthsToTarget = msToTarget && msToTarget > 0 ? msToTarget / MS_PER_MONTH : null;
  const requiredMonthly = monthsToTarget && gap > 0 ? Math.ceil(gap / monthsToTarget) : null;
  const estimatedMonths = estimatedCompletionMonths(
    goal.targetAmount,
    goal.currentAmount,
    monthly,
  );
  const estimatedDate = estimatedCompletionDate(
    goal.targetAmount,
    goal.currentAmount,
    monthly,
    now,
  );

  let estimatedCompletionLabel: string | null = null;
  if (goal.currentAmount >= goal.targetAmount) {
    estimatedCompletionLabel = 'Complete';
  } else if (estimatedDate) {
    estimatedCompletionLabel = estimatedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  let overallStatus: OverallStatus = 'no_data';
  let expectedByNow: number | null = null;
  let contributionShortfall: number | null = null;

  if (goal.currentAmount >= goal.targetAmount) {
    overallStatus = 'complete';
  } else if (targetDate && goal.targetAmount > 0) {
    const totalMs = targetDate.getTime() - createdAt.getTime();
    const elapsedMs = now.getTime() - createdAt.getTime();
    if (totalMs > 0) {
      const fraction = Math.min(1, Math.max(0, elapsedMs / totalMs));
      expectedByNow = Math.round(goal.targetAmount - gap * (1 - fraction));
      const requiredForDeadline = gap / Math.max(0.01, (targetDate.getTime() - now.getTime()) / MS_PER_MONTH);
      if (monthly <= 0 || monthly < requiredForDeadline * 0.95) overallStatus = 'behind';
      else if (monthly > requiredForDeadline * 1.05) overallStatus = 'ahead';
      else overallStatus = 'on_track';
    }
  } else if (monthly > 0) {
    // Contribution-rate goal (no targetDate): mirror the server-side 90% threshold.
    const elapsedMs = Math.max(0, now.getTime() - createdAt.getTime());
    const monthsElapsed = elapsedMs / MS_PER_MONTH;
    if (monthsElapsed < 0.1) {
      // Too soon after creation — avoid false positives.
      overallStatus = 'on_track';
    } else {
      const actualRate = goal.currentAmount / monthsElapsed;
      if (actualRate < monthly * 0.9) {
        overallStatus = 'behind';
        // Accumulated catch-up: total planned contributions by now minus what's
        // actually saved. This is the lump sum that restores the user to 100%
        // of their planned cumulative pace (not a per-month rate gap).
        contributionShortfall = Math.max(0, monthly * monthsElapsed - goal.currentAmount);
      } else {
        overallStatus = 'on_track';
      }
    }
  }

  const monthlyIncome = fp?.annualIncome ? Math.round(fp.annualIncome / 12) : null;
  const monthlyExpenses = fp?.monthlyExpenses ?? null;
  const monthlySurplus =
    monthlyIncome !== null && monthlyExpenses !== null ? monthlyIncome - monthlyExpenses : null;

  const plan: PlanStep[] = [];
  const targetMonthly = requiredMonthly ?? (monthly > 0 ? monthly : null);

  if (targetMonthly && targetMonthly > 0) {
    plan.push({
      icon: 'save',
      label: `Save $${targetMonthly.toLocaleString()}/month`,
      description: targetDate
        ? `Needed to reach your goal by ${targetDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
        : `At this pace you'll reach your goal in ${estimatedMonths ? Math.ceil(estimatedMonths) : '?'} months`,
    });
  }

  if (monthlySurplus !== null && targetMonthly !== null) {
    const discretionary = monthlySurplus - targetMonthly;
    if (discretionary > 200) {
      const weeklyBudget = Math.floor(discretionary / 4.33);
      plan.push({
        icon: 'spend',
        label: `Spend under $${weeklyBudget.toLocaleString()}/week`,
        description: 'Discretionary budget to stay on track with your goal',
      });
    }
  }

  if (fp?.savingsRate && fp.savingsRate > 0) {
    plan.push({
      icon: 'rate',
      label: `Save $${fp.savingsRate.toLocaleString()}/mo`,
      description: 'Your monthly savings discipline keeps this goal on schedule',
    });
  }

  if (plan.length === 0) {
    plan.push({
      icon: 'setup',
      label: 'Add a monthly contribution',
      description: 'Set a contribution amount to generate your personalised roadmap',
    });
  }

  return {
    overallStatus,
    expectedByNow,
    plan,
    estimatedCompletionDate: estimatedCompletionLabel,
    requiredMonthly,
    contributionShortfall,
  };
}
