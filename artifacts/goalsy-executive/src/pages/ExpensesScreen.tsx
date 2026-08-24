import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Loader2, Receipt } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';

import AppModal from '@/components/AppModal';
import ExecutiveButton from '@/components/ExecutiveButton';
import ExecutiveInput from '@/components/ExecutiveInput';
import {
  useListExpenses,
  useCreateExpense,
  useDeleteExpense,
  getListExpensesQueryKey,
} from '@workspace/api-client-react';
import type { Expense } from '@workspace/api-client-react';

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Food',
  'Entertainment',
  'Travel',
  'Rent/Housing',
  'Subscriptions',
  'Shopping',
  'Utilities',
  'Other',
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  'Food':          '#F59E0B',
  'Entertainment': '#8B5CF6',
  'Travel':        '#06B6D4',
  'Rent/Housing':  '#2563EB',
  'Subscriptions': '#EC4899',
  'Shopping':      '#F97316',
  'Utilities':     '#22C55E',
  'Other':         '#64748B',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return '$' + n.toLocaleString();
}

/** Normalise an expense to its monthly-equivalent dollar amount. */
function toMonthly(e: Expense): number {
  return e.frequency === 'weekly' ? Math.round(e.amount * 52 / 12) : e.amount;
}

/** Format a Date as "August 2026". */
function formatMonth(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** Format a Date as "YYYY-MM" for API queries and expense date storage. */
function toYearMonth(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Advance a month date by ±1 months. */
function shiftMonth(d: Date, delta: number): Date {
  const next = new Date(d);
  next.setMonth(next.getMonth() + delta);
  next.setDate(1);
  return next;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExpensesScreen() {
  const queryClient = useQueryClient();

  // ── Month navigation ───────────────────────────────────────────────────────
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => {
    const now = new Date();
    now.setDate(1);
    return now;
  });
  const monthKey = toYearMonth(selectedMonth);

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data: expenses = [], isLoading } = useListExpenses({ month: monthKey });
  const { mutateAsync: createExpense, isPending: creating } = useCreateExpense();
  const { mutateAsync: deleteExpense } = useDeleteExpense();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey({ month: monthKey }) });

  // ── Summary maths ──────────────────────────────────────────────────────────
  const totalMonthly = useMemo(
    () => expenses.reduce((sum, e) => sum + toMonthly(e), 0),
    [expenses],
  );
  const totalWeekly = Math.round(totalMonthly * 12 / 52);

  // Group by category, sorted by total desc
  const byCategory = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of expenses) {
      const list = map.get(e.category) ?? [];
      list.push(e);
      map.set(e.category, list);
    }
    return Array.from(map.entries())
      .map(([cat, items]) => ({
        category: cat,
        items,
        total: items.reduce((s, e) => s + toMonthly(e), 0),
      }))
      .sort((a, b) => b.total - a.total);
  }, [expenses]);

  // ── Add expense form ───────────────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [newCategory, setNewCategory] = useState<string>('Food');
  const [newAmount, setNewAmount] = useState('');
  const [newFrequency, setNewFrequency] = useState<'monthly' | 'weekly'>('monthly');
  const [newNote, setNewNote] = useState('');

  const resetForm = () => {
    setNewCategory('Food');
    setNewAmount('');
    setNewFrequency('monthly');
    setNewNote('');
  };

  const handleAdd = async () => {
    const amount = parseInt(newAmount.replace(/[^0-9]/g, ''), 10);
    if (!newCategory || isNaN(amount) || amount <= 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      return;
    }
    try {
      await createExpense({
        data: {
          category: newCategory,
          amount,
          frequency: newFrequency,
          expenseDate: `${monthKey}-01`,
          note: newNote.trim() || null,
        },
      });
      await invalidate();
      resetForm();
      setAddOpen(false);
      toast({ title: 'Expense added' });
    } catch {
      toast({ title: 'Failed to add expense', variant: 'destructive' });
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteExpense({ id });
      await invalidate();
      toast({ title: 'Expense removed' });
    } catch {
      toast({ title: 'Failed to remove expense', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const selectCls =
    'w-full bg-[#111827] border border-[#2D3748] rounded-xl px-4 py-3 text-white text-sm font-semibold appearance-none focus:outline-none focus:border-[#2563EB]/60 transition-colors cursor-pointer';
  const labelCls =
    'text-[#808BA4] text-[10px] font-bold uppercase tracking-[1.5px] mb-1.5 block';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AppShell activeTab="goals" header={<AppHeader backTo="/goals" dashboardTitle="Expenses" />}>
      <div className="flex flex-col gap-6 pb-24">

        {/* ── Title ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1">
          <span className="text-[#808BA4] font-semibold text-sm uppercase" style={{ letterSpacing: '2px' }}>
            Spending Tracker
          </span>
          <h1 className="text-white font-bold text-[32px] leading-tight" style={{ letterSpacing: '-0.8px' }}>
            Monthly Expenses
          </h1>
        </div>

        {/* ── Month selector ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between bg-[#111827] border border-white/5 rounded-2xl px-5 py-3">
          <button
            type="button"
            onClick={() => setSelectedMonth((m) => shiftMonth(m, -1))}
            className="p-1.5 rounded-lg text-[#808BA4] active:text-white transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-white font-bold text-base">{formatMonth(selectedMonth)}</span>
          <button
            type="button"
            onClick={() => setSelectedMonth((m) => shiftMonth(m, 1))}
            className="p-1.5 rounded-lg text-[#808BA4] active:text-white transition-colors"
            disabled={monthKey >= toYearMonth(new Date())}
          >
            <ChevronRight size={20} className={monthKey >= toYearMonth(new Date()) ? 'opacity-30' : ''} />
          </button>
        </div>

        {/* ── Summary card ──────────────────────────────────────────────── */}
        <div className="bg-[#111827] border border-white/5 rounded-2xl px-5 py-4 flex flex-col gap-3">
          <span className="text-[#808BA4] text-[10px] font-bold uppercase tracking-[1.5px]">
            Total Expenses — {formatMonth(selectedMonth)}
          </span>
          {isLoading ? (
            <Loader2 size={20} className="animate-spin text-[#2563EB]" />
          ) : expenses.length === 0 ? (
            <p className="text-[#808BA4] font-semibold text-sm">No expenses logged yet.</p>
          ) : (
            <div className="flex items-stretch">
              <div className="flex-1 flex flex-col gap-0.5">
                <span className="text-[#808BA4] text-[10px] font-bold uppercase tracking-[1px]">Per Week</span>
                <span className="text-white font-bold text-[26px] leading-tight">{fmt(totalWeekly)}</span>
              </div>
              <div className="w-px bg-white/5 mx-4" />
              <div className="flex-1 flex flex-col gap-0.5">
                <span className="text-[#808BA4] text-[10px] font-bold uppercase tracking-[1px]">Per Month</span>
                <span className="text-white font-bold text-[26px] leading-tight">{fmt(totalMonthly)}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Add button ────────────────────────────────────────────────── */}
        <ExecutiveButton
          text="Add Expense"
          icon={<Plus size={16} />}
          onClick={() => setAddOpen(true)}
        />

        {/* ── Category breakdown ────────────────────────────────────────── */}
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={28} className="animate-spin text-[#2563EB]" />
          </div>
        ) : byCategory.length === 0 ? (
          <div className="bg-[#111827] border border-white/5 rounded-3xl p-8 flex flex-col items-center gap-5 text-center">
            <div className="w-14 h-14 bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-2xl flex items-center justify-center">
              <Receipt size={28} className="text-[#2563EB]" />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-white font-bold text-lg leading-6">No Expenses Yet</h3>
              <p className="text-[#808BA4] font-semibold text-sm leading-5">
                Add your first expense to start tracking where your money goes.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {byCategory.map(({ category, items, total }) => {
              const color = CATEGORY_COLORS[category] ?? '#64748B';
              const pct = totalMonthly > 0 ? Math.round((total / totalMonthly) * 100) : 0;
              return (
                <div key={category} className="bg-[#111827] border border-white/5 rounded-2xl overflow-hidden">
                  {/* Category header */}
                  <div className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-white font-bold text-sm">{category}</span>
                      <span className="text-[#808BA4] text-xs font-semibold">{pct}%</span>
                    </div>
                    <span className="text-white font-bold text-sm">{fmt(total)}<span className="text-[#808BA4] font-semibold text-xs">/mo</span></span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-0.5 bg-white/5">
                    <div
                      className="h-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                  {/* Individual entries */}
                  <div className="divide-y divide-white/5">
                    {items.map((expense) => (
                      <div key={expense.id} className="px-5 py-3 flex items-center justify-between gap-3">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-[#CBD5E1] font-semibold text-xs truncate">
                            {expense.note || expense.category}
                          </span>
                          <span className="text-[#808BA4] text-[10px] font-semibold">
                            {expense.frequency === 'weekly' ? 'Weekly' : 'Monthly'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-white font-bold text-sm">
                            {fmt(expense.amount)}
                            <span className="text-[#808BA4] font-semibold text-[10px]">
                              {expense.frequency === 'weekly' ? '/wk' : '/mo'}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDelete(expense.id)}
                            disabled={deletingId === expense.id}
                            className="text-[#808BA4] active:text-red-400 transition-colors p-1"
                          >
                            {deletingId === expense.id
                              ? <Loader2 size={14} className="animate-spin" />
                              : <Trash2 size={14} />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Add expense modal ──────────────────────────────────────────────── */}
      <AppModal open={addOpen} onOpenChange={setAddOpen} title="Add Expense">
        <div className="flex flex-col gap-5 pb-4">
          {/* Category */}
          <div>
            <label className={labelCls}>Category</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className={selectCls}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-[#111827]">{c}</option>
              ))}
            </select>
          </div>

          {/* Frequency toggle */}
          <div>
            <label className={labelCls}>Frequency</label>
            <div className="flex gap-2">
              {(['monthly', 'weekly'] as const).map((freq) => (
                <button
                  key={freq}
                  type="button"
                  aria-pressed={newFrequency === freq}
                  onClick={() => setNewFrequency(freq)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors ${
                    newFrequency === freq
                      ? 'bg-[#2563EB] border-[#2563EB] text-white'
                      : 'bg-[#111827] border-[#2D3748] text-[#808BA4]'
                  }`}
                >
                  {freq === 'monthly' ? 'Monthly' : 'Weekly'}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <ExecutiveInput
            label={newFrequency === 'weekly' ? 'Amount per Week' : 'Amount per Month'}
            leftIcon={<span className="font-bold">$</span>}
            inputMode="decimal"
            placeholder="e.g. 500"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value.replace(/[^0-9.]/g, ''))}
          />

          {/* Note (optional) */}
          <ExecutiveInput
            label="Note (optional)"
            placeholder="e.g. Netflix, Groceries…"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
          />

          <ExecutiveButton
            text={creating ? 'Adding…' : 'Add Expense'}
            icon={creating ? <Loader2 size={16} className="animate-spin" /> : undefined}
            disabled={creating}
            onClick={handleAdd}
          />
        </div>
      </AppModal>
    </AppShell>
  );
}
