import { useState } from 'react';
import {
  TrendingUp,
  Activity,
  AlertTriangle,
  ShieldCheck,
  BarChart3,
  ChevronRight,
} from 'lucide-react';
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import AppModal from '@/components/AppModal';
import { mockCreditFactors } from '@/lib/mockData';

const cashFlowData = [
  { month: 'Jan', Income: 8200, Expenses: 5100 },
  { month: 'Feb', Income: 8400, Expenses: 4900 },
  { month: 'Mar', Income: 8300, Expenses: 5600 },
  { month: 'Apr', Income: 8600, Expenses: 5200 },
  { month: 'May', Income: 8500, Expenses: 4800 },
  { month: 'Jun', Income: 8700, Expenses: 5000 },
];

function SectionHeading({ icon, iconColor, text }: { icon: React.ReactNode; iconColor: string; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-5 h-5 flex items-center justify-center flex-shrink-0" style={{ color: iconColor }}>
        {icon}
      </div>
      <span className="text-[#808BA4] font-bold text-xs uppercase tracking-[1.5px]">{text}</span>
    </div>
  );
}

export default function FinancialHealthScreen() {
  const [creditModalOpen, setCreditModalOpen] = useState(false);

  return (
    <AppShell activeTab="goals" header={<AppHeader dashboard dashboardTitle="Financial Health" />}>
      <div className="flex flex-col gap-6">
        {/* Cash Flow Analysis */}
        <div className="bg-[#111827] border border-white/5 rounded-3xl p-8 flex flex-col gap-4">
          <SectionHeading icon={<TrendingUp size={20} />} iconColor="#22C55E" text="Cash Flow Analysis" />
          <div className="flex flex-col gap-1">
            <span className="text-[#CBD5E1] font-semibold text-sm leading-[21px]">Monthly Surplus</span>
            <span className="text-[#22C55E] font-bold text-5xl leading-[48px]">+$4,250</span>
          </div>
          <div className="h-1 w-full bg-[#1F2937] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-[#22C55E]"
              style={{ width: '75%', boxShadow: '0px 0px 20px rgba(34, 197, 94, 0.15)' }}
            />
          </div>
        </div>

        {/* Credit Intelligence */}
        <button
          type="button"
          onClick={() => setCreditModalOpen(true)}
          className="text-left bg-[#111827] border border-white/5 rounded-3xl p-8 flex flex-col gap-6 hover:bg-[#161F2E] active:scale-[0.99] transition-all"
        >
          <div className="flex items-center justify-between">
            <SectionHeading icon={<Activity size={20} />} iconColor="#FFFFFF" text="Credit Intelligence" />
            <ChevronRight size={18} className="text-[#808BA4] flex-shrink-0" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[#CBD5E1] font-semibold text-sm leading-[21px]">Credit Score</span>
              <span className="text-white font-bold text-[64px] leading-[64px] tracking-[-3.2px]">812</span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-lg px-3 py-1 flex items-center gap-1.5">
                <TrendingUp size={14} className="text-[#22C55E]" />
                <span className="text-[#22C55E] font-bold text-base leading-6">+14 pts</span>
              </div>
              <span className="text-[#808BA4] font-semibold text-xs leading-[18px]">vs last 30d</span>
            </div>
          </div>
        </button>

        {/* Debt Strategy */}
        <div className="bg-[#111827] border border-white/5 rounded-3xl p-8 flex flex-col gap-6">
          <SectionHeading icon={<AlertTriangle size={20} />} iconColor="#F59E0B" text="Debt Strategy" />
          <div className="flex gap-4">
            <div className="flex-1 bg-[#1F2937] border border-white/5 rounded-xl p-5 flex flex-col gap-2">
              <span className="text-[#808BA4] font-bold text-xs uppercase leading-[18px]">Total Debt</span>
              <span className="text-white font-bold text-2xl leading-9">$45,200</span>
            </div>
            <div className="flex-1 bg-[#1F2937] border border-white/5 rounded-xl p-5 flex flex-col gap-2">
              <span className="text-[#808BA4] font-bold text-xs uppercase leading-[18px]">Utilization</span>
              <span className="text-white font-bold text-2xl leading-9">12%</span>
            </div>
          </div>
        </div>

        {/* Emergency Fund */}
        <div className="bg-[#111827] border border-white/5 rounded-3xl p-8 flex flex-col gap-6">
          <SectionHeading icon={<ShieldCheck size={20} />} iconColor="#3B82F6" text="Emergency Fund" />
          <div className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between">
              <span className="text-white font-bold text-[32px] leading-[48px]">$24,000</span>
              <span className="text-[#808BA4] font-semibold text-base leading-6">/ $30,000</span>
            </div>
            <div className="h-3 w-full bg-[#1F2937] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[#3B82F6]"
                style={{ width: '80%', boxShadow: '0px 0px 20px rgba(37, 99, 235, 0.15)' }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#3B82F6] font-bold text-sm leading-[21px]">80% Complete</span>
              <span className="text-[#CBD5E1] font-bold text-sm leading-[21px]">$6,000 to goal</span>
            </div>
          </div>
        </div>

        {/* Income vs Expenses */}
        <div className="bg-[#111827] border border-white/5 rounded-3xl p-8 flex flex-col gap-6">
          <SectionHeading icon={<BarChart3 size={20} />} iconColor="#FFFFFF" text="Income vs Expenses" />
          <div className="h-[280px] -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#808BA4', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{ background: '#1F2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  labelStyle={{ color: '#CBD5E1' }}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: 8 }}
                  formatter={(value) => <span className="text-[#CBD5E1] text-xs font-bold">{value}</span>}
                />
                <Bar dataKey="Income" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="transparent" stroke="#FFFFFF" strokeWidth={1} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="h-4" />
      </div>

      <AppModal open={creditModalOpen} onOpenChange={setCreditModalOpen} title="Credit Score Breakdown">
        <div className="flex flex-col gap-5 pb-4">
          <div className="flex items-center justify-between">
            <span className="text-white font-bold text-5xl leading-[56px] tracking-[-2.4px]">812</span>
            <div className="flex flex-col items-end gap-1">
              <div className="bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-lg px-3 py-1 flex items-center gap-1.5">
                <TrendingUp size={14} className="text-[#22C55E]" />
                <span className="text-[#22C55E] font-bold text-base leading-6">+14 pts</span>
              </div>
              <span className="text-[#808BA4] font-semibold text-xs leading-[18px]">vs last 30d</span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {mockCreditFactors.map((factor) => (
              <div key={factor.id} className="bg-[#0B111F] border border-white/5 rounded-2xl p-5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold text-[15px] leading-[22px]">{factor.label}</span>
                  <span className="font-bold text-xs uppercase tracking-[0.6px]" style={{ color: factor.color }}>
                    {factor.status}
                  </span>
                </div>
                <span className="text-[#808BA4] font-semibold text-[13px] leading-5">{factor.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </AppModal>
    </AppShell>
  );
}
