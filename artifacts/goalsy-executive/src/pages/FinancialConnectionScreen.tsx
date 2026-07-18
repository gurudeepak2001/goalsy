import { useState } from 'react';
import { useLocation } from 'wouter';
import { Activity, Shield, Lock, Layers, PieChart, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import AppHeader from '@/components/AppHeader';
import ExecutiveButton from '@/components/ExecutiveButton';
import { mockConnectedAccounts, simulateAsync } from '@/lib/mockData';

export default function FinancialConnectionScreen() {
  const [, navigate] = useLocation();
  const [connectStatus, setConnectStatus] = useState<'idle' | 'connecting' | 'connected'>('idle');

  const handleConnect = async () => {
    if (connectStatus !== 'idle') return;
    setConnectStatus('connecting');
    // MOCK DATA - replace with real Plaid Link connection flow
    await simulateAsync(mockConnectedAccounts, 1800);
    setConnectStatus('connected');
    toast({
      title: 'Accounts Connected',
      description: `Linked ${mockConnectedAccounts.length} institutions successfully.`,
    });
    setTimeout(() => navigate('/goals'), 700);
  };

  const features = [
    {
      icon: <Activity size={24} strokeWidth={2} />,
      title: 'Real-time Analysis',
      subtitle: 'Continuous cockpit updates',
    },
    {
      icon: <Shield size={24} strokeWidth={2} />,
      title: 'Bank-level Security',
      subtitle: 'Verified Plaid protocols',
    },
    {
      icon: <Lock size={24} strokeWidth={2} />,
      title: '256-bit Encryption',
      subtitle: 'AES-256 standard active',
    },
  ];

  return (
    <div className="min-h-[100dvh] w-full max-w-md mx-auto flex flex-col overflow-y-auto bg-[#05070A]">
      <div className="w-[327px] mx-auto flex-1 flex flex-col" style={{ paddingTop: 'calc(3rem + var(--safe-top))', paddingBottom: 'calc(2.5rem + var(--safe-bottom))' }}>
        <div className="pb-12">
          <AppHeader showSecureMode={true} />
        </div>

        <main className="w-[327px] flex-1 flex flex-col justify-between">
          <div className="pb-10">
            <div className="flex items-stretch gap-0">
              <div className="w-1 bg-[#2563EB] rounded-full flex-shrink-0"></div>
              <div className="pl-6 flex flex-col gap-[6.8px]">
                <span className="text-[#2563EB] text-xs font-bold uppercase tracking-[2px]">
                  Step 02: Intelligence Sync
                </span>
                <h1
                  className="text-white font-bold text-[36px] leading-[40px]"
                  style={{ letterSpacing: '-1.5px' }}
                >
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
              <div
                key={index}
                className="bg-[#111827] border border-white/5 rounded-2xl p-5 flex items-center gap-4 h-[88px]"
              >
                <div className="w-12 h-12 bg-[#1F2937] border border-white/10 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                  {feature.icon}
                </div>
                <div className="flex flex-col justify-center">
                  <div
                    className="text-white font-bold text-[15px] leading-[22px]"
                    style={{ letterSpacing: index === 0 ? '0.000976562em' : index === 1 ? '0.00292969em' : '-0.00195312em' }}
                  >
                    {feature.title}
                  </div>
                  <div className="text-[#808BA4] font-semibold text-[13px] leading-5">
                    {feature.subtitle}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pb-8 opacity-60">
            <div className="flex items-center justify-center gap-2">
              <span className="text-[#808BA4] text-[11px] font-bold uppercase tracking-[1px]">
                Powered by
              </span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 border border-white rounded-[3px] flex items-center justify-center">
                  <span className="text-white text-[7px] font-bold leading-none">P</span>
                </div>
                <span
                  className="text-white font-bold text-sm"
                  style={{ letterSpacing: '-0.35px' }}
                >
                  PLAID
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 pb-8">
            <ExecutiveButton
              text={
                connectStatus === 'connecting'
                  ? 'Connecting...'
                  : connectStatus === 'connected'
                    ? 'Connected'
                    : 'Connect Accounts'
              }
              icon={
                connectStatus === 'connecting' ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : connectStatus === 'connected' ? (
                  <CheckCircle2 size={18} />
                ) : undefined
              }
              disabled={connectStatus !== 'idle'}
              style={{
                letterSpacing: '-0.000976562em',
                boxShadow: '0 0 30px rgba(37, 99, 235, 0.2)',
              }}
              className="disabled:opacity-90"
              onClick={handleConnect}
            />
            <ExecutiveButton
              variant="outline"
              text="Skip for Now"
              className="border border-white/20 text-[#CBD5E1] text-base"
              disabled={connectStatus !== 'idle'}
              onClick={() => navigate('/goals')}
            />
          </div>

          <div className="pb-6 flex flex-col items-center gap-4">
            <div className="flex items-center gap-4">
              <PieChart size={16} className="text-[#444444]" strokeWidth={2} />
              <Layers size={16} className="text-[#444444]" strokeWidth={2} />
              <Shield size={16} className="text-[#444444]" strokeWidth={2} />
            </div>
            <span
              className="text-[#444444] text-[10px] font-bold uppercase text-center"
              style={{ letterSpacing: '2px', lineHeight: '15px' }}
            >
              Goalsy Executive © 2024 · All Systems Secure
            </span>
          </div>
        </main>
      </div>
    </div>
  );
}
