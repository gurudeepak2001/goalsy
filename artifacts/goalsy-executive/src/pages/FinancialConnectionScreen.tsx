import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  Activity, Shield, Lock, Layers, PieChart, Loader2, CheckCircle2,
  DollarSign, TrendingUp, Target, ChevronRight,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import AppHeader from '@/components/AppHeader';
import ExecutiveButton from '@/components/ExecutiveButton';
import { mockConnectedAccounts, simulateAsync } from '@/lib/mockData';
import {
  useGetFinancialProfile,
  useUpdateFinancialProfile,
} from '@workspace/api-client-react';

// ── Shared input styling ─────────────────────────────────────────────────────
const inputCls =
  'w-full bg-[#111827] border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-semibold placeholder-[#4B5563] focus:outline-none focus:border-[#2563EB]/60 transition-colors';
const selectCls = `${inputCls} appearance-none cursor-pointer`;
const labelCls = 'text-[#808BA4] text-[10px] font-bold uppercase tracking-[1.5px] mb-1.5 block';

// ── Risk tolerance and goal type options ─────────────────────────────────────
const RISK_OPTIONS = [
  { value: '', label: 'Select tolerance…' },
  { value: 'conservative', label: 'Conservative — preserve capital' },
  { value: 'moderate', label: 'Moderate — balanced growth' },
  { value: 'aggressive', label: 'Aggressive — maximise returns' },
];

const GOAL_TYPE_OPTIONS = [
  { value: '', label: 'Select primary goal…' },
  { value: 'home_purchase', label: 'Home Purchase' },
  { value: 'retirement', label: 'Retirement' },
  { value: 'education', label: 'Education' },
  { value: 'emergency_fund', label: 'Emergency Fund' },
  { value: 'investment', label: 'Investment Portfolio' },
  { value: 'other', label: 'Other' },
];

// ── Dollar formatter ─────────────────────────────────────────────────────────
function parseDollar(raw: string): number | null {
  const n = parseInt(raw.replace(/[^0-9]/g, ''), 10);
  return isNaN(n) ? null : n;
}

// ── Main component ───────────────────────────────────────────────────────────
export default function FinancialConnectionScreen() {
  const [, navigate] = useLocation();

  // Step: 'profile' first, then 'connection'
  const [step, setStep] = useState<'profile' | 'connection'>('profile');
  const [connectStatus, setConnectStatus] = useState<'idle' | 'connecting' | 'connected'>('idle');

  // ── Form state ─────────────────────────────────────────────────────────────
  const [annualIncome, setAnnualIncome] = useState('');
  const [monthlyExpenses, setMonthlyExpenses] = useState('');
  const [netWorth, setNetWorth] = useState('');
  const [savingsRate, setSavingsRate] = useState('');
  const [riskTolerance, setRiskTolerance] = useState('');
  const [primaryGoalType, setPrimaryGoalType] = useState('');

  // ── Load existing profile to pre-populate ──────────────────────────────────
  const { data: fpData, isLoading: fpLoading } = useGetFinancialProfile();

  useEffect(() => {
    const fp = fpData?.profile;
    if (!fp) return;
    if (fp.annualIncome != null) setAnnualIncome(String(fp.annualIncome));
    if (fp.monthlyExpenses != null) setMonthlyExpenses(String(fp.monthlyExpenses));
    if (fp.netWorth != null) setNetWorth(String(fp.netWorth));
    if (fp.savingsRate != null) setSavingsRate(String(fp.savingsRate));
    if (fp.riskTolerance) setRiskTolerance(fp.riskTolerance);
    if (fp.primaryGoalType) setPrimaryGoalType(fp.primaryGoalType);
  }, [fpData]);

  // ── Save mutation ──────────────────────────────────────────────────────────
  const { mutateAsync: saveProfile, isPending: saving } = useUpdateFinancialProfile();

  const handleProfileContinue = async () => {
    try {
      await saveProfile({
        data: {
          annualIncome: parseDollar(annualIncome),
          monthlyExpenses: parseDollar(monthlyExpenses),
          netWorth: parseDollar(netWorth),
          savingsRate: savingsRate ? parseFloat(savingsRate) : null,
          riskTolerance: riskTolerance || null,
          primaryGoalType: primaryGoalType || null,
        },
      });
      setStep('connection');
    } catch {
      toast({ title: 'Could not save profile', description: 'Please try again.', variant: 'destructive' });
    }
  };

  // ── Plaid connect (existing, unchanged) ────────────────────────────────────
  const handleConnect = async () => {
    if (connectStatus !== 'idle') return;
    setConnectStatus('connecting');
    await simulateAsync(mockConnectedAccounts, 1800);
    setConnectStatus('connected');
    toast({
      title: 'Accounts Connected',
      description: `Linked ${mockConnectedAccounts.length} institutions successfully.`,
    });
    setTimeout(() => navigate('/ai-home'), 700);
  };

  const features = [
    { icon: <Activity size={24} strokeWidth={2} />, title: 'Real-time Analysis', subtitle: 'Continuous cockpit updates' },
    { icon: <Shield size={24} strokeWidth={2} />, title: 'Bank-level Security', subtitle: 'Verified Plaid protocols' },
    { icon: <Lock size={24} strokeWidth={2} />, title: '256-bit Encryption', subtitle: 'AES-256 standard active' },
  ];

  // ── Shared wrapper ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-[100dvh] w-full max-w-md mx-auto flex flex-col overflow-y-auto bg-[#05070A]">
      <div className="w-[327px] mx-auto flex-1 flex flex-col" style={{ paddingTop: 'calc(3rem + var(--safe-top))', paddingBottom: 'calc(2.5rem + var(--safe-bottom))' }}>
        <div className="pb-12">
          <AppHeader showSecureMode={true} />
        </div>

        {/* ── STEP 1: Financial Profile ──────────────────────────────────── */}
        {step === 'profile' && (
          <main className="w-[327px] flex-1 flex flex-col gap-8">
            {/* Heading */}
            <div className="flex items-stretch gap-0">
              <div className="w-1 bg-[#2563EB] rounded-full flex-shrink-0" />
              <div className="pl-6 flex flex-col gap-[6.8px]">
                <span className="text-[#2563EB] text-xs font-bold uppercase tracking-[2px]">
                  Step 02: Financial Profile
                </span>
                <h1 className="text-white font-bold text-[36px] leading-[40px]" style={{ letterSpacing: '-1.5px' }}>
                  Your Financial<br />Picture.
                </h1>
                <p className="text-[#CBD5E1] font-semibold text-base leading-[26px] opacity-90 pt-2">
                  This helps Goalsy calibrate your score, missions, and strategy to your actual situation. All fields are optional.
                </p>
              </div>
            </div>

            {/* Form fields */}
            {fpLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-[#2563EB]" />
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {/* Row: Income + Expenses */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className={labelCls}>Annual Income</label>
                    <div className="relative">
                      <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4B5563]" />
                      <input
                        type="number"
                        min="0"
                        placeholder="120000"
                        value={annualIncome}
                        onChange={(e) => setAnnualIncome(e.target.value)}
                        className={`${inputCls} pl-8`}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className={labelCls}>Monthly Expenses</label>
                    <div className="relative">
                      <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4B5563]" />
                      <input
                        type="number"
                        min="0"
                        placeholder="4500"
                        value={monthlyExpenses}
                        onChange={(e) => setMonthlyExpenses(e.target.value)}
                        className={`${inputCls} pl-8`}
                      />
                    </div>
                  </div>
                </div>

                {/* Row: Net Worth + Savings Rate */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className={labelCls}>Net Worth</label>
                    <div className="relative">
                      <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4B5563]" />
                      <input
                        type="number"
                        placeholder="250000"
                        value={netWorth}
                        onChange={(e) => setNetWorth(e.target.value)}
                        className={`${inputCls} pl-8`}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className={labelCls}>Savings Rate %</label>
                    <div className="relative">
                      <TrendingUp size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4B5563]" />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="20"
                        value={savingsRate}
                        onChange={(e) => setSavingsRate(e.target.value)}
                        className={`${inputCls} pl-8`}
                      />
                    </div>
                  </div>
                </div>

                {/* Risk Tolerance */}
                <div>
                  <label className={labelCls}>Risk Tolerance</label>
                  <div className="relative">
                    <Shield size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4B5563]" />
                    <select
                      value={riskTolerance}
                      onChange={(e) => setRiskTolerance(e.target.value)}
                      className={`${selectCls} pl-8 text-${riskTolerance ? 'white' : '[#4B5563]'}`}
                    >
                      {RISK_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value} className="bg-[#111827]">
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4B5563] rotate-90 pointer-events-none" />
                  </div>
                </div>

                {/* Primary Goal */}
                <div>
                  <label className={labelCls}>Primary Goal</label>
                  <div className="relative">
                    <Target size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4B5563]" />
                    <select
                      value={primaryGoalType}
                      onChange={(e) => setPrimaryGoalType(e.target.value)}
                      className={`${selectCls} pl-8`}
                    >
                      {GOAL_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value} className="bg-[#111827]">
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4B5563] rotate-90 pointer-events-none" />
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-4 mt-auto pb-2">
              <ExecutiveButton
                text={saving ? 'Saving…' : 'Continue'}
                icon={saving ? <Loader2 size={18} className="animate-spin" /> : undefined}
                disabled={saving || fpLoading}
                style={{ letterSpacing: '-0.000976562em', boxShadow: '0 0 30px rgba(37,99,235,0.2)' }}
                onClick={handleProfileContinue}
              />
              <ExecutiveButton
                variant="outline"
                text="Skip for Now"
                className="border border-white/20 text-[#CBD5E1] text-base"
                disabled={saving}
                onClick={() => setStep('connection')}
              />
            </div>

            {/* Footer */}
            <div className="pb-6 flex flex-col items-center gap-4">
              <div className="flex items-center gap-4">
                <PieChart size={16} className="text-[#444444]" strokeWidth={2} />
                <Layers size={16} className="text-[#444444]" strokeWidth={2} />
                <Shield size={16} className="text-[#444444]" strokeWidth={2} />
              </div>
              <span className="text-[#444444] text-[10px] font-bold uppercase text-center" style={{ letterSpacing: '2px', lineHeight: '15px' }}>
                Goalsy Executive © 2024 · All Systems Secure
              </span>
            </div>
          </main>
        )}

        {/* ── STEP 2: Plaid Connection (original, unchanged) ─────────────── */}
        {step === 'connection' && (
          <main className="w-[327px] flex-1 flex flex-col justify-between">
            <div className="pb-10">
              <div className="flex items-stretch gap-0">
                <div className="w-1 bg-[#2563EB] rounded-full flex-shrink-0" />
                <div className="pl-6 flex flex-col gap-[6.8px]">
                  <span className="text-[#2563EB] text-xs font-bold uppercase tracking-[2px]">
                    Step 03: Intelligence Sync
                  </span>
                  <h1 className="text-white font-bold text-[36px] leading-[40px]" style={{ letterSpacing: '-1.5px' }}>
                    Secure Data<br />Connection.
                  </h1>
                  <p className="text-[#CBD5E1] font-semibold text-base leading-[26px] opacity-90 pt-2">
                    To provide real-time intelligence, Goalsy connects securely to your financial institutions via Plaid. Your data is encrypted and never sold.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 pb-8">
              {features.map((feature, index) => (
                <div key={index} className="bg-[#111827] border border-white/5 rounded-2xl p-5 flex items-center gap-4 h-[88px]">
                  <div className="w-12 h-12 bg-[#1F2937] border border-white/10 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div className="flex flex-col justify-center">
                    <div className="text-white font-bold text-[15px] leading-[22px]">{feature.title}</div>
                    <div className="text-[#808BA4] font-semibold text-[13px] leading-5">{feature.subtitle}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pb-8 opacity-60">
              <div className="flex items-center justify-center gap-2">
                <span className="text-[#808BA4] text-[11px] font-bold uppercase tracking-[1px]">Powered by</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 border border-white rounded-[3px] flex items-center justify-center">
                    <span className="text-white text-[7px] font-bold leading-none">P</span>
                  </div>
                  <span className="text-white font-bold text-sm" style={{ letterSpacing: '-0.35px' }}>PLAID</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 pb-8">
              <ExecutiveButton
                text={connectStatus === 'connecting' ? 'Connecting...' : connectStatus === 'connected' ? 'Connected' : 'Connect Accounts'}
                icon={
                  connectStatus === 'connecting' ? <Loader2 size={18} className="animate-spin" /> :
                  connectStatus === 'connected' ? <CheckCircle2 size={18} /> : undefined
                }
                disabled={connectStatus !== 'idle'}
                style={{ letterSpacing: '-0.000976562em', boxShadow: '0 0 30px rgba(37,99,235,0.2)' }}
                className="disabled:opacity-90"
                onClick={handleConnect}
              />
              <ExecutiveButton
                variant="outline"
                text="Skip for Now"
                className="border border-white/20 text-[#CBD5E1] text-base"
                disabled={connectStatus !== 'idle'}
                onClick={() => navigate('/ai-home')}
              />
            </div>

            <div className="pb-6 flex flex-col items-center gap-4">
              <div className="flex items-center gap-4">
                <PieChart size={16} className="text-[#444444]" strokeWidth={2} />
                <Layers size={16} className="text-[#444444]" strokeWidth={2} />
                <Shield size={16} className="text-[#444444]" strokeWidth={2} />
              </div>
              <span className="text-[#444444] text-[10px] font-bold uppercase text-center" style={{ letterSpacing: '2px', lineHeight: '15px' }}>
                Goalsy Executive © 2024 · All Systems Secure
              </span>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
