import { useState } from 'react';
import { useLocation } from 'wouter';
import { useSignIn } from '@clerk/react/legacy';
import { toast } from '@/hooks/use-toast';
import { Mail, Lock, Target, Loader2, ScanFace, AlertCircle, ShieldCheck } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import ExecutiveInput from '@/components/ExecutiveInput';
import ExecutiveButton from '@/components/ExecutiveButton';
import { simulateAsync } from '@/lib/mockData';
import { getClerkErrorMessage } from '@/lib/clerkErrors';

export default function SignInScreen() {
  const [, navigate] = useLocation();
  // NOTE: useSignIn (not useClerk) is used for all sign-in operations throughout
  // this file so that every call — create, prepareFirstFactor, attemptFirstFactor,
  // prepareSecondFactor, attemptSecondFactor — operates on the same React-managed
  // sign-in attempt reference. Mixing useClerk().client.signIn with the signIn
  // object from useSignIn() causes the two references to diverge after a re-render,
  // which produces "You need to send a verification code before attempting to verify".
  const { isLoaded, signIn, setActive } = useSignIn();

  const [faceIdStatus, setFaceIdStatus] = useState<'idle' | 'scanning' | 'verified'>('idle');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ─── MFA / second-factor state ────────────────────────────────────────────
  // Populated after signIn.create() returns needs_second_factor.
  // 'email_code' — Clerk sends a code to the user's email (also used for Clerk's
  //   adaptive bot-protection challenge, which looks identical to user-configured MFA).
  // 'totp'       — user opens their authenticator app; no send step needed.
  const [mfaStep, setMfaStep] = useState<'none' | 'email_code' | 'totp'>('none');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaSubmitting, setMfaSubmitting] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);

  // ─── Password reset state ─────────────────────────────────────────────────
  const [resetStatus, setResetStatus] = useState<'idle' | 'sending' | 'resending'>('idle');
  const [resetStep, setResetStep] = useState<'none' | 'awaiting-code'>('none');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // ─── Handlers ─────────────────────────────────────────────────────────────

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
      const result = await signIn!.create({ identifier: email.trim(), password });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        toast({ title: 'Signed In', description: 'Welcome back to your financial cockpit.' });
        navigate('/financial-connection');

      } else if (result.status === 'needs_second_factor') {
        // Determine which second-factor strategy Clerk is requesting.
        // Clerk's adaptive bot-protection also surfaces as needs_second_factor
        // with strategy email_code, even when the user has no MFA configured.
        const supported: Array<{ strategy: string }> = (result as any).supportedSecondFactors ?? [];
        const emailFactor = supported.find(f => f.strategy === 'email_code');
        const totpFactor  = supported.find(f => f.strategy === 'totp');

        setMfaCode('');
        setMfaError(null);

        if (emailFactor) {
          // prepareSecondFactor sends the code; must be called before attemptSecondFactor.
          await signIn!.prepareSecondFactor({ strategy: 'email_code' });
          setMfaStep('email_code');
        } else if (totpFactor) {
          // TOTP: authenticator app generates the code locally; no prepare step.
          setMfaStep('totp');
        } else {
          const names = supported.map(f => f.strategy).join(', ');
          setErrorMessage(
            `Additional verification is required (${names || 'unknown method'}). Please contact support.`
          );
        }

      } else {
        // Catch-all for needs_first_factor, needs_new_password, etc.
        setErrorMessage('Additional verification is required to finish signing in.');
      }
    } catch (err) {
      setErrorMessage(getClerkErrorMessage(err, 'Invalid email or password. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleMfaVerify = async () => {
    if (!isLoaded || mfaSubmitting) return;
    setMfaError(null);

    if (!mfaCode.trim()) {
      setMfaError('Enter the verification code.');
      return;
    }

    setMfaSubmitting(true);
    try {
      const result = await signIn!.attemptSecondFactor({
        strategy: mfaStep as 'email_code' | 'totp',
        code: mfaCode.trim(),
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        toast({ title: 'Signed In', description: 'Welcome back to your financial cockpit.' });
        navigate('/financial-connection');
      } else {
        setMfaError('Verification incomplete. Please try again.');
      }
    } catch (err) {
      setMfaError(getClerkErrorMessage(err, 'Invalid or expired code. Please try again.'));
    } finally {
      setMfaSubmitting(false);
    }
  };

  const handleMfaResend = async () => {
    if (!isLoaded) return;
    try {
      await signIn!.prepareSecondFactor({ strategy: 'email_code' });
      setMfaCode('');
      toast({ title: 'Code Resent', description: `Check ${email.trim()} for a new code.` });
    } catch (err) {
      toast({
        title: 'Could Not Resend Code',
        description: getClerkErrorMessage(err, 'Please try again shortly.'),
        variant: 'destructive',
      });
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
      // Use signIn (from useSignIn) — not client.signIn (from useClerk) — so
      // that handleCompletePasswordReset's attemptFirstFactor call runs on the
      // same React-managed reference and avoids the "verification not found" error.
      await signIn!.create({
        strategy: 'reset_password_email_code',
        identifier: email.trim(),
      });
      toast({ title: 'Code Sent', description: `Enter the code sent to ${email.trim()} below to set a new password.` });
      setResetError(null);
      setResetCode('');
      setNewPassword('');
      setResetStep('awaiting-code');
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

  const handleResetResend = async () => {
    if (!isLoaded || resetStatus !== 'idle') return;
    setResetStatus('resending');
    try {
      await signIn!.create({
        strategy: 'reset_password_email_code',
        identifier: email.trim(),
      });
      setResetCode('');
      toast({ title: 'New Code Sent', description: `Check ${email.trim()} for a fresh reset code.` });
      setResetError(null);
    } catch (err) {
      toast({
        title: 'Could Not Resend Code',
        description: getClerkErrorMessage(err, 'Please try again shortly.'),
        variant: 'destructive',
      });
    } finally {
      setResetStatus('idle');
    }
  };

  const handleCompletePasswordReset = async () => {
    if (!isLoaded || resetSubmitting) return;
    setResetError(null);

    if (!resetCode.trim()) {
      setResetError('Enter the verification code from your email.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setResetError('Choose a new password with at least 8 characters.');
      return;
    }

    setResetSubmitting(true);
    try {
      // Same signIn reference used by handleForgotPassword — avoids the
      // "You need to send a verification code before attempting to verify" error
      // that occurs when useClerk().client.signIn diverges from useSignIn().signIn.
      const result = await signIn!.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: resetCode.trim(),
        password: newPassword,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        toast({ title: 'Password Updated', description: 'Signed in with your new password.' });
        navigate('/financial-connection');
      } else {
        setResetError('Additional verification is required to finish resetting your password.');
      }
    } catch (err) {
      setResetError(getClerkErrorMessage(err, 'That code is invalid or expired. Request a new one and try again.'));
    } finally {
      setResetSubmitting(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[100dvh] w-full max-w-md mx-auto flex flex-col overflow-y-auto bg-[#05070A]">
      <div className="w-[327px] mx-auto flex-1 flex flex-col" style={{ paddingTop: 'calc(3rem + var(--safe-top))', paddingBottom: 'calc(2.5rem + var(--safe-bottom))' }}>
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
                  className="text-[#3B82F6] text-xs font-bold uppercase tracking-[0.5px] disabled:opacity-50 px-2 py-2 -mr-2"
                >
                  {resetStatus === 'sending' ? 'Sending...' : 'Forgot?'}
                </button>
              }
            />

            {/* ── Password reset panel ─────────────────────────────────── */}
            {resetStep === 'awaiting-code' && (
              <div className="flex flex-col gap-4 bg-[#111827] border border-white/5 rounded-2xl p-5">
                <span className="text-[#CBD5E1] font-semibold text-sm leading-5">
                  Enter the code sent to {email.trim()} and choose a new password.
                </span>

                {resetError && (
                  <div className="flex items-start gap-2.5 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl px-4 py-3">
                    <AlertCircle size={16} className="text-[#EF4444] flex-shrink-0 mt-0.5" />
                    <span className="text-[#EF4444] font-semibold text-sm leading-5">{resetError}</span>
                  </div>
                )}

                <ExecutiveInput
                  label="Verification Code"
                  type="text"
                  placeholder="123456"
                  inputMode="numeric"
                  maxLength={6}
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                />

                <div className="flex flex-col gap-1">
                  <ExecutiveInput
                    label="New Password"
                    type="password"
                    placeholder="••••••••"
                    leftIcon={<Lock size={18} />}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  {/* Show requirements upfront so the user doesn't burn their
                      single-use code on a password Clerk will reject. */}
                  <p className="text-[#808BA4] text-xs leading-4 pl-1">
                    At least 8 characters. Avoid common words or previously breached passwords.
                  </p>
                </div>

                <ExecutiveButton
                  type="button"
                  onClick={handleCompletePasswordReset}
                  text={resetSubmitting ? 'Updating...' : 'Set New Password'}
                  icon={resetSubmitting ? <Loader2 size={16} className="animate-spin" /> : undefined}
                  disabled={resetSubmitting}
                  className="disabled:opacity-70"
                />

                {/* Resend: reset codes are single-use — if the password was rejected
                    the user needs a fresh code before they can try again. */}
                <button
                  type="button"
                  onClick={handleResetResend}
                  disabled={resetStatus === 'resending'}
                  className="text-[#3B82F6] text-sm font-bold uppercase tracking-[0.5px] text-center py-3 disabled:opacity-50"
                >
                  {resetStatus === 'resending' ? 'Sending...' : 'Resend Code'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setResetStep('none');
                    setResetCode('');
                    setNewPassword('');
                    setResetError(null);
                  }}
                  className="text-[#808BA4] text-xs font-bold uppercase tracking-[0.5px] self-center px-4 py-3"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* ── MFA / second-factor panel ────────────────────────────── */}
            {/* Shown after signIn.create() returns needs_second_factor.     */}
            {/* Handles both email_code (Clerk bot-protection + user MFA)   */}
            {/* and totp (Google Authenticator / Authy).                    */}
            {mfaStep !== 'none' && (
              <div className="flex flex-col gap-4 bg-[#111827] border border-white/5 rounded-2xl p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 border border-[#2563EB]/20 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck size={18} className="text-[#2563EB]" />
                  </div>
                  <span className="text-[#CBD5E1] font-semibold text-sm leading-5">
                    {mfaStep === 'totp'
                      ? 'Enter the 6-digit code from your authenticator app.'
                      : `A verification code was sent to ${email.trim()}.`}
                  </span>
                </div>

                {mfaError && (
                  <div className="flex items-start gap-2.5 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl px-4 py-3">
                    <AlertCircle size={16} className="text-[#EF4444] flex-shrink-0 mt-0.5" />
                    <span className="text-[#EF4444] font-semibold text-sm leading-5">{mfaError}</span>
                  </div>
                )}

                <ExecutiveInput
                  label="Verification Code"
                  placeholder="000000"
                  inputMode="numeric"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                />

                <ExecutiveButton
                  type="button"
                  onClick={handleMfaVerify}
                  text={mfaSubmitting ? 'Verifying...' : 'Verify & Sign In'}
                  icon={mfaSubmitting ? <Loader2 size={16} className="animate-spin" /> : undefined}
                  disabled={mfaSubmitting}
                  className="disabled:opacity-70"
                />

                {mfaStep === 'email_code' && (
                  <button
                    type="button"
                    onClick={handleMfaResend}
                    className="text-[#3B82F6] text-sm font-bold uppercase tracking-[0.5px] text-center py-3"
                  >
                    Resend Code
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setMfaStep('none');
                    setMfaCode('');
                    setMfaError(null);
                  }}
                  className="text-[#808BA4] text-xs font-bold uppercase tracking-[0.5px] self-center px-4 py-3"
                >
                  Cancel
                </button>
              </div>
            )}

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
