import { useLocation } from 'wouter';
import { toast } from '@/hooks/use-toast';
import { PieChart, ShieldCheck, Target } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import ExecutiveInput from '@/components/ExecutiveInput';
import ExecutiveButton from '@/components/ExecutiveButton';

export default function SignInScreen() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-[100dvh] w-full bg-[#09090C] max-w-md mx-auto flex flex-col overflow-y-auto">
      <div className="px-6 pt-12 pb-10 flex-1 flex flex-col">
        <AppHeader />
        
        <h1 className="text-white font-black text-4xl mt-12 tracking-tight">Welcome Back.</h1>
        <p className="text-[#94A3B8] text-sm mt-3">Access your financial cockpit.</p>
        
        <div className="mt-10 flex flex-col gap-5">
          <ExecutiveInput 
            label="EMAIL ADDRESS" 
            type="email" 
            placeholder="executive@domain.com"
            leftIcon={<PieChart size={20} />}
          />
          
          <ExecutiveInput 
            label="PASSWORD" 
            type="password" 
            placeholder="••••••••"
            leftIcon={<ShieldCheck size={20} />}
            rightElement={
              <button
                type="button"
                onClick={() => toast({ title: 'Password Reset', description: 'Reset instructions sent to your email.' })}
                className="text-[#2563EB] text-xs font-semibold tracking-widest hover:text-[#1D4ED8] transition-colors"
              >
                FORGOT?
              </button>
            }
          />
        </div>
        
        <ExecutiveButton
          text="Sign In"
          className="mt-8"
          onClick={() => navigate('/financial-connection')}
        />
        
        <div className="mt-10 flex items-center gap-4">
          <div className="bg-[#1E2D45] h-px flex-1"></div>
          <span className="text-[#475569] text-xs tracking-widest uppercase font-medium">SECURE BIOMETRIC</span>
          <div className="bg-[#1E2D45] h-px flex-1"></div>
        </div>
        
        <div className="mt-8 flex flex-col items-center">
          <button
            onClick={() => navigate('/goals')}
            className="bg-[#0F1625] border border-[#1A2238] rounded-2xl p-4 w-16 h-16 flex items-center justify-center hover:bg-[#131E35] transition-colors"
            aria-label="Sign in with FaceID"
            data-testid="button-faceid"
          >
            <Target size={28} className="text-white" strokeWidth={1.5} aria-hidden="true" />
          </button>
          <span className="text-white font-semibold text-sm mt-3">Use FaceID</span>
        </div>
        
        <div className="mt-auto pt-12 text-[#475569] text-[10px] tracking-[0.2em] uppercase text-center font-medium">
          PRECISION INTELLIGENCE SYSTEM V4.2
        </div>
      </div>
    </div>
  );
}
