import { useState, useRef, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, Tooltip,
} from 'recharts';
import { useParams, useLocation } from 'wouter';
import {
  TrendingUp, CheckCircle2, Clock, AlertTriangle, Pencil, Check, X,
  Loader2, Trash2, Zap, DollarSign, CalendarDays, Award, Star,
} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import ExecutiveButton from '@/components/ExecutiveButton';
import ExecutiveInput from '@/components/ExecutiveInput';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  estimatedCompletionDate,
  estimatedCompletionMonths,
  MS_PER_MONTH,
  completionDateIso,
  fromMonthlyContribution,
  requiredMonthlyContribution,
  toMonthlyContribution,
} from '@/lib/goalMath';
import { computeGoalSchedule } from '@/lib/goalSchedule';
import {
  useGetGoal,
  useUpdateGoal,
  useDeleteGoal,
  useGetFinancialProfile,
  getListGoalsQueryKey,
  getGetGoalQueryKey,
  useListGoalProgress,
  useCreateGoalProgress,
  getListGoalProgressQueryKey,
} from '@workspace/api-client-react';
import type { Goal, FinancialProfile } from '@workspace/api-client-react';

// ── Formatting helpers ───────────────────────────────────────────────────────

function formatDollars(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

// Compact formatter for chart Y-axis tick labels only — the axis column is
// 42 px wide at 9 pt, so full comma-separated amounts won't fit.
function formatDollarsAxis(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

const TYPE_LABELS: Record<string, string> = {
  home_purchase: 'Home Purchase',
  retirement: 'Retirement',
  education: 'Education',
  emergency_fund: 'Emergency Fund',
  investment: 'Investment Portfolio',
  auto_purchase: 'Auto Purchase',
  other: 'Other',
};

const TYPE_COLORS: Record<string, string> = {
  home_purchase: '#22C55E',
  retirement: '#3B82F6',
  education: '#F59E0B',
  emergency_fund: '#10B981',
  investment: '#8B5CF6',
  auto_purchase: '#F97316',
  other: '#6B7280',
};

// ── Auto-fill helpers ─────────────────────────────────────────────────────────

function calcCompletionDateStr(current: number, target: number, contrib: number): string | null {
  return completionDateIso(target, current, contrib);
}

function calcRequiredContrib(current: number, target: number, targetDateStr: string): number | null {
  return requiredMonthlyContribution(target, current, targetDateStr);
}

function feasibilityNote(
  current: number, target: number, contrib: number, targetDateStr: string,
): string | null {
  const remaining = target - current;
  if (remaining <= 0 || contrib <= 0 || !targetDateStr) return null;
  const monthsNeeded = remaining / contrib;
  const monthsAvailable = (new Date(targetDateStr).getTime() - Date.now()) / MS_PER_MONTH;
  if (monthsAvailable <= 0) return 'Target date is in the past.';
  if (monthsNeeded > monthsAvailable * 1.05) {
    const yearsNeeded = monthsNeeded >= 12 ? `${(monthsNeeded / 12).toFixed(1)} yrs` : `${Math.ceil(monthsNeeded)} mo`;
    const yearsAvail = monthsAvailable >= 12 ? `${(monthsAvailable / 12).toFixed(1)} yrs` : `${Math.ceil(monthsAvailable)} mo`;
    return `At $${contrib.toLocaleString()}/mo you'll reach this in ${yearsNeeded} — your target is ${yearsAvail} away.`;
  }
  return null;
}

// ── Roadmap computation ───────────────────────────────────────────────────────

type OverallStatus = 'ahead' | 'on_track' | 'behind' | 'complete' | 'no_data';

interface PlanStep {
  icon: 'save' | 'spend' | 'rate' | 'setup';
  label: string;
  description: string;
}

interface RoadmapResult {
  overallStatus: OverallStatus;
  expectedByNow: number | null;
  plan: PlanStep[];
  estimatedCompletionDate: string | null;
  requiredMonthly: number | null;
}

export function computeRoadmap(goal: Goal, fp: FinancialProfile | null | undefined): RoadmapResult {
  const gap = Math.max(0, goal.targetAmount - goal.currentAmount);
  const monthly = goal.monthlyContribution ?? 0;
  const now = new Date();
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
      // Grace window: a brand-new deadline goal (created <3 days ago) has had
      // almost no time to accumulate savings. The interpolated expectedByNow is
      // a tiny positive number and currentAmount=0 would immediately trip the
      // 'behind' threshold. Clamp to 'on_track' for the first 3 days.
      const GRACE_MS = 3 * 24 * 60 * 60 * 1000;
      if (overallStatus === 'behind' && elapsedMs < GRACE_MS) {
        overallStatus = 'on_track';
      }
    }
  } else if (monthly > 0) {
    overallStatus = 'on_track';
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
  };
}

// ── Weekly milestones computation ─────────────────────────────────────────────

export interface WeekMilestone {
  weekIndex: number;
  weekDate: Date;
  dateLabel: string;
  expectedAmount: number;
  status: 'reached' | 'behind' | 'upcoming';
  isPast: boolean;
}

export function computeWeeklyMilestones(goal: Goal, confirmedMap: Map<number, number>): WeekMilestone[] {
  return computeGoalSchedule(goal).map((milestone) => {
    // ── Root Cause 2 fix: use the week's own confirmed amount for status ──
    // For past weeks with a logged confirmation, compare that actual figure
    // against the expected — not the goal's running currentAmount total.
    // Weeks without a confirmed entry fall back to currentAmount as a proxy,
    // but only allow a positive ('reached') inference from that proxy.
    // 'behind' is only asserted when there is explicit confirmed evidence that
    // the user fell short — never inferred from an absent/unlogged entry.
    // This prevents brand-new goals (currentAmount ≈ 0) from immediately
    // showing amber 'behind' markers that contradict an on_track status banner.
    const confirmedAmount = confirmedMap.get(milestone.weekIndex);
    let status: WeekMilestone['status'];
    if (!milestone.isPast) {
      status = 'upcoming';
    } else if (confirmedAmount !== undefined) {
      // Explicit progress log: trust it fully.
      status = confirmedAmount >= milestone.expectedAmount ? 'reached' : 'behind';
    } else {
      // No explicit log: use currentAmount as a positive proxy only.
      // If currentAmount already meets the bar, mark 'reached'; otherwise
      // stay neutral ('upcoming') — we cannot claim 'behind' without evidence.
      status = goal.currentAmount >= milestone.expectedAmount ? 'reached' : 'upcoming';
    }

    return {
      ...milestone,
      status,
    };
  });
}

// ── Status banner ─────────────────────────────────────────────────────────────

function StatusBanner({
  status, onAdjust, dismissed, onDismiss,
}: {
  status: OverallStatus;
  onAdjust: () => void;
  dismissed: boolean;
  onDismiss: () => void;
}) {
  if (dismissed || status === 'no_data') return null;

  if (status === 'complete') {
    return (
      <div className="flex items-center gap-3 bg-[#052e16] border border-[#22C55E]/30 rounded-2xl px-5 py-4">
        <CheckCircle2 size={18} className="text-[#22C55E] flex-shrink-0" />
        <span className="text-[#22C55E] font-bold text-sm">Goal achieved! 🎉</span>
      </div>
    );
  }

  if (status === 'ahead') {
    return (
      <div className="flex items-center justify-between bg-[#052e16] border border-[#22C55E]/30 rounded-2xl px-5 py-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 size={18} className="text-[#22C55E] flex-shrink-0" />
          <span className="text-[#22C55E] font-bold text-sm">Ahead of schedule — great work!</span>
        </div>
        <button type="button" onClick={onDismiss} className="text-[#22C55E]/60 text-xs font-semibold">✕</button>
      </div>
    );
  }

  if (status === 'behind') {
    return (
      <div className="flex flex-col gap-3 bg-[#451a03] border border-[#F59E0B]/30 rounded-2xl px-5 py-4">
        <div className="flex items-center gap-3">
          <AlertTriangle size={18} className="text-[#F59E0B] flex-shrink-0" />
          <span className="text-[#F59E0B] font-bold text-sm">Behind schedule — consider adjusting your plan</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onAdjust}
            className="flex-1 bg-[#F59E0B]/20 text-[#F59E0B] font-bold text-xs py-2 rounded-xl border border-[#F59E0B]/30"
          >
            Adjust Plan
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="flex-1 bg-white/5 text-[#808BA4] font-bold text-xs py-2 rounded-xl border border-white/5"
          >
            Keep Original
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ── Plan step row ─────────────────────────────────────────────────────────────

function PlanStepRow({ step, color }: { step: PlanStep; color: string }) {
  const Icon = step.icon === 'save' ? DollarSign : step.icon === 'spend' ? Zap : step.icon === 'rate' ? TrendingUp : DollarSign;
  return (
    <div className="flex items-start gap-3 py-4 border-b border-white/5 last:border-0">
      <div
        className="w-8 h-8 flex-shrink-0 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${color}18` }}
      >
        <Icon size={15} style={{ color }} />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-white font-bold text-sm leading-5">{step.label}</span>
        <span className="text-[#808BA4] font-semibold text-xs leading-4">{step.description}</span>
      </div>
    </div>
  );
}

// ── Weekly milestone row ──────────────────────────────────────────────────────

export function WeeklyMilestoneRow({
  milestone,
  color,
  isHistoryConfirmed,
  historyAmount,
  suggestedDeposit,
  isConfirming,
  confirmValue,
  onConfirmChange,
  onTap,
  onSave,
  onCancelConfirm,
  isSaving,
  saveError,
}: {
  milestone: WeekMilestone;
  color: string;
  isHistoryConfirmed: boolean;
  historyAmount?: number;
  suggestedDeposit?: number;
  isConfirming: boolean;
  confirmValue: string;
  onConfirmChange: (v: string) => void;
  onTap: () => void;
  onSave: () => void;
  onCancelConfirm: () => void;
  isSaving: boolean;
  saveError?: string;
}) {
  const { dateLabel, expectedAmount, status, isPast } = milestone;

  const markerColor =
    isHistoryConfirmed ? color
    : status === 'reached' ? color
    : status === 'behind' ? '#F59E0B'
    : 'rgba(255,255,255,0.12)';

  const labelColor =
    isHistoryConfirmed ? color
    : status === 'reached' ? color
    : status === 'behind' ? '#F59E0B'
    : '#4B5563';

  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        type="button"
        disabled={!isPast}
        onClick={isPast ? onTap : undefined}
        className={`w-full flex items-center gap-3 py-2.5 min-h-[44px] text-left ${isPast && !isConfirming ? 'active:opacity-70' : ''}`}
      >
        {/* Marker */}
        <div className="flex-shrink-0 w-5 flex items-center justify-center">
          {isHistoryConfirmed ? (
            // Confirmed via explicit progress log → medal icon with subtle glow
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 18, height: 18,
                backgroundColor: `${color}22`,
                boxShadow: `0 0 6px 1px ${color}44`,
              }}
            >
              <Award size={11} style={{ color }} />
            </div>
          ) : (
            // Unconfirmed (inferred from currentAmount) → rotating diamond
            <div
              style={{
                width: 12, height: 12,
                backgroundColor: status === 'reached' ? markerColor : 'transparent',
                border: `2px solid ${markerColor}`,
                borderRadius: 2,
                transform: 'rotate(45deg)',
              }}
            />
          )}
        </div>

        <div className="flex-1 flex items-center justify-between min-w-0">
          <span className="text-[#CBD5E1] font-semibold text-[13px]">{dateLabel}</span>
          <div className="flex items-center gap-2">
            {isHistoryConfirmed && historyAmount !== undefined ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[#808BA4] font-semibold text-[11px] line-through">{formatDollars(expectedAmount)}</span>
                <span className="font-bold text-[13px]" style={{ color }}>{formatDollars(historyAmount)}</span>
                <CheckCircle2 size={12} style={{ color }} />
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[13px]" style={{ color: labelColor }}>
                  {formatDollars(expectedAmount)}
                </span>
                {status === 'behind' && <AlertTriangle size={12} className="text-[#F59E0B]" />}
              </div>
            )}
          </div>
        </div>
      </button>

      {/* Inline confirm form */}
      {isConfirming && (
        <ConfirmForm
          expectedAmount={expectedAmount}
            suggestedDeposit={suggestedDeposit}
          confirmValue={confirmValue}
          onConfirmChange={onConfirmChange}
          onSave={onSave}
          onCancelConfirm={onCancelConfirm}
          isSaving={isSaving}
          saveError={saveError}
        />
      )}
    </div>
  );
}

export function ConfirmForm({
  expectedAmount,
  suggestedDeposit,
  confirmValue,
  onConfirmChange,
  onSave,
  onCancelConfirm,
  isSaving,
  saveError,
}: {
  expectedAmount: number;
  suggestedDeposit?: number;
  confirmValue: string;
  onConfirmChange: (v: string) => void;
  onSave: () => void;
  onCancelConfirm: () => void;
  isSaving: boolean;
  saveError?: string;
}) {
  const formRef = useRef<HTMLDivElement>(null);

  const scrollFormIntoView = useCallback(() => {
    // On iOS the visible space above the keyboard is tighter than on Android,
    // especially on small screens (iPhone SE / 13 mini — 375 × 667 viewport).
    // `block:'nearest'` only scrolls far enough to bring the element edge into
    // view, which can leave the form partially clipped when the confirming row
    // is near the bottom of a long milestone list.  `block:'center'` scrolls
    // more aggressively so the form lands in the middle of the remaining
    // viewport, guaranteeing full visibility regardless of list length.
    //
    // However, on large iPhones (Pro Max, Plus — 430 × 932 layout viewport the
    // iOS WKWebView reports before the keyboard appears) the visible area above
    // the keyboard is generous enough that the ConfirmForm is already fully in
    // view.  `block:'center'` does NOT no-op when the element is already
    // visible; it re-centers unconditionally, causing an unnecessary scroll
    // jump.  `block:'nearest'` IS a no-op when the element fits in the visible
    // area, so we use 'nearest' on tall screens.
    //
    // Threshold: 700 px layout height separates small iPhones (≤ 667 px — SE,
    // 13 mini) from large ones (≥ 844 px — iPhone 12 Pro and above).  Any
    // device whose innerHeight is below 700 px gets the aggressive center
    // scroll; taller devices fall back to nearest, which is a safe no-op when
    // the form is already in view.
    const isIos = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
    const isSmallScreen = window.innerHeight < 700;
    const block = (isIos && isSmallScreen) ? 'center' : 'nearest';
    formRef.current?.scrollIntoView({ behavior: 'smooth', block });
  }, []);

  useEffect(() => {
    // ── Strategy 1: Capacitor Keyboard plugin (Android / iOS native shell) ──
    // Event timing differs by platform:
    //
    // iOS WKWebView — `keyboardWillShow` fires *before* the slide-up animation
    // begins, so scrolling during the animation means the form is already
    // fully visible by the time the keyboard is up. `keyboardDidShow` would
    // fire too late and cause a visible jump.
    //
    // Android — `keyboardDidShow` fires *after* resize:'body' has taken effect
    // (body has been resized to the remaining viewport height). Scrolling at
    // this point is reliable and correct on Android.
    let cleanupNative: (() => void) | undefined;

    if (Capacitor.isNativePlatform()) {
      // Dynamically import so the web bundle never tries to resolve the plugin
      // on platforms where it isn't registered.
      import('@capacitor/keyboard').then(({ Keyboard }) => {
        // iOS: listen on keyboardWillShow (fires before the slide-up animation)
        // so we can scroll during the animation and the form is visible by the
        // time the keyboard is fully shown. On Android, keyboardWillShow fires
        // almost simultaneously with keyboardDidShow; we prefer keyboardDidShow
        // there because resize:'body' has already taken effect at that point.
        const listenerPromise = Capacitor.getPlatform() === 'ios'
          ? Keyboard.addListener('keyboardWillShow', scrollFormIntoView)
          : Keyboard.addListener('keyboardDidShow', scrollFormIntoView);
        listenerPromise.then((handle) => {
          cleanupNative = () => handle.remove();
        });
      }).catch(() => {
        // Plugin unavailable — fall through to the timeout strategy below.
      });
    }

    // ── Strategy 2: visualViewport resize (web browsers + Capacitor fallback) ──
    // When the soft keyboard opens the visible viewport shrinks; scrolling
    // after the resize fires is more reliable than a fixed 150 ms timeout.
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', scrollFormIntoView);
    }

    // ── Strategy 3: fixed-delay fallback ──
    // Covers very old WebViews that don't expose visualViewport.
    const timer = setTimeout(scrollFormIntoView, 150);

    return () => {
      cleanupNative?.();
      vv?.removeEventListener('resize', scrollFormIntoView);
      clearTimeout(timer);
    };
  }, [scrollFormIntoView]);

  return (
        <div ref={formRef} className="pb-3 pl-8 flex flex-col gap-2">
          <p className="text-[#808BA4] text-xs font-semibold">
            How much did you deposit this week?
          </p>
          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <ExecutiveInput
                label=""
                leftIcon={<span className="font-bold text-sm">$</span>}
                inputMode="decimal"
                placeholder={String(suggestedDeposit ?? expectedAmount)}
                value={confirmValue}
                onChange={(e) => onConfirmChange(e.target.value.replace(/[^0-9.]/g, ''))}
                autoFocus
              />
            </div>
            <button
              type="button"
              onClick={onCancelConfirm}
              className="text-[#808BA4] text-xs font-semibold px-3 py-2 min-h-[44px]"
            >
              Cancel
            </button>
            <ExecutiveButton
              text={isSaving ? '…' : 'Save'}
              icon={isSaving ? <Loader2 size={13} className="animate-spin" /> : undefined}
              disabled={isSaving}
              onClick={onSave}
              className="!py-2 !text-xs"
            />
          </div>
          {saveError && (
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={11} className="text-[#EF4444] flex-shrink-0" />
              <p className="text-[#EF4444] text-[11px] font-semibold leading-4">{saveError}</p>
            </div>
          )}
        </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function GoalDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: goal, isLoading } = useGetGoal(id ?? '');
  const { data: fpData } = useGetFinancialProfile();
  const { data: progressData } = useListGoalProgress(id ?? '');
  const { mutateAsync: updateGoal, isPending: updating } = useUpdateGoal();
  const { mutateAsync: logProgress, isPending: loggingProgress } = useCreateGoalProgress();
  const { mutateAsync: deleteGoal, isPending: deleting } = useDeleteGoal();

  // Map of weekIndex → derived running total and individual weekly deposit.
  // Entries arrive newest-first, so the first one remains authoritative.
  const confirmedMap = new Map<number, number>();
  const depositMap = new Map<number, number>();
  for (const entry of (progressData ?? [])) {
    if (!confirmedMap.has(entry.weekIndex)) {
      confirmedMap.set(entry.weekIndex, entry.confirmedAmount);
      depositMap.set(entry.weekIndex, entry.weeklyDeposit);
    }
  }

  // Chart data — past milestones with expected vs confirmed amounts
  // (computed here so it's available when JSX renders; only used when ≥2 confirmed)
  const buildChartPoints = () => {
    const past = computeWeeklyMilestones(goal!, confirmedMap).filter((m) => m.isPast);
    return past.map((m) => ({
      label: m.dateLabel,
      expected: m.expectedAmount,
      confirmed: confirmedMap.has(m.weekIndex) ? confirmedMap.get(m.weekIndex) : undefined,
    }));
  };
  const chartPoints = confirmedMap.size >= 2 ? buildChartPoints() : [];

  // Adjust plan form
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustContrib, setAdjustContrib] = useState('');
  const [adjustFrequency, setAdjustFrequency] = useState<'monthly' | 'weekly'>('monthly');
  const [adjustDate, setAdjustDate] = useState('');
  const [contribAutoFilled, setContribAutoFilled] = useState(false);
  const [dateAutoFilled, setDateAutoFilled] = useState(false);
  const [adjustFeasibility, setAdjustFeasibility] = useState<string | null>(null);

  // Inline target-amount edit
  const [editingTarget, setEditingTarget] = useState(false);
  const [editTargetValue, setEditTargetValue] = useState('');
  const [savingTarget, setSavingTarget] = useState(false);

  const handleSaveTarget = async () => {
    if (!goal) return;
    const newTarget = parseInt(editTargetValue.replace(/[^0-9]/g, ''), 10);
    if (isNaN(newTarget) || newTarget <= 0) {
      toast({ title: 'Enter a valid target amount', variant: 'destructive' });
      return;
    }
    setSavingTarget(true);
    try {
      await updateGoal({
        id: goal.id,
        data: {
          name: goal.name,
          type: goal.type,
          targetAmount: newTarget,
          currentAmount: goal.currentAmount,
          monthlyContribution: goal.monthlyContribution,
          paymentFrequency: (goal as { paymentFrequency?: string }).paymentFrequency ?? 'monthly',
          targetDate: goal.targetDate ?? null,
          status: goal.status,
          priority: goal.priority,
        },
      });
      // Patch caches immediately so Total Contributions updates without waiting for refetch
      queryClient.setQueryData(getListGoalsQueryKey(), (old: Goal[] | undefined) =>
        old?.map((g) => g.id === goal.id ? { ...g, targetAmount: newTarget } : g),
      );
      queryClient.setQueryData(getGetGoalQueryKey(goal.id), (old: Goal | undefined) =>
        old ? { ...old, targetAmount: newTarget } : old,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetGoalQueryKey(goal.id) }),
      ]);
      setEditingTarget(false);
      toast({ title: 'Target Updated' });
    } catch {
      toast({ title: 'Failed to update target', variant: 'destructive' });
    } finally {
      setSavingTarget(false);
    }
  };

  // ── Pin as Top Priority ───────────────────────────────────────────────────────
  const [togglingPin, setTogglingPin] = useState(false);
  const isPinned = (goal?.priority ?? 1) > 1;

  const handleTogglePriority = async () => {
    if (!goal) return;
    const newPriority = isPinned ? 1 : 2;
    setTogglingPin(true);
    try {
      await updateGoal({
        id: goal.id,
        data: {
          name: goal.name,
          type: goal.type,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount,
          monthlyContribution: goal.monthlyContribution,
          targetDate: goal.targetDate ?? null,
          status: goal.status,
          priority: newPriority,
        },
      });
      queryClient.setQueryData(getListGoalsQueryKey(), (old: Goal[] | undefined) =>
        old?.map((g) => g.id === goal.id ? { ...g, priority: newPriority } : g),
      );
      queryClient.setQueryData(getGetGoalQueryKey(goal.id), (old: Goal | undefined) =>
        old ? { ...old, priority: newPriority } : old,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetGoalQueryKey(goal.id) }),
      ]);
      toast({ title: isPinned ? 'Removed from Top Priority' : '⭐ Set as Top Priority' });
    } catch {
      toast({ title: 'Failed to update priority', variant: 'destructive' });
    } finally {
      setTogglingPin(false);
    }
  };

  // Status banner
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Weekly milestone confirm
  const [confirmingWeekIdx, setConfirmingWeekIdx] = useState<number | null>(null);
  const [confirmAmount, setConfirmAmount] = useState('');
  const [confirmError, setConfirmError] = useState<string | undefined>(undefined);
  const [milestoneExpanded, setMilestoneExpanded] = useState(false);

  if (isLoading || !goal) {
    return (
      <AppShell activeTab="goals" header={<AppHeader backTo="/goals" dashboardTitle="Goal Detail" />}>
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-[#2563EB]" />
        </div>
      </AppShell>
    );
  }

  const fp = fpData?.profile ?? null;
  const roadmap = computeRoadmap(goal, fp);
  const color = TYPE_COLORS[goal.type] ?? '#6B7280';
  const progress =
    goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;
  const progressTicks = [25, 50, 75].map((pct) => ({ pct, reached: progress >= pct }));

  const allMilestones = computeWeeklyMilestones(goal, confirmedMap);
  const pastMilestones = allMilestones.filter((m) => m.isPast);
  const futureMilestones = allMilestones.filter((m) => !m.isPast);
  const targetDatePassed = !!goal.targetDate && new Date(goal.targetDate) < new Date();
  // Show last 8 past + first 52 future unless expanded
  const PAST_CAP = 8;
  const FUTURE_CAP = 52;
  const visiblePast = milestoneExpanded ? pastMilestones : pastMilestones.slice(-PAST_CAP);
  const visibleFuture = milestoneExpanded ? futureMilestones : futureMilestones.slice(0, FUTURE_CAP);
  const hiddenCount =
    (pastMilestones.length - visiblePast.length) + (futureMilestones.length - visibleFuture.length);
  const shownMilestones = [...visiblePast, ...visibleFuture];

  const labelCls = 'text-[#808BA4] text-[10px] font-bold uppercase tracking-[1.5px] mb-3 block';

  // ── Adjust plan handlers ──────────────────────────────────────────────────

  const startAdjusting = () => {
    const freq = ((goal as { paymentFrequency?: string }).paymentFrequency ?? 'monthly') as 'monthly' | 'weekly';
    setAdjustFrequency(freq);
    // Show the amount in the unit matching current frequency (weekly goals → show weekly amount)
    const displayContrib = goal.monthlyContribution > 0
      ? String(freq === 'weekly' ? Math.round(goal.monthlyContribution * 12 / 52) : goal.monthlyContribution)
      : '';
    setAdjustContrib(displayContrib);
    setAdjustDate(goal.targetDate ?? '');
    setContribAutoFilled(false);
    setDateAutoFilled(false);
    setAdjustFeasibility(null);
    setIsAdjusting(true);
  };

  const handleContribBlur = () => {
    const contrib = parseInt(adjustContrib, 10);
    if (isNaN(contrib) || contrib <= 0) return;
    const monthlyContrib = toMonthlyContribution(contrib, adjustFrequency);
    if (!adjustDate) {
      // Auto-fill date
      const computed = calcCompletionDateStr(goal.currentAmount, goal.targetAmount, monthlyContrib);
      if (computed) { setAdjustDate(computed); setDateAutoFilled(true); }
    } else {
      // Both filled — check feasibility
      setAdjustFeasibility(feasibilityNote(goal.currentAmount, goal.targetAmount, monthlyContrib, adjustDate));
    }
  };

  const handleDateBlur = () => {
    if (!adjustDate) return;
    // Reject past dates immediately
    if (new Date(adjustDate) < new Date()) {
      setAdjustFeasibility('Target date is in the past — please choose a future date.');
      return;
    }
    if (!adjustContrib) {
      // Auto-fill contribution
      const monthlyRequired = calcRequiredContrib(goal.currentAmount, goal.targetAmount, adjustDate);
      if (monthlyRequired !== null) {
        setAdjustContrib(String(Math.ceil(fromMonthlyContribution(monthlyRequired, adjustFrequency))));
        setContribAutoFilled(true);
      }
    } else {
      const contrib = parseInt(adjustContrib, 10);
      const monthlyContrib = toMonthlyContribution(contrib || 0, adjustFrequency);
      setAdjustFeasibility(feasibilityNote(goal.currentAmount, goal.targetAmount, monthlyContrib, adjustDate));
    }
  };

  const handleSavePlan = async () => {
    const contribInput = parseInt(adjustContrib, 10);
    if (!adjustContrib.trim() || isNaN(contribInput) || contribInput <= 0) {
      toast({ title: `Enter a ${adjustFrequency} contribution`, variant: 'destructive' });
      return;
    }
    // Always persist monthly equivalent; weekly input × 52/12 → monthly
    const contrib = adjustFrequency === 'weekly'
      ? Math.round(contribInput * 52 / 12)
      : contribInput;
    try {
      await updateGoal({ id: goal.id, data: { monthlyContribution: contrib, paymentFrequency: adjustFrequency, targetDate: adjustDate || null } });
      // Patch caches immediately so the summary card on Goals Overview updates without waiting for refetch
      const patchedDate = adjustDate || null;
      queryClient.setQueryData(getListGoalsQueryKey(), (old: Goal[] | undefined) =>
        old?.map((g) => g.id === goal.id ? { ...g, monthlyContribution: contrib, paymentFrequency: adjustFrequency, targetDate: patchedDate } : g),
      );
      queryClient.setQueryData(getGetGoalQueryKey(goal.id), (old: Goal | undefined) =>
        old ? { ...old, monthlyContribution: contrib, paymentFrequency: adjustFrequency, targetDate: patchedDate } : old,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetGoalQueryKey(goal.id) }),
      ]);
      toast({ title: 'Plan Updated' });
      setIsAdjusting(false);
    } catch {
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
  };

  // ── Milestone confirm handler ─────────────────────────────────────────────

  const handleConfirmMilestone = async () => {
    if (confirmingWeekIdx === null) return;
    const amount = parseInt(confirmAmount.replace(/[^0-9]/g, ''), 10);
    if (!confirmAmount.trim() || isNaN(amount) || amount < 0) {
      toast({ title: 'Enter your saved amount', variant: 'destructive' });
      return;
    }
    setConfirmError(undefined);
    try {
      await logProgress({ id: goal.id, data: { weekIndex: confirmingWeekIdx, weeklyDeposit: amount } });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetGoalQueryKey(goal.id) }),
        queryClient.invalidateQueries({ queryKey: getListGoalProgressQueryKey(goal.id) }),
      ]);
      toast({ title: 'Weekly Deposit Saved', description: `${formatDollars(amount)} deposited for Week ${confirmingWeekIdx}.` });
      setConfirmingWeekIdx(null);
      setConfirmAmount('');
    } catch {
      // Keep the form open so the user can retry — show error inline + toast
      setConfirmError('Could not save — check your connection and try again.');
      toast({ title: 'Failed to log progress', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteGoal({ id: goal.id });
      await queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() });
      toast({ title: 'Goal Deleted', description: `"${goal.name}" removed.` });
      navigate('/goals');
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const selectCls =
    'w-full bg-[#111827] border border-[#2D3748] rounded-xl px-4 py-3 text-white text-sm font-semibold focus:outline-none focus:border-[#2563EB]/60 transition-colors';

  return (
    <AppShell activeTab="goals" header={<AppHeader backTo="/goals" dashboardTitle={goal.name} />}>
      <div className="flex flex-col gap-6 pb-8">

        {/* ── Goal title + type ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div
              className="self-start px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[1.5px]"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {TYPE_LABELS[goal.type] ?? goal.type}
            </div>
            {/* Top Priority pin */}
            <button
              type="button"
              disabled={togglingPin}
              onClick={handleTogglePriority}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors active:scale-95 min-h-[44px] min-w-[44px]"
              style={isPinned
                ? { borderColor: '#F59E0B40', backgroundColor: '#F59E0B12' }
                : { borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'transparent' }}
            >
              <Star
                size={13}
                className={isPinned ? 'fill-[#F59E0B] text-[#F59E0B]' : 'text-[#4B5563]'}
              />
              <span
                className="text-[10px] font-bold uppercase tracking-[1.2px]"
                style={{ color: isPinned ? '#F59E0B' : '#4B5563' }}
              >
                {isPinned ? 'Top Priority' : 'Set Priority'}
              </span>
            </button>
          </div>
          <h1 className="text-white font-bold text-[32px] leading-[38px]" style={{ letterSpacing: '-1px' }}>
            {goal.name}
          </h1>
        </div>

        {/* ── Status banner ──────────────────────────────────────────────── */}
        <StatusBanner
          status={roadmap.overallStatus}
          onAdjust={startAdjusting}
          dismissed={bannerDismissed}
          onDismiss={() => setBannerDismissed(true)}
        />

        {/* ── Progress card ──────────────────────────────────────────────── */}
        <div className="bg-[#111827] border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-end justify-between">
            <div className="flex flex-col gap-0.5">
              <span className={labelCls}>Progress</span>
              <span className="text-white font-bold text-3xl leading-9" style={{ letterSpacing: '-1px' }}>
                {formatDollars(goal.currentAmount)}
              </span>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              {editingTarget ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[#808BA4] font-semibold text-xs">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-28 bg-[#1F2937] border border-[#2563EB]/60 rounded-lg px-2 py-1 text-white text-xs font-bold text-right focus:outline-none"
                    value={editTargetValue}
                    autoFocus
                    onChange={(e) => setEditTargetValue(e.target.value.replace(/[^0-9]/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTarget();
                      if (e.key === 'Escape') setEditingTarget(false);
                    }}
                  />
                  <button
                    type="button"
                    disabled={savingTarget}
                    onClick={handleSaveTarget}
                    className="text-[#22C55E] active:opacity-60 -m-[15px] p-[15px] flex items-center justify-center"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTarget(false)}
                    className="text-[#808BA4] active:opacity-60 -m-[15px] p-[15px] flex items-center justify-center"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setEditTargetValue(String(goal.targetAmount)); setEditingTarget(true); }}
                  className="flex items-center gap-1 group -my-[16px] py-[16px] -mx-2 px-2"
                >
                  <span className="text-[#808BA4] font-semibold text-xs group-active:text-white transition-colors">
                    of {formatDollars(goal.targetAmount)}
                  </span>
                  <Pencil size={10} className="text-[#4B5563] group-active:text-[#808BA4] transition-colors" />
                </button>
              )}
              <span className="font-bold text-lg leading-7" style={{ color }}>{progress}%</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative h-2 bg-[#1F2937] rounded-full overflow-visible">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progress}%`, backgroundColor: color }}
            />
            {progressTicks.map((m) => (
              <div
                key={m.pct}
                className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none"
                style={{ left: `${m.pct}%`, transform: 'translateX(-50%)' }}
              >
                <div className="w-[2px] h-full rounded-full" style={{ backgroundColor: m.reached ? color : 'rgba(255,255,255,0.15)' }} />
                <div
                  className="absolute"
                  style={{
                    top: '-5px', width: 5, height: 5,
                    backgroundColor: m.reached ? color : '#374151',
                    border: `1.5px solid ${m.reached ? color : 'rgba(255,255,255,0.15)'}`,
                    borderRadius: 2, transform: 'rotate(45deg)',
                  }}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-white/5">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-[#22C55E]" />
              <span className="text-[#CBD5E1] font-semibold text-xs">
                {(goal as { paymentFrequency?: string }).paymentFrequency === 'weekly' ? 'Weekly' : 'Monthly'}
              </span>
            </div>
            <span className="text-white font-bold text-sm">
              {goal.monthlyContribution > 0
                ? (goal as { paymentFrequency?: string }).paymentFrequency === 'weekly'
                  ? `$${Math.round(goal.monthlyContribution * 12 / 52).toLocaleString()}/wk`
                  : `$${goal.monthlyContribution.toLocaleString()}/mo`
                : 'None set'}
            </span>
          </div>

          {goal.targetDate && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-[#808BA4]" />
                <span className="text-[#CBD5E1] font-semibold text-xs">Target Date</span>
              </div>
              <span className="text-white font-bold text-sm">
                {new Date(goal.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          )}

          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[#CBD5E1] font-semibold text-xs">Est. Completion</span>
              <p className="text-[#808BA4] text-[10px] mt-0.5 leading-tight">
                Estimated from monthly contribution
              </p>
            </div>
            <span className="text-white font-bold text-sm shrink-0">{roadmap.estimatedCompletionDate ?? 'TBD'}</span>
          </div>
        </div>

        {/* ── AI Roadmap ─────────────────────────────────────────────────── */}
        <div>
          <span className={labelCls}>AI Roadmap</span>
          <div className="bg-[#111827] border border-white/5 rounded-2xl px-5 py-1">
            {roadmap.plan.map((step, i) => (
              <PlanStepRow key={i} step={step} color={color} />
            ))}
          </div>
        </div>

        {/* ── Progress History Chart ─────────────────────────────────────── */}
        {confirmedMap.size >= 2 && (
          <div>
            <span className={labelCls}>Progress History</span>
            <div className="bg-[#111827] border border-white/5 rounded-2xl px-3 pt-4 pb-2">
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={chartPoints} margin={{ top: 2, right: 8, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#4B5563', fontSize: 9, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: '#4B5563', fontSize: 9, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    width={42}
                    tickFormatter={(v: number) => formatDollarsAxis(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#1F2937',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      fontSize: 12,
                      padding: '6px 10px',
                    }}
                    labelStyle={{ color: '#CBD5E1', fontWeight: 600, marginBottom: 2 }}
                    formatter={(value: unknown, name: string) => [
                      formatDollars(value as number),
                      name === 'confirmed' ? 'Confirmed' : 'Expected',
                    ]}
                  />
                  {/* Expected trajectory — dashed, muted */}
                  <Line
                    type="monotone"
                    dataKey="expected"
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    dot={false}
                    connectNulls
                  />
                  {/* Confirmed actuals — solid, goal colour */}
                  <Line
                    type="monotone"
                    dataKey="confirmed"
                    stroke={color}
                    strokeWidth={2}
                    dot={{ fill: color, r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 px-1 pb-1 mt-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-px border-t-2 border-dashed border-white/25" />
                  <span className="text-[#4B5563] text-[10px] font-semibold">Expected</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-0.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[#4B5563] text-[10px] font-semibold">Confirmed</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Weekly Milestones ──────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className={labelCls} style={{ marginBottom: 0 }}>Weekly Milestones</span>
            {allMilestones.length > 0 && (
              <span className="text-[#808BA4] text-[10px] font-semibold">Tap a past week to log progress</span>
            )}
          </div>

          {allMilestones.length === 0 ? (
            <div className={`border rounded-2xl px-5 py-4 ${targetDatePassed ? 'bg-[#1c1007] border-[#F59E0B]/30' : 'bg-[#111827] border-white/5'}`}>
              {targetDatePassed ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-[#F59E0B] flex-shrink-0" />
                    <span className="text-[#F59E0B] font-bold text-sm">Target date passed</span>
                  </div>
                  <p className="text-[#F59E0B]/80 text-xs font-semibold leading-4">
                    Your goal's target date ({new Date(goal.targetDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}) has passed.
                    Tap <strong>Adjust Plan</strong> below to set a new date.
                  </p>
                </div>
              ) : (
                <p className="text-[#808BA4] text-sm font-semibold text-center">
                  Set a monthly contribution or target date to see weekly milestones.
                </p>
              )}
            </div>
          ) : (
            <div className="bg-[#111827] border border-white/5 rounded-2xl px-5 py-1">
              {targetDatePassed && (
                <div className="flex items-start gap-2 py-3 border-b border-[#F59E0B]/20 mb-1">
                  <AlertTriangle size={13} className="text-[#F59E0B] flex-shrink-0 mt-0.5" />
                  <p className="text-[#F59E0B] text-xs font-semibold leading-4">
                    Target date ({new Date(goal.targetDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}) has passed — tap <strong>Adjust Plan</strong> to set a new date.
                  </p>
                </div>
              )}
              {pastMilestones.length > PAST_CAP && !milestoneExpanded && (
                <button
                  type="button"
                  onClick={() => setMilestoneExpanded(true)}
                  className="w-full text-center text-[#808BA4] text-xs font-semibold py-2"
                >
                  ↑ {pastMilestones.length - PAST_CAP} earlier weeks hidden
                </button>
              )}

              {shownMilestones.map((m) => {
                const histAmt = confirmedMap.get(m.weekIndex);
                const weeklyDeposit = depositMap.get(m.weekIndex);
                return (
                  <WeeklyMilestoneRow
                    key={m.weekIndex}
                    milestone={m}
                    color={color}
                    isHistoryConfirmed={confirmedMap.has(m.weekIndex)}
                    historyAmount={histAmt}
                    suggestedDeposit={Math.max(0, Math.round(goal.monthlyContribution * 12 / 52))}
                    isConfirming={confirmingWeekIdx === m.weekIndex}
                    confirmValue={confirmAmount}
                    onConfirmChange={(v) => { setConfirmAmount(v); setConfirmError(undefined); }}
                    onTap={() => {
                      setConfirmingWeekIdx(m.weekIndex);
                      // The user edits the one deposit for this week; the API
                      // calculates the running total displayed in the row.
                      setConfirmAmount(weeklyDeposit !== undefined ? String(weeklyDeposit) : '');
                      setConfirmError(undefined);
                    }}
                    onSave={handleConfirmMilestone}
                    onCancelConfirm={() => {
                      setConfirmingWeekIdx(null);
                      setConfirmAmount(''); // explicit clean slate
                      setConfirmError(undefined);
                    }}
                    isSaving={loggingProgress}
                    saveError={confirmingWeekIdx === m.weekIndex ? confirmError : undefined}
                  />
                );
              })}

              {hiddenCount > 0 && !milestoneExpanded && futureMilestones.length > FUTURE_CAP && (
                <button
                  type="button"
                  onClick={() => setMilestoneExpanded(true)}
                  className="w-full text-center text-[#808BA4] text-xs font-semibold py-2"
                >
                  + {hiddenCount} more weeks — tap to expand
                </button>
              )}
              {milestoneExpanded && (
                <button
                  type="button"
                  onClick={() => setMilestoneExpanded(false)}
                  className="w-full text-center text-[#808BA4] text-xs font-semibold py-2"
                >
                  Collapse
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Adjust Plan ────────────────────────────────────────────────── */}
        <div>
          <span className={labelCls}>Plan</span>
          {isAdjusting ? (
            <div className="flex flex-col gap-3">
              {/* Payment frequency toggle */}
              <div>
                <label className="text-[#808BA4] text-[10px] font-bold uppercase tracking-[1.5px] mb-1.5 block">
                  Payment Frequency
                </label>
                <div className="flex gap-2">
                  {(['monthly', 'weekly'] as const).map((freq) => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => {
                        setAdjustFrequency(freq);
                        setAdjustContrib('');
                        setContribAutoFilled(false);
                        setAdjustFeasibility(null);
                      }}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors ${
                        adjustFrequency === freq
                          ? 'bg-[#2563EB] border-[#2563EB] text-white'
                          : 'bg-[#0A0F1E] border-[#2D3748] text-[#808BA4]'
                      }`}
                    >
                      {freq === 'monthly' ? 'Monthly' : 'Weekly'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[#808BA4] text-[10px] font-bold uppercase tracking-[1.5px] mb-1.5 block">
                  {adjustFrequency === 'weekly' ? 'Weekly Contribution' : 'Monthly Contribution'}
                </label>
                <div className="relative">
                  <ExecutiveInput
                    label=""
                    leftIcon={<span className="font-bold">$</span>}
                    inputMode="decimal"
                    placeholder={adjustFrequency === 'weekly' ? 'e.g. 375' : 'e.g. 1500'}
                    value={adjustContrib}
                    onChange={(e) => {
                      setAdjustContrib(e.target.value.replace(/[^0-9.]/g, ''));
                      setContribAutoFilled(false);
                      setAdjustFeasibility(null);
                    }}
                    onBlur={handleContribBlur}
                    autoFocus
                    className={contribAutoFilled ? 'italic opacity-70' : ''}
                  />
                  {contribAutoFilled && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#2563EB] font-bold pointer-events-none">auto</span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[#808BA4] text-[10px] font-bold uppercase tracking-[1.5px] mb-1.5 flex items-center gap-1.5">
                  <CalendarDays size={11} />
                  Target Completion Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={adjustDate}
                    min={today}
                    onChange={(e) => {
                      setAdjustDate(e.target.value);
                      setDateAutoFilled(false);
                      setAdjustFeasibility(null);
                    }}
                    onBlur={handleDateBlur}
                    className={`${selectCls} appearance-none${dateAutoFilled ? ' italic opacity-70' : ''}`}
                    style={{ colorScheme: 'dark' }}
                  />
                  {dateAutoFilled && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#2563EB] font-bold pointer-events-none">auto</span>
                  )}
                </div>
              </div>

              {adjustFeasibility && (
                <div className="flex items-start gap-2 bg-[#451a03] border border-[#F59E0B]/30 rounded-xl px-4 py-3">
                  <AlertTriangle size={13} className="text-[#F59E0B] flex-shrink-0 mt-0.5" />
                  <p className="text-[#F59E0B] text-xs font-semibold leading-4">{adjustFeasibility}</p>
                </div>
              )}

              <div className="flex gap-3">
                <ExecutiveButton
                  variant="outline"
                  text="Cancel"
                  className="flex-1"
                  onClick={() => setIsAdjusting(false)}
                />
                <ExecutiveButton
                  text={updating ? 'Saving…' : 'Save Plan'}
                  icon={updating ? <Loader2 size={16} className="animate-spin" /> : undefined}
                  className="flex-1"
                  disabled={updating}
                  onClick={handleSavePlan}
                />
              </div>
            </div>
          ) : (
            <ExecutiveButton text="Adjust Contribution & Date" onClick={startAdjusting} />
          )}
        </div>

        {/* ── Remove goal ────────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center justify-center gap-2 text-[#EF4444] text-sm font-semibold py-2 opacity-70 hover:opacity-100 transition-opacity disabled:opacity-40"
        >
          {deleting ? <Loader2 size={14} className="animate-spin" /> : null}
          Remove Goal
        </button>
      </div>
    </AppShell>
  );
}
