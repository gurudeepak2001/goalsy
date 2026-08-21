export interface HelpArticle {
  id: string;
  title: string;
  body: string;
}

export const profileHelpArticles: HelpArticle[] = [
  {
    id: 'onboarding-financial-profile',
    title: 'Onboarding & Financial Profile',
    body: 'Your Financial Profile captures the income, expenses, net worth, savings rate, risk tolerance, and primary goal that power your recommendations. You can update it any time from Strategic Intelligence by choosing Update Profile.',
  },
  {
    id: 'goals-roadmaps',
    title: 'Goals & Roadmaps',
    body: 'Create a goal with a target, current balance, contribution amount, and target date. Goalsy uses the remaining balance to show milestone checkpoints and a projected completion date; roadmaps bring your active goals together in one plan.',
  },
  {
    id: 'expenses',
    title: 'Expenses',
    body: 'Use Expenses to review and organize recurring or planned spending. Keeping expenses current gives your Financial Profile and planning views a more useful picture of your cash flow.',
  },
  {
    id: 'bills-calendar',
    title: 'Bills & Calendar',
    body: 'Add bills with their due dates and payment status, then use Calendar to see upcoming bills, goal milestones, and other planning events in one place.',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    body: 'Choose which mission, goal, market, weekly summary, and AI insight alerts you receive in Profile > Notification Preferences. Device notification permission is managed by your phone settings.',
  },
  {
    id: 'strategic-intelligence',
    title: 'Strategic Intelligence',
    body: 'Strategic Intelligence uses the details in your Financial Profile, goals, expenses, and score to organize planning insights. Update your profile there whenever your financial situation changes.',
  },
  {
    id: 'goalsy-score',
    title: 'Goalsy Score',
    body: 'Your Goalsy Score is a financial readiness measure, not a credit score. It reflects factors such as your goals, savings rate, expense ratio, net worth, and mission completion. Open the score card to view its current breakdown and history.',
  },
  {
    id: 'profile-account-settings',
    title: 'Profile & Account Settings',
    body: 'Profile lets you update your display name and photo, review connected-account information, manage notification preferences, and sign out. Security and biometrics settings apply to this device.',
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function buildProfileAchievements(netWorth: number | null | undefined): ProfileAchievement[] {
  const savingsTarget = 100_000;
  const savedAmount = Math.max(0, netWorth ?? 0);
  const savingsProgress = Math.min(100, Math.round((savedAmount / savingsTarget) * 100));
  const hasNetWorth = typeof netWorth === 'number' && Number.isFinite(netWorth);

  return [
    {
      id: 'mission-streak',
      title: '7-Day Mission Streak',
      summary: 'Complete seven daily missions in a row',
      description: 'Daily missions are available from Today. Goalsy does not yet store a verified multi-day streak history, so this achievement will not claim progress or an earned date until that history is available.',
      status: 'not-tracked',
      progressLabel: 'Streak progress is not recorded yet',
    },
    {
      id: 'savings-100k',
      title: 'Savings Milestone: $100k',
      summary: 'Reach $100,000 in saved net worth',
      description: 'This milestone uses the net worth you save in your Financial Profile. Goalsy can show current progress, but it does not retain the first date you crossed this threshold.',
      status: hasNetWorth && savedAmount >= savingsTarget ? 'earned' : 'in-progress',
      progressLabel: hasNetWorth
        ? `${formatCurrency(savedAmount)} of ${formatCurrency(savingsTarget)} (${savingsProgress}%)`
        : 'Add net worth in Financial Profile to track progress',
    },
  ];
}