import { useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from '@/hooks/use-toast';
import { Mail, Lock, Target, Loader2, ScanFace } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import ExecutiveInput from '@/components/ExecutiveInput';
import ExecutiveButton from '@/components/ExecutiveButton';
import { simulateAsync } from '@/lib/mockData';

export default function SignInScreen() {
  const [, navigate] = useLocation();
  const [faceIdStatus, setFaceIdStatus] = useState<'idle' | 'scanning' | 'verified'>('idle');
  const [resetStatus, setResetStatus] = useState<'idle' | 'sending'>('idle');

  const handleFaceId = async () => {
    if (faceIdStatus !== 'idle') return;
    setFaceIdStatus('scanning');
    // MOCK DATA - replace with real biometric/auth API call
    await simulateAsync(true, 1400);
    setFaceIdStatus('verified');
    toast({ title: 'Identity Verified', description: 'Biometric authentication successful.' });
    setTimeout(() => navigate('/financial-connection'), 500);
  };

  const handleForgotPassword = async () => {
    if (resetStatus !== 'idle') return;
    setResetStatus('sending');
    // MOCK DATA - replace with real password-reset API call
    await simulateAsync(true, 1000);
    setResetStatus('idle');
    toast({ title: 'Reset Link Sent', description: 'Check executive@domain.com for instructions.' });
  };

  return (
    <div className="min-h-[100dvh] w-full max-w-md mx-auto flex flex-col overflow-y-auto bg-[#05070A]">
      <div className="w-[327px] mx-auto pt-12 pb-10 flex-1 flex flex-col">
        <div className="pb-16">
          <AppHeader />
        </div>

        <main className="w-[327px] flex flex-col justify-center">
          <div className="pb-12">
            <div className="flex flex-col gap-3">
              <h1
                className="text-white font-bold text-[40px] leading-[44px]"
                style={{ letterSpacing: '-2px' }}
              >
                Welcome Back.
              </h1>
              <p className="text-[#CBD5E1] font-semibold text-base leading-6 opacity-80">
                Access your financial cockpit.
              </p>
            </div>
          </div>

          <form
            className="flex flex-col gap-6"
            onSubmit={(e) => {
              e.preventDefault();
              navigate('/financial-connection');
            }}
          >
            <ExecutiveInput
              label="Email Address"
              type="email"
              placeholder="executive@domain.com"
              leftIcon={<Mail size={18} />}
            />

            <ExecutiveInput
              label="Password"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock size={18} />}
              rightElement={
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetStatus === 'sending'}
                  className="text-[#3B82F6] text-xs font-bold uppercase tracking-[0.5px] disabled:opacity-50"
                >
                  {resetStatus === 'sending' ? 'Sending...' : 'Forgot?'}
                </button>
              }
            />

            <div className="pt-4">
              <ExecutiveButton
                text="Sign In"
                style={{ letterSpacing: '0.00195312em', boxShadow: '0 0 40px rgba(37, 99, 235, 0.1)' }}
                onClick={() => navigate('/financial-connection')}
              />
            </div>
          </form>

          <div className="pt-12 flex flex-col items-center gap-6">
            <div className="flex items-center gap-4 w-full">
              <div className="h-px flex-1 bg-white/5"></div>
              <span className="text-[#444444] text-xs font-bold uppercase tracking-[1px]">
                Secure Biometric
              </span>
              <div className="h-px flex-1 bg-white/5"></div>
            </div>

            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleFaceId}
                disabled={faceIdStatus !== 'idle'}
                className="w-16 h-16 flex items-center justify-center rounded-2xl bg-[#1F2937] border border-white/5 disabled:opacity-80"
                style={{ boxShadow: '0 0 40px rgba(37, 99, 235, 0.1)' }}
                aria-label="Sign in with FaceID"
                data-testid="button-faceid"
              >
                {faceIdStatus === 'scanning' ? (
                  <Loader2 size={28} className="text-[#3B82F6] animate-spin" strokeWidth={2} />
                ) : faceIdStatus === 'verified' ? (
                  <ScanFace size={28} className="text-[#22C55E]" strokeWidth={2} />
                ) : (
                  <Target size={32} className="text-white" strokeWidth={1.5} />
                )}
              </button>
              <span
                className="text-[#CBD5E1] font-bold text-sm"
                style={{ letterSpacing: '0.00292969em' }}
              >
                {faceIdStatus === 'scanning' ? 'Scanning...' : faceIdStatus === 'verified' ? 'Verified' : 'Use FaceID'}
              </span>
            </div>
          </div>
        </main>

        <div className="mt-auto pt-12 text-center">
          <span className="text-[#444444] text-xs font-bold uppercase tracking-[1px]">
            Precision Intelligence System v4.2
          </span>
        </div>
      </div>
    </div>
  );
}
