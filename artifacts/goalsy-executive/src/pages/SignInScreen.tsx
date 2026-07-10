import { useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from '@/hooks/use-toast';

export default function SignInScreen() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="min-h-[100dvh] w-full max-w-md mx-auto relative overflow-hidden bg-black">
      <img
        src="/signin-bg.png"
        alt="Sign In"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Back to Welcome */}
      <button
        onClick={() => navigate('/welcome')}
        className="absolute top-12 left-6 z-10 w-12 h-12 flex items-center justify-center"
        aria-label="Back"
      />

      {/* Email input */}
      <label htmlFor="signin-email" className="sr-only">Email address</label>
      <input
        id="signin-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="absolute top-[260px] left-6 right-6 h-12 bg-transparent text-white text-base outline-none placeholder-transparent z-10"
        autoComplete="email"
        aria-label="Email address"
      />

      {/* Password input */}
      <label htmlFor="signin-password" className="sr-only">Password</label>
      <input
        id="signin-password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="absolute top-[330px] left-6 right-6 h-12 bg-transparent text-white text-base outline-none placeholder-transparent z-10"
        autoComplete="current-password"
        aria-label="Password"
      />

      {/* Sign In button */}
      <button
        onClick={() => navigate('/financial-connection')}
        className="absolute top-[440px] left-6 right-6 h-14 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold rounded-full z-10 transition-colors"
      >
        Sign In
      </button>

      {/* Forgot Password */}
      <button
        onClick={() => toast({ title: 'Password Reset', description: 'Reset instructions sent to your email.' })}
        className="absolute top-[520px] left-6 right-6 h-10 text-white text-sm font-medium z-10"
      >
        Forgot Password?
      </button>

      {/* Create Account link */}
      <button
        onClick={() => navigate('/create-account')}
        className="absolute top-[600px] left-6 right-6 h-10 text-white text-sm font-medium z-10"
      >
        Don’t have an account? Sign Up
      </button>
    </div>
  );
}
