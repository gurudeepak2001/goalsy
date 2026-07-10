import { ButtonHTMLAttributes, ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

interface ExecutiveButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline';
  text: string;
  icon?: ReactNode;
}

export default function ExecutiveButton({ variant = 'primary', text, icon, className = '', ...props }: ExecutiveButtonProps) {
  const isPrimary = variant === 'primary';
  
  return (
    <button 
      className={`h-14 w-full flex items-center justify-center gap-2 rounded-xl text-base font-semibold transition-colors ${
        isPrimary 
          ? 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white' 
          : 'bg-transparent border border-[#2A3550] text-white hover:bg-[#2A3550]/50'
      } ${className}`}
      {...props}
    >
      {text}
      {icon ? icon : isPrimary ? <ArrowRight size={20} /> : null}
    </button>
  );
}
