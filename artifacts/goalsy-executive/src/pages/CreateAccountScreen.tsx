import { useLocation } from 'wouter';
import { User, Mail, Lock } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import ExecutiveInput from '@/components/ExecutiveInput';
import ExecutiveButton from '@/components/ExecutiveButton';

export default function CreateAccountScreen() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] w-full max-w-md mx-auto flex flex-col overflow-y-auto bg-[#05070A]">
      <div className="w-[327px] mx-auto pt-12 pb-10 flex-1 flex flex-col">
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
              setLocation('/financial-connection');
            }}
          >
            <ExecutiveInput
              label="Full Name"
              placeholder="Johnathan Executive"
              leftIcon={<User size={18} />}
            />

            <ExecutiveInput
              label="Email Address"
              type="email"
              placeholder="executive@domain.com"
              leftIcon={<Mail size={18} />}
            />

            <ExecutiveInput
              label="Secure Password"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock size={18} />}
            />

            <div className="pt-4 flex flex-col gap-4">
              <ExecutiveButton
                text="Create Account"
                style={{
                  letterSpacing: '-0.000976562em',
                  boxShadow: '0 0 40px rgba(37, 99, 235, 0.15)',
                }}
                onClick={() => setLocation('/financial-connection')}
              />
              <ExecutiveButton
                variant="outline"
                text="Already have an account? Sign In"
                className="text-base"
                onClick={() => setLocation('/signin')}
              />
            </div>
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
    </div>
  );
}
