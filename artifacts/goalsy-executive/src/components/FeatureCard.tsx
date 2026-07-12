import { ReactNode } from 'react';

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
}

export default function FeatureCard({ icon, title, subtitle }: FeatureCardProps) {
  return (
    <div className="bg-[#0F1625] border border-[#1A2238] rounded-xl p-4 flex items-center gap-4">
      <div className="bg-[#131E35] rounded-xl p-3 flex-shrink-0 text-white">
        {icon}
      </div>
      <div>
        <div className="text-white font-semibold text-sm">{title}</div>
        <div className="text-[#64748B] text-xs mt-0.5">{subtitle}</div>
      </div>
    </div>
  );
}
