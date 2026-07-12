import { ButtonHTMLAttributes, ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

interface ExecutiveButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline';
  text: string;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
}

export default function ExecutiveButton({ variant = 'primary', text, icon, iconPosition = 'right', className = '', ...props }: ExecutiveButtonProps) {
  const isPrimary = variant === 'primary';
  const resolvedIcon = icon !== undefined ? icon : isPrimary ? <ArrowRight size={16} /> : null;

  return (
    <button
      className={`w-full flex items-center justify-center gap-3 rounded-2xl text-lg font-bold transition-colors ${
        isPrimary
          ? 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white h-16'
          : 'bg-transparent border-2 border-white/20 text-white h-16 hover:bg-white/5'
      } ${className}`}
      style={isPrimary ? { boxShadow: '0 0 30px rgba(37, 99, 235, 0.25)' } : undefined}
      {...props}
    >
      {iconPosition === 'left' && resolvedIcon}
      {text}
      {iconPosition === 'right' && resolvedIcon}
    </button>
  );
}
