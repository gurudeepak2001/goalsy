export interface HelpArticle {
  id: string;
  title: string;
  body: string;
}

export const profileHelpArticles: HelpArticle[] = [
  {
    id: 'financial-profile-emergency-fund',
    title: 'Financial Profile & Emergency Fund',
    body: 'Your Financial Profile captures the income, expenses, net worth, savings rate, risk tolerance, and primary goal used throughout Goalsy. When you save positive monthly expenses, Goalsy creates one Emergency Fund goal with a target equal to three months of those expenses. Updating your profile later changes that target without resetting saved progress.',
  },
  {
    id: 'goals-progress-roadmaps',
    title: 'Goals, Progress & Roadmaps',
    body: 'Create goals with a target, current balance, contribution amount, and target date. Goalsy uses your saved weekly progress to show milestone checkpoints and projected completion dates. If you correct an earlier weekly amount, later projections recalculate from that corrected history.',
  },
  {
    id: 'connected-accounts-total-balance',
    title: 'Connected Accounts & Total Balance',
    body: 'Connected Accounts shows the institutions and accounts currently shared with Goalsy. Credit-card and loan balances are treated as debt when Total Balance is calculated. Removing an account hides it from Goalsy without deleting anything at your financial institution.',
  },
  {
    id: 'expenses-bills-calendar',
    title: 'Expenses, Bills & Calendar',
    body: 'Keep expenses and bill due dates current to give your planning views a useful cash-flow picture. Calendar brings together upcoming bills, goal milestones, and daily missions. Completed or skipped missions stay visible as history but cannot be reopened as new actions.',
  },
  {
    id: 'ai-planning-scenarios',
    title: 'AI Planning & Scenario Drafts',
    body: 'AI recommendations use your saved Financial Profile, goals, expenses, linked accounts, and score. Scenario adjustments are drafts only: selecting one opens the related goal plan with the proposed monthly contribution filled in. Review, edit, or cancel it; nothing changes until you select Save Plan.',
  },
  {
    id: 'financial-health-goalsy-score',
    title: 'Financial Health & Goalsy Score',
    body: 'Financial Health and the Goalsy Score use saved profile, goal, bill, expense, and linked-account data. The Goalsy Score is a financial readiness measure, not a credit score. Its change explanation compares the current score drivers with the previous saved score snapshot.',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    body: 'Choose which mission, goal, market, weekly summary, and AI insight alerts you receive in Profile > Notification Preferences. Your phone’s notification permission is managed in its system settings.',
  },
  {
    id: 'security-face-id-account',
    title: 'Security, Face ID & Account',
    body: 'Profile lets you update your display name and photo, manage notifications, review connected accounts, and sign out. On the mobile app, enable Security & Biometrics to require the device’s Face ID, Touch ID, or supported biometric method before a saved Goalsy session can be reopened.',
  },
];

export type AchievementStatus = 'earned' | 'in-progress' | 'not-tracked';

export interface ProfileAchievement {
  id: string;
  title: string;
  summary: string;
  description: string;
  status: AchievementStatus;
  progressLabel: string;
  earnedAt?: string;
}

export interface MissionStreakProgress {
  currentStreak?: number | null;
  longestStreak?: number | null;
  firstSevenDayStreakAt?: string | null;
}

export interface SavingsMilestoneProgress {
  netWorth?: number | null;
  savingsMilestone100kAt?: string | null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function buildProfileAchievements(
  financialProfile: SavingsMilestoneProgress | null | undefined,
  missionStreak: MissionStreakProgress | null | undefined,
): ProfileAchievement[] {
  const savingsTarget = 100_000;
  const savedAmount = Math.max(0, financialProfile?.netWorth ?? 0);
  const savingsProgress = Math.min(100, Math.round((savedAmount / savingsTarget) * 100));
  const hasNetWorth = typeof financialProfile?.netWorth === 'number' && Number.isFinite(financialProfile.netWorth);
  const currentStreak = Math.max(0, missionStreak?.currentStreak ?? 0);
  const longestStreak = Math.max(currentStreak, missionStreak?.longestStreak ?? 0);
  const missionEarnedAt = missionStreak?.firstSevenDayStreakAt ?? undefined;
  const savingsEarnedAt = financialProfile?.savingsMilestone100kAt ?? undefined;

  return [
    {
      id: 'mission-streak',
      title: '7-Day Mission Streak',
      summary: 'Complete seven daily missions in a row',
      description: 'Your streak is verified from the completed daily missions saved to your account, so it stays accurate wherever you sign in.',
      status: missionEarnedAt ? 'earned' : 'in-progress',
      progressLabel: missionEarnedAt
        ? `${currentStreak}-day current streak · Best: ${longestStreak} days`
        : `${Math.min(currentStreak, 7)} of 7 consecutive days`,
      earnedAt: missionEarnedAt,
    },
    {
      id: 'savings-100k',
      title: 'Savings Milestone: $100k',
      summary: 'Reach $100,000 in saved net worth',
      description: 'This milestone uses the net worth you save in your Financial Profile. Goalsy records the first time you reach $100,000 and keeps that award date even if your balance later changes.',
      status: savingsEarnedAt ? 'earned' : 'in-progress',
      progressLabel: hasNetWorth
        ? `${formatCurrency(savedAmount)} of ${formatCurrency(savingsTarget)} (${savingsProgress}%)`
        : 'Add net worth in Financial Profile to track progress',
      earnedAt: savingsEarnedAt,
    },
  ];
}