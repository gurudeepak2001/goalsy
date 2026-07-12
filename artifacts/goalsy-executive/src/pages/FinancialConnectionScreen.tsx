import { useLocation } from 'wouter';
import { Activity, Shield, Lock } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import ExecutiveButton from '@/components/ExecutiveButton';

export default function FinancialConnectionScreen() {
  const [, navigate] = useLocation();

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
      <div className="w-[327px] mx-auto pt-12 pb-10 flex-1 flex flex-col">
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
                <div className="w-4 h-4 border border-white rounded-full flex items-center justify-center">
                  <span className="text-white text-[8px] font-bold">P</span>
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
              text="Connect Accounts"
              style={{
                letterSpacing: '-0.000976562em',
                boxShadow: '0 0 30px rgba(37, 99, 235, 0.2)',
              }}
              onClick={() => navigate('/goals')}
            />
            <ExecutiveButton
              variant="outline"
              text="Skip for Now"
              className="border border-white/20 text-[#CBD5E1] text-base"
              onClick={() => navigate('/goals')}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
