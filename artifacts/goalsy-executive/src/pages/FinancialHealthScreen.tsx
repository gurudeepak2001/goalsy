import { useMemo } from 'react';
import { useLocation } from 'wouter';
import {
  TrendingUp,
  Activity,
  AlertTriangle,
  ShieldCheck,
  Receipt,
  ChevronRight,
  Wallet,
  CalendarClock,
  Loader2,
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';

import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import { isPlaidLiabilityAccount } from '@/lib/plaidBalances';

import {
  useGetFinancialProfile,
  useGetPlaidAccounts,
  useListGoals,
  useListExpenses,
  useListBills,
  useGetScore,
  useGetScoreHistory,
} from '@workspace/api-client-react';
import type { Expense } from '@workspace/api-client-react';

function toMonthly(e: Expense): number {
  return e.frequency === 'weekly' ? Math.round(e.amount * 52 / 12) : e.amount;
}

function formatDateLabel(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function SectionHeading({ icon, iconColor, text, action }: { icon: React.ReactNode; iconColor: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0" style={{ color: iconColor }}>
          {icon}
        </div>
        <span className="text-[#808BA4] font-bold text-xs uppercase tracking-[1.5px]">{text}</span>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

function CardState({ loading, error, empty, emptyMsg, children }: {
  loading?: boolean,
  error?: boolean,
  empty?: boolean,
  emptyMsg?: string,
  children: React.ReactNode
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-6" role="status" aria-label="Loading financial data">
        <Loader2 size={24} className="animate-spin text-[#3B82F6]" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-2xl border border-[#EF4444]/20 bg-[#EF4444]/10 px-4 py-5 text-center">
        <p className="text-[#FCA5A5] font-semibold text-sm">This information is temporarily unavailable. Your saved data was not changed.</p>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="flex flex-col items-center justify-center py-6 gap-3 text-center">
        <p className="text-[#808BA4] font-semibold text-sm">{emptyMsg}</p>
      </div>
    );
  }
  return <>{children}</>;
}

export default function FinancialHealthScreen() {
  const [, navigate] = useLocation();

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const { data: profileRes, isLoading: profileLoading, isError: profileError } = useGetFinancialProfile();
  const { data: plaidAccountsRes, isLoading: plaidLoading, isError: plaidError } = useGetPlaidAccounts();
  const { data: goals, isLoading: goalsLoading, isError: goalsError } = useListGoals();
  const { data: expenses = [], isLoading: expensesLoading, isError: expensesError } = useListExpenses({ month: currentMonth });
  const { data: bills, isLoading: billsLoading, isError: billsError } = useListBills();
  const { data: scoreRes, isLoading: scoreLoading, isError: scoreError } = useGetScore();
  const { data: scoreHistory } = useGetScoreHistory();

  const profile = profileRes?.profile;
  const income = (profile?.annualIncome ?? 0) / 12;
  const trackedExpenses = expenses.reduce((sum, e) => sum + toMonthly(e), 0);
  const monthlyExpenses = profile?.monthlyExpenses && profile.monthlyExpenses > 0
    ? profile.monthlyExpenses
    : trackedExpenses;
  const cashFlowSurplus = income - monthlyExpenses;
  const cashFlowPercent = income > 0 ? (monthlyExpenses / income) * 100 : 0;
  const visualCashFlowPercent = Math.min(100, Math.max(0, cashFlowPercent));

  const score = scoreRes?.score;
  const tier = scoreRes?.tier;
  const sparklineData = useMemo(() => {
    return (scoreHistory ?? []).slice(0, 10).reverse().map((h, i) => ({ i, score: h.score }));
  }, [scoreHistory]);

  const allLiabilityAccounts = (plaidAccountsRes?.accounts ?? []).filter(isPlaidLiabilityAccount);
  const liabilityAccounts = allLiabilityAccounts.filter((account) =>
    !account.currencyCode || account.currencyCode === 'USD',
  );
  const hasUnsupportedCurrency = liabilityAccounts.length !== allLiabilityAccounts.length;
  const unavailableDebtBalances = liabilityAccounts.filter((account) => account.currentBalance == null).length;
  const creditAccounts = liabilityAccounts.filter((account) => account.type === 'credit');
  const loanAccounts = liabilityAccounts.filter((account) => account.type === 'loan');
  const totalCreditLimit = creditAccounts.reduce((sum, a) => sum + (a.creditLimit ?? 0), 0);
  const totalCreditDebt = creditAccounts.reduce((sum, a) => sum + (a.currentBalance ?? 0), 0);
  const totalLoanDebt = loanAccounts.reduce((sum, a) => sum + (a.currentBalance ?? 0), 0);
  const totalDebt = totalCreditDebt + totalLoanDebt;
  const utilization = totalCreditLimit > 0 ? (totalCreditDebt / totalCreditLimit) * 100 : 0;

  const emergencyGoal = (goals ?? []).find((goal) => goal.type === 'emergency_fund');
  const emergencyPct = emergencyGoal && emergencyGoal.targetAmount > 0
    ? Math.min(100, (emergencyGoal.currentAmount / emergencyGoal.targetAmount) * 100)
    : 0;

  const todayKey = now.toLocaleDateString('en-CA');
  const unpaidBills = (bills ?? [])
    .filter((bill) => !bill.isPaid)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 3);

  const expensesByCategory = useMemo(() => {
    const acc: Record<string, number> = {};
    expenses.forEach(e => {
      acc[e.category] = (acc[e.category] || 0) + toMonthly(e);
    });
    return Object.entries(acc)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [expenses]);

  return (
    <AppShell activeTab="goals" header={<AppHeader dashboard dashboardTitle="Financial Health" />}>
      <div className="flex flex-col gap-6 pb-24">

        {/* Cash Flow */}
        <div className="bg-[#111827] border border-white/5 rounded-3xl p-6 flex flex-col">
          <SectionHeading
            icon={<TrendingUp size={18} />}
            iconColor="#22C55E"
            text="Monthly Budget Estimate"
            action={
              <button type="button" onClick={() => navigate('/financial-connection')} className="min-h-11 px-3 text-[#3B82F6] text-[10px] font-bold uppercase tracking-[1px] hover:text-[#2563EB] transition-colors">
                Update Profile
              </button>
            }
          />
          <CardState
            loading={profileLoading || expensesLoading}
            error={profileError || expensesError}
            empty={income <= 0}
            emptyMsg="Set your annual income to track monthly cash flow."
          >
            <div className="flex flex-col gap-1 mt-1">
              <span className="text-[#808BA4] font-semibold text-xs uppercase tracking-[1px]">Estimated Remainder</span>
              <span className={`font-bold text-4xl tracking-tight ${cashFlowSurplus >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                {cashFlowSurplus >= 0 ? '+' : '-'}${Math.abs(cashFlowSurplus).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex flex-col gap-2 mt-5">
              <div className="flex items-center justify-between text-[11px] font-semibold">
                 <span className="text-white">
                   Estimated expenses: ${monthlyExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                 </span>
                 <span className="text-[#808BA4]">Income: ${income.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="h-1.5 w-full bg-[#1F2937] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${cashFlowPercent > 90 ? 'bg-[#EF4444]' : 'bg-[#22C55E]'}`}
                  style={{
                    width: `${visualCashFlowPercent}%`,
                    boxShadow: cashFlowPercent > 90 ? '0px 0px 10px rgba(239, 68, 68, 0.2)' : '0px 0px 10px rgba(34, 197, 94, 0.15)'
                  }}
                />
              </div>
            </div>
          </CardState>
        </div>

        {/* Goalsy Score */}
        <button
          type="button"
          onClick={() => navigate('/score')}
          className="w-full text-left bg-[#111827] border border-white/5 rounded-3xl p-6 flex flex-col hover:bg-[#161F2E] active:scale-[0.98] transition-all"
        >
          <SectionHeading
            icon={<Activity size={18} />}
            iconColor="#3B82F6"
            text="Goalsy Score"
            action={<ChevronRight size={18} className="text-[#808BA4]" />}
          />
          <CardState loading={scoreLoading} error={scoreError} empty={!score} emptyMsg="Your score is being calculated. Check back soon.">
            <div className="flex items-end justify-between mt-1">
              <div className="flex flex-col gap-1">
                <span className="text-white font-bold text-5xl tracking-tight leading-none">{score}</span>
                <span className="text-[#3B82F6] font-bold text-sm">{tier}</span>
              </div>
              {sparklineData.length > 1 && (
                <div className="w-24 h-12 -mb-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparklineData}>
                      <defs>
                        <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <YAxis domain={['dataMin - 10', 'dataMax + 10']} hide />
                      <Area type="monotone" dataKey="score" stroke="#3B82F6" strokeWidth={2} fill="url(#sparkGradient)" isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </CardState>
        </button>

        {/* Debt & Utilization */}
        <div className="bg-[#111827] border border-white/5 rounded-3xl p-6 flex flex-col">
          <SectionHeading
            icon={<AlertTriangle size={18} />}
            iconColor="#F59E0B"
            text="Debt & Utilization"
            action={
              <button type="button" onClick={() => navigate('/financial-connection')} className="min-h-11 px-3 text-[#3B82F6] text-[10px] font-bold uppercase tracking-[1px] hover:text-[#2563EB] transition-colors">
                Manage
              </button>
            }
          />
          <CardState
            loading={plaidLoading}
            error={plaidError}
            empty={!plaidAccountsRes?.accounts.length}
            emptyMsg="Connect your accounts to monitor your credit utilization."
          >
            {liabilityAccounts.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-[#808BA4] font-semibold text-sm">No debt accounts linked.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-5 mt-1">
                <div className="flex gap-4">
                  <div className="flex-1 bg-[#1F2937]/50 border border-white/5 rounded-2xl p-4 flex flex-col gap-1">
                     <span className="text-[#808BA4] font-bold text-[10px] uppercase tracking-[1px]">
                       {unavailableDebtBalances ? 'Known Debt' : 'Total Debt'}
                     </span>
                     <span className="text-white font-bold text-2xl tracking-tight">${totalDebt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                 <p className="text-[#808BA4] text-[11px] font-semibold">
                   Based on the latest saved balances from your linked institutions.
                 </p>
                 {(unavailableDebtBalances > 0 || hasUnsupportedCurrency) && (
                   <p className="text-[#F59E0B] text-[11px] font-semibold">
                     {unavailableDebtBalances > 0 ? `${unavailableDebtBalances} debt balance${unavailableDebtBalances === 1 ? ' is' : 's are'} unavailable. ` : ''}
                     {hasUnsupportedCurrency ? 'Non-USD accounts are excluded from this USD total.' : ''}
                   </p>
                 )}
                  <div className="flex-1 bg-[#1F2937]/50 border border-white/5 rounded-2xl p-4 flex flex-col gap-1">
                    <span className="text-[#808BA4] font-bold text-[10px] uppercase tracking-[1px]">Utilization</span>
                     <span className={`font-bold text-2xl tracking-tight ${totalCreditLimit > 0 && utilization > 30 ? 'text-[#EF4444]' : 'text-white'}`}>
                       {totalCreditLimit > 0 ? `${utilization.toFixed(1)}%` : 'Unavailable'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 mt-1">
                  <div className="flex justify-between text-[11px] font-semibold">
                    <span className="text-white">Credit Used</span>
                    <span className="text-[#808BA4]">Total Limit: ${totalCreditLimit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                   {totalCreditLimit > 0 ? (
                     <div className="h-1.5 w-full bg-[#1F2937] rounded-full overflow-hidden">
                       <div
                         className={`h-full rounded-full transition-all duration-700 ${utilization > 30 ? 'bg-[#EF4444]' : utilization > 10 ? 'bg-[#F59E0B]' : 'bg-[#22C55E]'}`}
                         style={{ width: `${Math.min(100, utilization)}%` }}
                       />
                     </div>
                   ) : (
                     <p className="text-[#808BA4] text-[11px] font-semibold">No credit limits were provided by the linked institutions.</p>
                   )}
                </div>
              </div>
            )}
          </CardState>
        </div>

        {/* Emergency Fund */}
        <button
          type="button"
          onClick={() => emergencyGoal ? navigate(`/goals/${emergencyGoal.id}`) : navigate('/goals')}
          className="w-full text-left bg-[#111827] border border-white/5 rounded-3xl p-6 flex flex-col hover:bg-[#161F2E] active:scale-[0.98] transition-all"
        >
          <SectionHeading
            icon={<ShieldCheck size={18} />}
            iconColor="#2563EB"
            text="Emergency Fund"
            action={<ChevronRight size={18} className="text-[#808BA4]" />}
          />
          <CardState
            loading={goalsLoading}
            error={goalsError}
            empty={!emergencyGoal}
            emptyMsg="You don't have an emergency fund goal yet. Tap to create one."
          >
            {emergencyGoal && (
              <div className="flex flex-col gap-4 mt-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-white font-bold text-3xl tracking-tight">${emergencyGoal.currentAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  <span className="text-[#808BA4] font-semibold text-sm">/ ${emergencyGoal.targetAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="h-1.5 w-full bg-[#1F2937] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#2563EB] transition-all duration-700"
                    style={{ width: `${emergencyPct}%`, boxShadow: '0px 0px 10px rgba(37, 99, 235, 0.15)' }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#2563EB] font-bold text-xs uppercase tracking-[0.5px]">{emergencyPct.toFixed(0)}% Complete</span>
                  <span className="text-[#CBD5E1] font-semibold text-[11px]">
                    ${Math.max(0, emergencyGoal.targetAmount - emergencyGoal.currentAmount).toLocaleString(undefined, { maximumFractionDigits: 0 })} to go
                  </span>
                </div>
              </div>
            )}
          </CardState>
        </button>

        {/* Current Expenses */}
        <button
          type="button"
          onClick={() => navigate('/expenses')}
          className="w-full text-left bg-[#111827] border border-white/5 rounded-3xl p-6 flex flex-col hover:bg-[#161F2E] active:scale-[0.98] transition-all"
        >
          <SectionHeading
            icon={<Receipt size={18} />}
            iconColor="#EC4899"
            text="Current Expenses"
            action={<ChevronRight size={18} className="text-[#808BA4]" />}
          />
          <CardState
            loading={expensesLoading}
            error={expensesError}
            empty={expenses.length === 0}
            emptyMsg="No expenses logged this month. Tap to log."
          >
            <div className="flex flex-col gap-4 mt-1">
              <div className="flex items-end gap-2">
                <span className="text-white font-bold text-3xl tracking-tight leading-none">${trackedExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                <span className="text-[#808BA4] font-semibold text-sm mb-0.5">tracked this month</span>
              </div>
              {expensesByCategory.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-2">
                  {expensesByCategory.map(([cat, amount]) => (
                    <div key={cat} className="bg-[#1F2937]/50 border border-white/5 rounded-lg px-2.5 py-1 flex items-center gap-1.5">
                      <span className="text-[#CBD5E1] font-semibold text-[10px] uppercase tracking-[0.5px]">{cat}</span>
                      <span className="text-white font-bold text-[10px]">${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardState>
        </button>

        {/* Upcoming Obligations */}
        <div className="bg-[#111827] border border-white/5 rounded-3xl p-6 flex flex-col">
          <SectionHeading
            icon={<CalendarClock size={18} />}
            iconColor="#06B6D4"
            text="Unpaid Bills"
            action={
              <button type="button" onClick={() => navigate('/calendar')} className="min-h-11 px-3 text-[#3B82F6] text-[10px] font-bold uppercase tracking-[1px] hover:text-[#2563EB] transition-colors">
                View Calendar
              </button>
            }
          />
          <CardState
            loading={billsLoading}
            error={billsError}
            empty={unpaidBills.length === 0}
            emptyMsg="You're all caught up! No pending bills."
          >
            <div className="flex flex-col gap-3 mt-1">
              {unpaidBills.map(bill => (
                <div key={bill.id} className="bg-[#1F2937]/50 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-[#808BA4]">
                      <Wallet size={14} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-white font-semibold text-sm">{bill.name}</span>
                      <span className={`font-semibold text-[11px] ${bill.dueDate < todayKey ? 'text-[#EF4444]' : 'text-[#808BA4]'}`}>
                        {bill.dueDate < todayKey ? 'Overdue' : 'Due'} {formatDateLabel(bill.dueDate)}
                      </span>
                    </div>
                  </div>
                  <span className="text-white font-bold text-base">${bill.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              ))}
            </div>
          </CardState>
        </div>

      </div>
    </AppShell>
  );
}
