import { useState } from 'react';
import { useLocation } from 'wouter';
import { useSignUp } from '@clerk/react/legacy';
import { User, Mail, Lock, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import AppModal from '@/components/AppModal';
import ExecutiveInput from '@/components/ExecutiveInput';
import ExecutiveButton from '@/components/ExecutiveButton';
import { toast } from '@/hooks/use-toast';
import { getClerkErrorMessage } from '@/lib/clerkErrors';

export default function CreateAccountScreen() {
  const [, setLocation] = useLocation();
  const { isLoaded, signUp, setActive } = useSignUp();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const handleCreateAccount = async () => {
    if (!isLoaded || submitting) return;
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Enter your full name.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setErrorMessage('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      // This Clerk instance has the firstName/lastName attributes disabled (email+password
      // only), so passing them to signUp.create() is rejected as an invalid param. Store the
      // full name in unsafeMetadata instead, which is always accepted regardless of attribute
      // config, and read it back the same way in ProfileScreen.
      await signUp.create({
        emailAddress: email.trim(),
        password,
        unsafeMetadata: { fullName: fullName.trim() },
      });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setVerifyOpen(true);
    } catch (err) {
      setErrorMessage(getClerkErrorMessage(err, 'Could not create account. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!isLoaded || verifying) return;
    setVerifyError(null);

    if (!verifyCode.trim()) {
      setVerifyError('Enter the 6-digit code sent to your email.');
      return;
    }

    setVerifying(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: verifyCode.trim() });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        toast({ title: 'Account Created', description: 'Your executive account is ready.' });
        setVerifyOpen(false);
        setLocation('/financial-connection');
      } else {
        setVerifyError('Verification incomplete. Please try again.');
      }
    } catch (err) {
      setVerifyError(getClerkErrorMessage(err, 'Invalid or expired code. Please try again.'));
    } finally {
      setVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!isLoaded) return;
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      toast({ title: 'Code Resent', description: `Check ${email.trim()} for a new code.` });
    } catch (err) {
      toast({
        title: 'Could Not Resend Code',
        description: getClerkErrorMessage(err, 'Please try again shortly.'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-[100dvh] w-full max-w-md mx-auto flex flex-col overflow-y-auto bg-[#05070A]">
      <div className="w-[327px] mx-auto flex-1 flex flex-col" style={{ paddingTop: 'calc(3rem + var(--safe-top))', paddingBottom: 'calc(2.5rem + var(--safe-bottom))' }}>
        <div className="pb-16">
          <AppHeader />
        </div>

        <main className="w-[327px] flex flex-col justify-center">
          <div className="pb-10">
            <div className="flex flex-col gap-3">
              <h1
                className="text-white font-bold text-[40px] leading-[44px]"
                style={{ letterSpacing: '-2px' }}
              >
                Begin Your<br />Mission.
              </h1>
              <p className="text-[#CBD5E1] font-semibold text-base leading-6 opacity-80">
                Establish your financial operating system.
              </p>
            </div>
          </div>

          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateAccount();
            }}
          >
            {errorMessage && (
              <div className="flex items-start gap-2.5 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl px-4 py-3">
                <AlertCircle size={16} className="text-[#EF4444] flex-shrink-0 mt-0.5" />
                <span className="text-[#EF4444] font-semibold text-sm leading-5">{errorMessage}</span>
              </div>
            )}

            <ExecutiveInput
              label="Full Name"
              placeholder="Johnathan Executive"
              leftIcon={<User size={18} />}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            <ExecutiveInput
              label="Email Address"
              type="email"
              placeholder="executive@domain.com"
              leftIcon={<Mail size={18} />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <ExecutiveInput
              label="Secure Password"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock size={18} />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <div className="pt-4 flex flex-col gap-4">
              <ExecutiveButton
                type="submit"
                text={submitting ? 'Creating Account...' : 'Create Account'}
                icon={submitting ? <Loader2 size={16} className="animate-spin" /> : undefined}
                disabled={submitting}
                style={{
                  letterSpacing: '-0.000976562em',
                  boxShadow: '0 0 40px rgba(37, 99, 235, 0.15)',
                }}
                className="disabled:opacity-70"
              />
              <ExecutiveButton
                type="button"
                variant="outline"
                text="Already have an account? Sign In"
                className="text-base"
                onClick={() => setLocation('/signin')}
              />
            </div>

            {/* Required by Clerk's bot sign-up protection (Smart CAPTCHA); renders invisibly */}
            <div id="clerk-captcha" />
          </form>

          <div className="pt-10 border-t border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-0.5 bg-[#2563EB]"></div>
              <span className="text-[#444444] text-[10px] font-bold uppercase tracking-[2px]">
                Security Protocols Active
              </span>
            </div>
            <p className="text-[#808BA4] text-xs leading-5 mt-4">
              By establishing this account, you authorize encrypted data processing under the Executive Performance Standards.
            </p>
          </div>
        </main>
      </div>

      <AppModal open={verifyOpen} onOpenChange={setVerifyOpen} title="Verify Your Email">
        <div className="flex flex-col gap-5 pb-4">
          <div className="flex items-center gap-3 bg-[#111827] border border-white/5 rounded-2xl p-5">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 border border-[#2563EB]/20 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={18} className="text-[#2563EB]" />
            </div>
            <span className="text-[#CBD5E1] font-semibold text-sm leading-5">
              Enter the 6-digit code we sent to <span className="text-white font-bold">{email.trim()}</span>.
            </span>
          </div>

          {verifyError && (
            <div className="flex items-start gap-2.5 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl px-4 py-3">
              <AlertCircle size={16} className="text-[#EF4444] flex-shrink-0 mt-0.5" />
              <span className="text-[#EF4444] font-semibold text-sm leading-5">{verifyError}</span>
            </div>
          )}

          <ExecutiveInput
            label="Verification Code"
            placeholder="000000"
            inputMode="numeric"
            maxLength={6}
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
          />

          <ExecutiveButton
            text={verifying ? 'Verifying...' : 'Verify & Continue'}
            icon={verifying ? <Loader2 size={16} className="animate-spin" /> : undefined}
            disabled={verifying}
            className="disabled:opacity-70"
            onClick={handleVerifyCode}
          />

          <button
            type="button"
            onClick={handleResendCode}
            className="text-[#3B82F6] text-sm font-bold uppercase tracking-[0.5px] text-center"
          >
            Resend Code
          </button>
        </div>
      </AppModal>
    </div>
  );
}
