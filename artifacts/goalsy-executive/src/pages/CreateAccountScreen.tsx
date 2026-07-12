import { useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from '@/hooks/use-toast';

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
    <div className="min-h-[100dvh] w-full max-w-md mx-auto relative overflow-hidden bg-black">
      <img
        src="/create-account-bg.png"
        alt="Create Account"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Back to Welcome */}
      <button
        onClick={() => navigate('/welcome')}
        className="absolute top-12 left-6 z-10 w-12 h-12 flex items-center justify-center"
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
          className="absolute top-[260px] left-6 right-6 h-12 bg-transparent text-white text-base outline-none placeholder-transparent"
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
          className="absolute top-[330px] left-6 right-6 h-12 bg-transparent text-white text-base outline-none placeholder-transparent"
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
          className="absolute top-[400px] left-6 right-6 h-12 bg-transparent text-white text-base outline-none placeholder-transparent"
          autoComplete="new-password"
          aria-label="Password"
        />

        {/* Create Account button (transparent overlay on Figma button) */}
        <button
          type="submit"
          className="absolute top-[510px] left-6 right-6 h-14 z-10"
          aria-label="Create Account"
        />
      </form>

      {/* Sign In link (transparent overlay on Figma text) */}
      <button
        onClick={() => navigate('/signin')}
        className="absolute top-[590px] left-6 right-6 h-10 z-10"
        aria-label="Already have an account? Sign In"
      />
    </div>
  );
}
