import { useLocation } from 'wouter';
import { PieChart, ShieldCheck } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import ExecutiveInput from '@/components/ExecutiveInput';
import ExecutiveButton from '@/components/ExecutiveButton';

export default function CreateAccountScreen() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] w-full bg-[#09090C] max-w-md mx-auto flex flex-col overflow-y-auto">
      <div className="px-6 pt-12 pb-10 flex-1 flex flex-col">
        <AppHeader />
        
        <h1 className="text-white font-black text-4xl mt-12 tracking-tight">Begin Your Mission.</h1>
        <p className="text-[#94A3B8] text-sm mt-3">Establish your financial operating system.</p>
        
        <div className="mt-10 flex flex-col gap-5">
          <ExecutiveInput 
            label="FULL NAME" 
            placeholder="Johnathan Executive"
            leftIcon={<PieChart size={20} />}
          />
          
          <ExecutiveInput 
            label="EMAIL ADDRESS" 
            type="email" 
            placeholder="executive@domain.com"
            leftIcon={<PieChart size={20} />}
          />
          
          <ExecutiveInput 
            label="SECURE PASSWORD" 
            type="password" 
            placeholder="••••••••"
            leftIcon={<ShieldCheck size={20} />}
          />
        </div>
        
        <ExecutiveButton 
          text="Create Account" 
          className="mt-8"
          onClick={() => setLocation('/financial-connection')}
        />
        
        <ExecutiveButton 
          variant="outline"
          text="Already have an account? Sign In" 
          className="mt-4"
          onClick={() => setLocation('/signin')}
        />
        
        <div className="mt-12 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-0.5 bg-[#2563EB]"></div>
            <span className="text-[#475569] text-xs tracking-widest uppercase font-medium">SECURITY PROTOCOLS ACTIVE</span>
          </div>
          <p className="text-[#475569] text-xs leading-relaxed mt-4">
            By establishing this account, you authorize encrypted data processing under the Executive Performance Standards.
          </p>
        </div>
        
        <div className="mt-auto pt-8 text-[#334155] text-[10px] tracking-[0.2em] uppercase text-left font-medium">
          GOALSY EXECUTIVE DESIGN SYSTEM © 2024
        </div>
      </div>
    </div>
  );
}
