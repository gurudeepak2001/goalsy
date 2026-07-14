import { useState } from 'react';
import { useLocation } from 'wouter';
import { useSignIn } from '@clerk/react/legacy';
import { useClerk } from '@clerk/react';
import { toast } from '@/hooks/use-toast';
import { Mail, Lock, Target, Loader2, ScanFace, AlertCircle } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import ExecutiveInput from '@/components/ExecutiveInput';
import ExecutiveButton from '@/components/ExecutiveButton';
import { simulateAsync } from '@/lib/mockData';

// Extracts a human-readable message from a Clerk API error.
function getClerkErrorMessage(err: unknown, fallback: string): string {
  const clerkError = err as { errors?: Array<{ longMessage?: string; message?: string }> };
  return clerkError?.errors?.[0]?.longMessage || clerkError?.errors?.[0]?.message || fallback;
}

export default function SignInScreen() {
  const [, navigate] = useLocation();
  const { isLoaded, signIn, setActive } = useSignIn();
  const { client } = useClerk();
  const [faceIdStatus, setFaceIdStatus] = useState<'idle' | 'scanning' | 'verified'>('idle');
  const [resetStatus, setResetStatus] = useState<'idle' | 'sending'>('idle');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!isLoaded || submitting) return;
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Enter your email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Enter your password.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await signIn.create({ identifier: email.trim(), password });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        toast({ title: 'Signed In', description: 'Welcome back to your financial cockpit.' });
        navigate('/financial-connection');
      } else {
        setErrorMessage('Additional verification is required to finish signing in.');
      }
    } catch (err) {
      setErrorMessage(getClerkErrorMessage(err, 'Invalid email or password. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleFaceId = async () => {
    if (faceIdStatus !== 'idle') return;
    setFaceIdStatus('scanning');
    // MOCK DATA - FaceID/biometrics are an intentional visual preview only; no real
    // biometric check and no session is created, so it must not grant navigation.
    await simulateAsync(true, 1400);
    setFaceIdStatus('verified');
    toast({ title: 'Biometric Login Coming Soon', description: 'This is a preview of the FaceID experience.' });
    setTimeout(() => setFaceIdStatus('idle'), 1800);
  };

  const handleForgotPassword = async () => {
    if (resetStatus !== 'idle' || !isLoaded) return;
    if (!email.trim()) {
      setErrorMessage('Enter your email address above first, then tap "Forgot?".');
      return;
    }
    setResetStatus('sending');
    try {
      await client.signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email.trim(),
      });
      toast({ title: 'Reset Link Sent', description: `Check ${email.trim()} for instructions.` });
    } catch (err) {
      toast({
        title: 'Could Not Send Reset Email',
        description: getClerkErrorMessage(err, 'Please check the email address and try again.'),
        variant: 'destructive',
      });
    } finally {
      setResetStatus('idle');
    }
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
              handleSignIn();
            }}
          >
            {errorMessage && (
              <div className="flex items-start gap-2.5 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl px-4 py-3">
                <AlertCircle size={16} className="text-[#EF4444] flex-shrink-0 mt-0.5" />
                <span className="text-[#EF4444] font-semibold text-sm leading-5">{errorMessage}</span>
              </div>
            )}

            <ExecutiveInput
              label="Email Address"
              type="email"
              placeholder="executive@domain.com"
              leftIcon={<Mail size={18} />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <ExecutiveInput
              label="Password"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock size={18} />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
                type="submit"
                text={submitting ? 'Signing In...' : 'Sign In'}
                icon={submitting ? <Loader2 size={16} className="animate-spin" /> : undefined}
                disabled={submitting}
                style={{ letterSpacing: '0.00195312em', boxShadow: '0 0 40px rgba(37, 99, 235, 0.1)' }}
                className="disabled:opacity-70"
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
