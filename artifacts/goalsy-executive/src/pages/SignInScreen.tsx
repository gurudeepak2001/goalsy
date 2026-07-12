import { useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from '@/hooks/use-toast';
import OnboardingShell from '@/components/OnboardingShell';

export default function SignInScreen() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: 'Validation', description: 'Please enter your email and password.' });
      return;
    }
    navigate('/goals');
  };

  return (
    <OnboardingShell background="/signin-bg.png" alt="Sign In">
      <form onSubmit={handleSubmit} className="absolute inset-0 z-10">
        {/* Email input */}
        <label htmlFor="signin-email" className="sr-only">Email address</label>
        <input
          id="signin-email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="absolute top-[30.81%] left-[6.15%] right-[6.15%] h-[5.69%] bg-transparent text-white text-base outline-none placeholder-transparent"
          autoComplete="email"
          aria-label="Email address"
        />

        {/* Password input */}
        <label htmlFor="signin-password" className="sr-only">Password</label>
        <input
          id="signin-password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="absolute top-[39.10%] left-[6.15%] right-[6.15%] h-[5.69%] bg-transparent text-white text-base outline-none placeholder-transparent"
          autoComplete="current-password"
          aria-label="Password"
        />

        {/* Sign In button (transparent overlay on Figma button) */}
        <button
          type="submit"
          className="absolute top-[52.13%] left-[6.15%] right-[6.15%] h-[6.64%] z-10"
          aria-label="Sign In"
        />
      </form>

      {/* Forgot Password (transparent overlay on Figma text) */}
      <button
        onClick={() => toast({ title: 'Password Reset', description: 'Reset instructions sent to your email.' })}
        className="absolute top-[61.61%] left-[6.15%] right-[6.15%] h-[4.74%] z-10"
        aria-label="Forgot Password?"
      />

      {/* Create Account link (transparent overlay on Figma text) */}
      <button
        onClick={() => navigate('/create-account')}
        className="absolute top-[71.09%] left-[6.15%] right-[6.15%] h-[4.74%] z-10"
        aria-label="Don’t have an account? Sign Up"
      />
    </OnboardingShell>
  );
}
