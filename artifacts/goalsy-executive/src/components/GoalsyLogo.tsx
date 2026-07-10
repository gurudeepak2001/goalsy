import { Layers } from 'lucide-react';

interface GoalsyLogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export default function GoalsyLogo({ size = 'md' }: GoalsyLogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-16 h-16 rounded-2xl'
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 32
  };

  return (
    <div className={`bg-[#2563EB] flex items-center justify-center ${sizeClasses[size]}`}>
      <Layers color="white" size={iconSizes[size]} />
    </div>
  );
}
