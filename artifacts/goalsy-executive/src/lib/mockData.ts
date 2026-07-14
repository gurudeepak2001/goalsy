// MOCK DATA - replace with real API calls once bank connections, auth,
// and backend services are wired up. Every screen imports its sample
// data from here so swapping this file (or the functions below) for
// real network calls is a single, isolated change.

// MOCK DATA - preset avatar options for the profile picture picker;
// replace with real uploaded-image URLs once photo upload is wired up.
export const mockAvatarPresets: string[] = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Alexander&backgroundColor=2563eb',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan&backgroundColor=22c55e',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Morgan&backgroundColor=f59e0b',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Taylor&backgroundColor=ef4444',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Casey&backgroundColor=a855f7',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Riley&backgroundColor=0ea5e9',
];

export interface MockGoal {
  id: string;
  title: string;
  subtitle: string;
  progress: number;
  current: string;
  target: string;
  projectedDate: string;
  color: string;
  description: string;
  monthlyContribution: string;
}

// Parses amount strings like "$120,000", "$1.2M", "$45K", "$2,800/mo" into a plain number.
function parseAmount(value: string): number {
  const cleaned = value.replace(/\/mo.*$/i, '').replace(/[$,\s]/g, '');
  const match = cleaned.match(/^(-?[\d.]+)([KkMm])?$/);
  if (!match) return NaN;
  const num = parseFloat(match[1]);
  const suffix = match[2]?.toUpperCase();
  if (suffix === 'K') return num * 1_000;
  if (suffix === 'M') return num * 1_000_000;
  return num;
}

// Estimates a goal's completion date from its numbers rather than a fixed/hardcoded
// date, so it stays consistent whenever the current amount or monthly contribution
// changes (e.g. after the user adjusts their contribution).
export function estimateCompletionDate(
  current: string,
  target: string,
  monthlyContribution: string,
  from: Date = new Date(),
): string {
  const currentNum = parseAmount(current);
  const targetNum = parseAmount(target);
  const monthlyNum = parseAmount(monthlyContribution);

  if (!Number.isFinite(currentNum) || !Number.isFinite(targetNum)) return 'TBD';
  const remaining = targetNum - currentNum;
  if (remaining <= 0) return 'Goal Reached';
  if (!Number.isFinite(monthlyNum) || monthlyNum <= 0) return 'TBD';

  const monthsRemaining = Math.ceil(remaining / monthlyNum);
  const projected = new Date(from.getFullYear(), from.getMonth() + monthsRemaining, 1);

  // Long-horizon goals (5+ years out) read better as just a year, matching how
  // people actually talk about retirement-style timelines.
  if (monthsRemaining >= 60) {
    return `${projected.getFullYear()}`;
  }
  return projected.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export const mockGoals: MockGoal[] = [
  {
    id: 'home-purchase',
    title: 'Home Purchase',
    subtitle: 'Primary Residence',
    progress: 48,
    current: '$120,000',
    target: '$250,000',
    projectedDate: estimateCompletionDate('$120,000', '$250,000', '$3,200/mo'),
    color: '#22C55E',
    description: 'Down payment fund for a primary residence in the Austin metro area.',
    monthlyContribution: '$3,200/mo',
  },
  {
    id: 'debt-elimination',
    title: 'Debt Elimination',
    subtitle: 'Student Loans & Credit',
    progress: 27,
    current: '$12,400',
    target: '$45,000',
    projectedDate: estimateCompletionDate('$12,400', '$45,000', '$1,450/mo'),
    color: '#F59E0B',
    description: 'Aggressive payoff plan targeting student loans and revolving credit balances.',
    monthlyContribution: '$1,450/mo',
  },
  {
    id: 'retirement',
    title: 'Retirement',
    subtitle: 'Long-term Alpha',
    progress: 24,
    current: '$1.2M',
    target: '$5M',
    projectedDate: estimateCompletionDate('$1.2M', '$5M', '$2,800/mo'),
    color: '#3B82F6',
    description: 'Long-horizon retirement portfolio, diversified across index funds and alternatives.',
    monthlyContribution: '$2,800/mo',
  },
];

export interface MockConnectedAccount {
  id: string;
  institution: string;
  accountType: string;
  last4: string;
  balance: string;
  status: 'connected' | 'syncing';
}

export const mockConnectedAccounts: MockConnectedAccount[] = [
  { id: 'acc-chase', institution: 'Chase', accountType: 'Checking', last4: '4012', balance: '$18,240.55', status: 'connected' },
  { id: 'acc-amex', institution: 'American Express', accountType: 'Credit Card', last4: '7788', balance: '-$1,240.00', status: 'connected' },
  { id: 'acc-wealthfront', institution: 'Wealthfront', accountType: 'Savings', last4: '2291', balance: '$24,000.00', status: 'connected' },
];

export interface MockNotificationPreference {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export const mockNotificationPreferences: MockNotificationPreference[] = [
  { id: 'bill-reminders', label: 'Bill Reminders', description: 'Alerts 24h before a bill is due', enabled: true },
  { id: 'score-changes', label: 'Score Changes', description: 'Notify when Goalsy Score moves 5+ points', enabled: true },
  { id: 'ai-insights', label: 'AI Insights', description: 'Daily strategic recommendations', enabled: false },
  { id: 'goal-milestones', label: 'Goal Milestones', description: 'Celebrate progress on strategic goals', enabled: true },
];

export interface MockSubscriptionPlan {
  tier: string;
  price: string;
  renewalDate: string;
  features: string[];
}

export const mockSubscription: MockSubscriptionPlan = {
  tier: 'Executive Tier',
  price: '$49/mo',
  renewalDate: 'Aug 4, 2026',
  features: [
    'Unlimited AI strategic recommendations',
    'Real-time credit intelligence',
    'Priority support',
    'Advanced scenario simulator',
  ],
};

export interface MockHelpArticle {
  id: string;
  question: string;
  answer: string;
}

export const mockHelpArticles: MockHelpArticle[] = [
  {
    id: 'connect-bank',
    question: 'How do I connect a new bank account?',
    answer: 'Go to Profile > Connected Accounts > Add Institution and follow the secure Plaid link flow.',
  },
  {
    id: 'score-calc',
    question: 'How is my Goalsy Score calculated?',
    answer: 'Your score blends savings rate, debt ratio, cash flow stability, and payment discipline.',
  },
  {
    id: 'cancel-sub',
    question: 'How do I cancel my subscription?',
    answer: 'Contact support at least 3 days before renewal to cancel without being charged for the next cycle.',
  },
];

export interface MockBill {
  id: string;
  merchant: string;
  amount: string;
  dueLabel: string;
}

export const mockUpcomingBill: MockBill = {
  id: 'amex-gold',
  merchant: 'Amex Gold',
  amount: '$1,240',
  dueLabel: 'Due in 24h',
};

export interface MockBriefing {
  id: string;
  dateLabel: string;
  category: string;
  title: string;
  detail: string;
}

export const mockBriefings: MockBriefing[] = [
  {
    id: 'credit-chase',
    dateLabel: 'Oct 15',
    category: 'Financial Health',
    title: 'Credit Reporting: Chase',
    detail: 'Chase will report your October statement balance to the bureaus on Oct 15. Keep utilization below 30% to protect your score.',
  },
  {
    id: 'mortgage-review',
    dateLabel: 'Oct 20',
    category: 'Mission Briefing',
    title: 'Review Mortgage Strategy',
    detail: 'Rates have shifted 0.4% since your last review. Goalsy AI recommends revisiting your refinance scenario on Oct 20.',
  },
];

export interface MockNotification {
  id: string;
  title: string;
  description: string;
  timeLabel: string;
}

export interface MockCreditFactor {
  id: string;
  label: string;
  status: string;
  color: string;
  detail: string;
}

// MOCK DATA - credit score breakdown for the Financial Health screen's
// "Credit Score" card; replace with a real credit-bureau API response.
export const mockCreditFactors: MockCreditFactor[] = [
  { id: 'payment-history', label: 'Payment History', status: 'Excellent', color: '#22C55E', detail: '100% of payments made on time over the last 24 months.' },
  { id: 'utilization', label: 'Credit Utilization', status: 'Good', color: '#22C55E', detail: 'Using 12% of available credit across 3 open accounts.' },
  { id: 'credit-age', label: 'Length of Credit History', status: 'Good', color: '#3B82F6', detail: 'Average account age is 8.4 years.' },
  { id: 'credit-mix', label: 'Credit Mix', status: 'Fair', color: '#F59E0B', detail: 'Mostly revolving credit; adding an installment loan could help.' },
  { id: 'inquiries', label: 'New Inquiries', status: 'Excellent', color: '#22C55E', detail: 'No hard inquiries in the last 12 months.' },
];

export const mockNotifications: MockNotification[] = [
  { id: 'notif-1', title: 'Score Increased', description: 'Your Goalsy Score climbed to 842 (+12%).', timeLabel: '2h ago' },
  { id: 'notif-2', title: 'Bill Due Tomorrow', description: 'Amex Gold: $1,240 due in 24h.', timeLabel: '5h ago' },
  { id: 'notif-3', title: 'Automated Savings', description: '$2,500 scheduled to transfer to Wealthfront on Oct 14.', timeLabel: '1d ago' },
];

// Simulates a network/service call (biometric auth, bank connection,
// payments, transfers, etc). Resolves with the given result after a
// short delay so the UI can show a realistic loading -> success flow.
// MOCK DATA - replace with a real API call
export function simulateAsync<T>(result: T, delayMs = 1200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(result), delayMs));
}
