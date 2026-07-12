import { ReactNode } from 'react';

interface SectionLabelProps {
  text: string;
  rightElement?: ReactNode;
  accentBar?: boolean;
  className?: string;
}

export default function SectionLabel({ text, rightElement, accentBar = false, className = '' }: SectionLabelProps) {
  return (
    <div className={`flex items-center justify-between mb-3 ${className}`}>
      <div className="flex items-center gap-2">
        {accentBar && <div className="w-1 h-4 bg-[#2563EB] rounded-full" />}
        <h3 className="text-[#64748B] text-xs font-bold tracking-[0.25em] uppercase">{text}</h3>
      </div>
      {rightElement && <div>{rightElement}</div>}
    </div>
  );
}
