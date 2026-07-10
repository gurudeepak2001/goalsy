import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Wallet,
  PiggyBank,
  ShieldCheck,
  Lightbulb,
  ChevronRight,
  Award,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import AppShell from '@/components/AppShell';
import CircularScoreRing from '@/components/CircularScoreRing';
import ProgressBar from '@/components/ProgressBar';
import DarkInfoCard from '@/components/DarkInfoCard';
import SectionLabel from '@/components/SectionLabel';

function TabBar({ active, onChange }: { active: string; onChange: (tab: string) => void }) {
  const tabs = ['Score', 'Credit', 'Alerts'];
  return (
    <div className="flex items-center gap-2 mt-6">
      {tabs.map((tab) => {
        const isActive = active === tab;
        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className={`flex-1 h-10 rounded-full text-sm font-semibold transition-colors ${
              isActive ? 'bg-[#2563EB] text-white' : 'bg-[#0F1625] text-[#94A3B8] border border-[#1A2238]'
            }`}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}

function DriverBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-[#94A3B8] text-xs font-medium w-24 flex-shrink-0">{label}</div>
      <div className="flex-1">
        <div className="h-2 w-full bg-[#1A2238] rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
        </div>
      </div>
      <div className="text-white text-sm font-bold w-8 text-right">{value}</div>
    </div>
  );
}

export default function ScoreScreen() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState('Score');

  return (
    <AppShell showBottomNav={false}>
      <div className="pt-12 flex-1 flex flex-col">
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 text-[#94A3B8] text-sm font-medium mb-6 hover:text-white transition-colors"
          data-testid="button-back"
        >
          <ArrowLeft size={18} />
          Back to Profile
        </button>

        <p className="text-[#94A3B8] text-sm">Credit Intelligence</p>
        <h1 className="text-white font-black text-3xl leading-tight tracking-tight mt-1">Goalsy Score</h1>
        <p className="text-[#94A3B8] text-sm mt-2">Comprehensive financial wellness assessment.</p>

        <TabBar active={activeTab} onChange={setActiveTab} />

        {activeTab === 'Score' && (
          <>
            <div className="mt-6 bg-[#0F1625] border border-[#1A2238] rounded-2xl p-6 flex flex-col items-center">
          <CircularScoreRing value={78} size={180} strokeWidth={12} color="#22C55E" label="78" sublabel="EXCELLENT" />
          <div className="flex items-center gap-2 mt-4">
            <TrendingUp size={16} className="text-[#22C55E]" />
            <span className="text-[#22C55E] text-sm font-semibold">+12 points this quarter</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <DarkInfoCard
            title="Payment History"
            value="98%"
            valueLabel="On-time payments"
            icon={<ShieldCheck size={18} />}
            accent="text-[#22C55E]"
          />
          <DarkInfoCard
            title="Credit Utilization"
            value="14%"
            valueLabel="Well below 30%"
            icon={<CreditCard size={18} />}
            accent="text-[#22C55E]"
          />
        </div>

        <div className="mt-8">
          <SectionLabel text="FINANCIAL DRIVERS" accentBar />
          <div className="bg-[#0F1625] border border-[#1A2238] rounded-xl p-4 flex flex-col gap-4">
            <DriverBar label="Savings" value={82} color="#22C55E" />
            <DriverBar label="Debt Mgmt" value={76} color="#2563EB" />
            <DriverBar label="Spending" value={64} color="#F59E0B" />
            <DriverBar label="Income" value={91} color="#22C55E" />
          </div>
        </div>

        <div className="mt-8">
          <SectionLabel text="CREDIT INTELLIGENCE" accentBar />
          <div className="grid grid-cols-2 gap-3">
            <DarkInfoCard
              title="Total Accounts"
              value="8"
              valueLabel="Active tradelines"
              icon={<Wallet size={18} />}
            />
            <DarkInfoCard
              title="Avg Account Age"
              value="4.2y"
              valueLabel="Established history"
              icon={<Award size={18} />}
            />
            <DarkInfoCard
              title="Total Balance"
              value="$4.1k"
              valueLabel="Revolving + installment"
              icon={<CreditCard size={18} />}
              accent="text-[#F59E0B]"
            />
            <DarkInfoCard
              title="Net Worth"
              value="$142k"
              valueLabel="Assets minus liabilities"
              icon={<PiggyBank size={18} />}
              accent="text-[#22C55E]"
            />
          </div>
        </div>

        <div className="mt-8">
          <SectionLabel
            text="RECOMMENDATIONS"
            rightElement={
              <button
                onClick={() => navigate('/goals')}
                className="text-[#2563EB] text-xs font-semibold tracking-wider flex items-center gap-1"
              >
                View All <ChevronRight size={12} />
              </button>
            }
          />
          <div className="bg-[#0F1625] border border-[#1A2238] rounded-xl p-4 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="bg-[#2563EB] rounded-xl p-2 text-white flex-shrink-0">
                <Lightbulb size={16} />
              </div>
              <div>
                <div className="text-white font-semibold text-sm">Keep credit utilization below 10%</div>
                <div className="text-[#64748B] text-xs mt-0.5">Current usage is healthy; maintain or reduce.</div>
              </div>
            </div>
            <div className="h-px bg-[#1A2238]" />
            <div className="flex items-start gap-3">
              <div className="bg-[#2563EB] rounded-xl p-2 text-white flex-shrink-0">
                <TrendingUp size={16} />
              </div>
              <div>
                <div className="text-white font-semibold text-sm">Increase automated savings</div>
                <div className="text-[#64748B] text-xs mt-0.5">+5% monthly could boost score by 6 points.</div>
              </div>
            </div>
            <div className="h-px bg-[#1A2238]" />
            <div className="flex items-start gap-3">
              <div className="bg-[#F59E0B] rounded-xl p-2 text-white flex-shrink-0">
                <TrendingDown size={16} />
              </div>
              <div>
                <div className="text-white font-semibold text-sm">Avoid new hard inquiries</div>
                <div className="text-[#64748B] text-xs mt-0.5">Space credit applications 6+ months apart.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-[#0F1625] border border-[#1A2238] rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-white font-semibold text-sm">Refresh Score</div>
            <div className="text-[#64748B] text-xs">Next update in 7 days</div>
          </div>
          <button
            onClick={() => toast({ title: 'Score Refreshed', description: 'Your Goalsy Score is up to date.' })}
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
          >
            Refresh
          </button>
        </div>
          </>
        )}

        {activeTab === 'Credit' && (
          <div className="mt-8 bg-[#0F1625] border border-[#1A2238] rounded-2xl p-6 flex flex-col items-center">
            <CircularScoreRing value={740} size={160} strokeWidth={12} color="#2563EB" label="740" sublabel="EXPERIAN" showGlow={false} />
            <div className="flex items-center gap-2 mt-4">
              <TrendingUp size={16} className="text-[#22C55E]" />
              <span className="text-[#22C55E] text-sm font-semibold">+18 points this year</span>
            </div>
          </div>
        )}

        {activeTab === 'Alerts' && (
          <div className="mt-8 bg-[#0F1625] border border-[#1A2238] rounded-2xl p-6">
            <div className="text-white font-semibold text-sm">No new alerts</div>
            <p className="text-[#64748B] text-xs mt-2">
              Your credit report is being monitored. You’ll be notified of any significant changes.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
