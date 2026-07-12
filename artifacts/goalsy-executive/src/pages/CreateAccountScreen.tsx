import { useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from '@/hooks/use-toast';
import OnboardingShell from '@/components/OnboardingShell';

export default function CreateAccountScreen() {
  const [, navigate] = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast({ title: 'Validation', description: 'Please fill in all fields.' });
      return;
    }
    navigate('/financial-connection');
  };

  return (
    <OnboardingShell background="/create-account-bg.png" alt="Create Account">
      {/* Back to Welcome */}
      <button
        onClick={() => navigate('/welcome')}
        className="absolute top-[5.69%] left-[6.15%] w-[12.31%] h-[5.69%] z-10 flex items-center justify-center"
        aria-label="Back"
      />

      <form onSubmit={handleSubmit} className="absolute inset-0 z-10">
        {/* Full name input */}
        <label htmlFor="create-name" className="sr-only">Full name</label>
        <input
          id="create-name"
          name="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="absolute top-[30.81%] left-[6.15%] right-[6.15%] h-[5.69%] bg-transparent text-white text-base outline-none placeholder-transparent"
          autoComplete="name"
          aria-label="Full name"
        />

        {/* Email input */}
        <label htmlFor="create-email" className="sr-only">Email address</label>
        <input
          id="create-email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="absolute top-[39.10%] left-[6.15%] right-[6.15%] h-[5.69%] bg-transparent text-white text-base outline-none placeholder-transparent"
          autoComplete="email"
          aria-label="Email address"
        />

        {/* Password input */}
        <label htmlFor="create-password" className="sr-only">Password</label>
        <input
          id="create-password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="absolute top-[47.39%] left-[6.15%] right-[6.15%] h-[5.69%] bg-transparent text-white text-base outline-none placeholder-transparent"
          autoComplete="new-password"
          aria-label="Password"
        />

        {/* Create Account button (transparent overlay on Figma button) */}
        <button
          type="submit"
          className="absolute top-[60.43%] left-[6.15%] right-[6.15%] h-[6.64%] z-10"
          aria-label="Create Account"
        />
      </form>

      {/* Sign In link (transparent overlay on Figma text) */}
      <button
        onClick={() => navigate('/signin')}
        className="absolute top-[69.91%] left-[6.15%] right-[6.15%] h-[4.74%] z-10"
        aria-label="Already have an account? Sign In"
      />
    </OnboardingShell>
  );
}
