import type { Goal } from '@workspace/api-client-react';
import { estimatedCompletionDate, WEEKS_PER_MONTH } from './goalMath';

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export interface GoalScheduleMilestone {
  weekIndex: number;
  weekDate: Date;
  dateLabel: string;
  expectedAmount: number;
  isPast: boolean;
}

/**
 * Generates milestone amounts from the balance saved today. Historical entries
 * keep their existing plan-based pace, while every future milestone is rebased
 * to the latest balance so an older goal cannot jump straight to its target.
 */
export function computeGoalSchedule(
  goal: Goal,
  now = new Date(),
): GoalScheduleMilestone[] {
  if (goal.targetAmount <= 0) return [];

  const createdAt = new Date(goal.createdAt);
  let endDate: Date | null = null;
  if (goal.targetDate) {
    endDate = new Date(goal.targetDate);
  } else if (goal.monthlyContribution > 0 && goal.currentAmount < goal.targetAmount) {
    endDate = estimatedCompletionDate(
      goal.targetAmount,
      goal.currentAmount,
      goal.monthlyContribution,
      now,
    );
  }
  if (!endDate || endDate <= createdAt) return [];

  const totalWeeks = Math.ceil((endDate.getTime() - createdAt.getTime()) / MS_PER_WEEK);
  const futureWindowMs = Math.max(1, endDate.getTime() - now.getTime());
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const milestones: GoalScheduleMilestone[] = [];

  for (let i = 1; i <= totalWeeks; i++) {
    const weekDate = new Date(createdAt.getTime() + i * MS_PER_WEEK);
    const isPast = weekDate <= now;
    let expectedAmount: number;

    if (goal.monthlyContribution > 0) {
      if (isPast) {
        // Keep the established historical pace for existing confirmations.
        expectedAmount = goal.currentAmount + i * goal.monthlyContribution / WEEKS_PER_MONTH;
      } else {
        // Rebase future pace to today's balance, not the balance at creation.
        const futureWeeks = Math.max(1, Math.ceil((weekDate.getTime() - now.getTime()) / MS_PER_WEEK));
        expectedAmount = goal.currentAmount + futureWeeks * goal.monthlyContribution / WEEKS_PER_MONTH;
      }
    } else if (isPast) {
      // A deadline-only goal has no contribution cadence to infer historically.
      expectedAmount = goal.currentAmount;
    } else {
      const futureProgress = Math.min(1, (weekDate.getTime() - now.getTime()) / futureWindowMs);
      expectedAmount = goal.currentAmount + remaining * futureProgress;
    }

    milestones.push({
      weekIndex: i,
      weekDate,
      dateLabel: weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
      expectedAmount: Math.round(Math.min(goal.targetAmount, expectedAmount)),
      isPast,
    });
  }

  return milestones;
}