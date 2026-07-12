interface ProgressBarProps {
  label?: string;
  value: number;
  max?: number;
  color?: string;
  suffix?: string;
  className?: string;
}

export default function ProgressBar({
  label,
  value,
  max = 100,
  color = '#22C55E',
  suffix = '%',
  className = '',
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-white text-sm font-semibold">{label}</span>
          <span className="text-[#94A3B8] text-sm font-bold">{value}{suffix}</span>
        </div>
      )}
      <div className="h-2.5 w-full bg-[#1A2238] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
