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
  AlertTriangle,
  Check,
  Clock,
  Bell,
  Lock,
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
    <div className="flex items-center gap-1 mt-6 p-1 bg-[#05070A] border border-[#1A2238] rounded-2xl">
      {tabs.map((tab) => {
        const isActive = active === tab;
        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className={`flex-1 h-9 rounded-xl text-sm font-bold transition-all ${
              isActive
                ? 'bg-[#2563EB] text-white shadow-[0_0_16px_rgba(37,99,235,0.35)]'
                : 'text-[#64748B] hover:text-white'
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
  impact,
}: {
  label: string;
  value: number;
  color: string;
  impact?: string;
}) {
  const badgeClasses = 
    color === '#22C55E' ? 'bg-[#22C55E]/10 text-[#22C55E]' :
    color === '#2563EB' ? 'bg-[#2563EB]/10 text-[#2563EB]' :
    color === '#F59E0B' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' :
    'bg-[#64748B]/10 text-[#64748B]';

  return (
    <div className="flex items-center gap-3">
      <div className="text-[#94A3B8] text-xs font-semibold w-[68px] flex-shrink-0">{label}</div>
      <div className="flex-1">
        <div className="h-2 w-full bg-[#1A2238] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
        </div>
      </div>
      <div className="text-white text-sm font-bold w-7 text-right">{value}</div>
      {impact && (
        <span
          className={`text-[9px] font-bold uppercase tracking-wider py-0.5 rounded-full flex-shrink-0 text-center w-[52px] ${badgeClasses}`}
        >
          {impact}
        </span>
      )}
    </div>
  );
}

function ScoreTab() {
  return (
    <>
      <div className="mt-6 bg-[#0F1625] border border-[#1A2238] rounded-3xl p-6 flex flex-col items-center">
        <CircularScoreRing value={78} size={180} strokeWidth={12} color="#22C55E" label="78" sublabel="EXCELLENT" sublabelColor="#22C55E" />
        <div className="flex items-center gap-2 mt-5">
          <TrendingUp size={16} className="text-[#22C55E]" />
          <span className="text-[#22C55E] text-sm font-semibold">+12 points this quarter</span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
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
        <div className="bg-[#0F1625] border border-[#1A2238] rounded-2xl p-5 flex flex-col gap-4">
          <DriverBar label="Savings" value={82} color="#22C55E" impact="High" />
          <DriverBar label="Debt Mgmt" value={76} color="#2563EB" impact="Medium" />
          <DriverBar label="Spending" value={64} color="#F59E0B" impact="Medium" />
          <DriverBar label="Income" value={91} color="#22C55E" impact="High" />
        </div>
      </div>

      <div className="mt-8">
        <SectionLabel text="CREDIT INTELLIGENCE" accentBar />
        <div className="grid grid-cols-2 gap-3">
          <DarkInfoCard title="Total Accounts" value="8" valueLabel="Active tradelines" icon={<Wallet size={18} />} />
          <DarkInfoCard title="Avg Account Age" value="4.2y" valueLabel="Established history" icon={<Award size={18} />} />
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
              onClick={() => toast({ title: 'View All', description: 'All recommendations coming soon.' })}
              className="text-[#2563EB] text-xs font-bold tracking-wider flex items-center gap-1"
            >
              View All <ChevronRight size={12} />
            </button>
          }
        />
        <div className="bg-[#0F1625] border border-[#1A2238] rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="bg-[#2563EB] rounded-xl p-2.5 text-white flex-shrink-0">
              <Lightbulb size={18} />
            </div>
            <div>
              <div className="text-white font-semibold text-sm">Keep credit utilization below 10%</div>
              <div className="text-[#64748B] text-xs mt-0.5">Current usage is healthy; maintain or reduce.</div>
            </div>
          </div>
          <div className="h-px bg-[#1A2238]" />
          <div className="flex items-start gap-3">
            <div className="bg-[#2563EB] rounded-xl p-2.5 text-white flex-shrink-0">
              <TrendingUp size={18} />
            </div>
            <div>
              <div className="text-white font-semibold text-sm">Increase automated savings</div>
              <div className="text-[#64748B] text-xs mt-0.5">+5% monthly could boost score by 6 points.</div>
            </div>
          </div>
          <div className="h-px bg-[#1A2238]" />
          <div className="flex items-start gap-3">
            <div className="bg-[#F59E0B] rounded-xl p-2.5 text-white flex-shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div>
              <div className="text-white font-semibold text-sm">Avoid new hard inquiries</div>
              <div className="text-[#64748B] text-xs mt-0.5">Space credit applications 6+ months apart.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-[#0F1625] border border-[#1A2238] rounded-2xl p-5 flex items-center justify-between">
        <div>
          <div className="text-white font-semibold text-sm">Refresh Score</div>
          <div className="text-[#64748B] text-xs mt-0.5">Next update in 7 days</div>
        </div>
        <button
          onClick={() => toast({ title: 'Score Refreshed', description: 'Your Goalsy Score is up to date.' })}
          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl px-4 py-2.5 text-sm font-bold transition-colors"
        >
          Refresh
        </button>
      </div>
    </>
  );
}

function CreditTab() {
  return (
    <>
      <div className="mt-6 bg-[#0F1625] border border-[#1A2238] rounded-3xl p-6 flex flex-col items-center">
        <CircularScoreRing value={740} max={850} size={180} strokeWidth={12} color="#2563EB" gradientTo="#60A5FA" label="740" sublabel="EXPERIAN" sublabelColor="#2563EB" />
        <div className="flex items-center gap-2 mt-5">
          <TrendingUp size={16} className="text-[#22C55E]" />
          <span className="text-[#22C55E] text-sm font-semibold">+18 points this year</span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <DarkInfoCard
          title="Payment History"
          value="100%"
          valueLabel="0 missed payments"
          icon={<Check size={18} />}
          accent="text-[#22C55E]"
        />
        <DarkInfoCard
          title="Utilization"
          value="14%"
          valueLabel="$2,100 / $15,000"
          icon={<CreditCard size={18} />}
          accent="text-[#22C55E]"
        />
      </div>

      <div className="mt-8">
        <SectionLabel text="CREDIT FACTORS" accentBar />
        <div className="bg-[#0F1625] border border-[#1A2238] rounded-2xl p-5 flex flex-col gap-4">
          <DriverBar label="Payment" value={100} color="#22C55E" impact="High" />
          <DriverBar label="Utilization" value={90} color="#22C55E" impact="High" />
          <DriverBar label="Age" value={72} color="#2563EB" impact="Medium" />
          <DriverBar label="Mix" value={60} color="#F59E0B" impact="Medium" />
          <DriverBar label="Inquiries" value={95} color="#22C55E" impact="High" />
        </div>
      </div>

      <div className="mt-8">
        <SectionLabel text="ACTIVE ACCOUNTS" accentBar />
        <div className="flex flex-col gap-3">
          {[
            { name: 'Chase Freedom Unlimited', type: 'Credit Card', balance: '$1,420', limit: '$8,000' },
            { name: 'Amex Platinum', type: 'Credit Card', balance: '$680', limit: '$7,000' },
            { name: 'Car Loan', type: 'Installment', balance: '$12,400', limit: '$20,000' },
          ].map((acct) => (
            <div key={acct.name} className="bg-[#0F1625] border border-[#1A2238] rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-[#2563EB]/10 rounded-xl p-2.5 text-[#2563EB]">
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{acct.name}</div>
                    <div className="text-[#64748B] text-xs mt-0.5">{acct.type}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white text-sm font-bold">{acct.balance}</div>
                  <div className="text-[#64748B] text-xs">of {acct.limit}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <SectionLabel text="RECENT INQUIRIES" accentBar />
        <div className="bg-[#0F1625] border border-[#1A2238] rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="bg-[#F59E0B]/10 rounded-xl p-2.5 text-[#F59E0B]">
              <Clock size={18} />
            </div>
            <div>
              <div className="text-white font-semibold text-sm">No recent inquiries</div>
              <div className="text-[#64748B] text-xs mt-0.5">Last inquiry: 8 months ago</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function AlertsTab() {
  const alerts = [
    {
      title: 'Credit utilization dropped',
      description: 'Your overall utilization decreased to 14%',
      date: 'Today',
      type: 'positive',
      icon: <TrendingDown size={18} className="text-[#22C55E]" />,
    },
    {
      title: 'Large payment posted',
      description: '$2,850 mortgage payment confirmed',
      date: '2 days ago',
      type: 'info',
      icon: <Check size={18} className="text-[#2563EB]" />,
    },
    {
      title: 'Credit card due soon',
      description: 'Amex Platinum payment due in 5 days',
      date: '3 days ago',
      type: 'warning',
      icon: <AlertTriangle size={18} className="text-[#F59E0B]" />,
    },
  ];

  return (
    <>
      <div className="mt-6 bg-[#0F1625] border border-[#1A2238] rounded-3xl p-5 flex items-center gap-4">
        <div className="bg-[#2563EB]/10 rounded-full p-3 text-[#2563EB]">
          <Bell size={20} />
        </div>
        <div>
          <div className="text-white font-semibold text-sm">Monitoring is active</div>
          <div className="text-[#64748B] text-xs mt-0.5">We check your credit report daily for changes.</div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 bg-[#22C55E] rounded-full" />
          <span className="text-[#22C55E] text-xs font-bold uppercase">Live</span>
        </div>
      </div>

      <div className="mt-6">
        <SectionLabel text="RECENT ALERTS" accentBar />
        <div className="flex flex-col gap-3">
          {alerts.map((alert, idx) => (
            <div key={idx} className="bg-[#0F1625] border border-[#1A2238] rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div
                  className={`rounded-xl p-2.5 flex-shrink-0 ${
                    alert.type === 'positive'
                      ? 'bg-[#22C55E]/10'
                      : alert.type === 'warning'
                      ? 'bg-[#F59E0B]/10'
                      : 'bg-[#2563EB]/10'
                  }`}
                >
                  {alert.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-white font-semibold text-sm">{alert.title}</div>
                    <span className="text-[#64748B] text-[10px] font-semibold uppercase tracking-wider flex-shrink-0">
                      {alert.date}
                    </span>
                  </div>
                  <div className="text-[#64748B] text-xs mt-0.5">{alert.description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 bg-[#0F1625] border border-[#1A2238] rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="bg-[#22C55E]/10 rounded-xl p-2.5 text-[#22C55E]">
            <Lock size={18} />
          </div>
          <div>
            <div className="text-white font-semibold text-sm">Privacy protected</div>
            <div className="text-[#64748B] text-xs mt-0.5">Alerts are encrypted and never shared.</div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function ScoreScreen() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState('Score');

  return (
    <AppShell showBottomNav={false} className="bg-[#05070A]">
      <div className="pt-12 flex-1 flex flex-col">
        <button
          onClick={() => navigate('/profile')}
          className="w-fit flex items-center gap-2 text-[#94A3B8] text-sm font-semibold mb-6 hover:text-white transition-colors"
          data-testid="button-back"
        >
          <ArrowLeft size={18} />
          Back to Profile
        </button>

        <p className="text-[#94A3B8] text-sm">Credit Intelligence</p>
        <h1 className="text-white font-black text-3xl leading-tight tracking-tight mt-1">Goalsy Score</h1>
        <p className="text-[#94A3B8] text-sm mt-2">Comprehensive financial wellness assessment.</p>

        <TabBar active={activeTab} onChange={setActiveTab} />

        {activeTab === 'Score' && <ScoreTab />}
        {activeTab === 'Credit' && <CreditTab />}
        {activeTab === 'Alerts' && <AlertsTab />}

        <div className="h-10" />
      </div>
    </AppShell>
  );
}
