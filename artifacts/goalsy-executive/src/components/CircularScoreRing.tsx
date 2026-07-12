import { useId } from 'react';

interface CircularScoreRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  gradientTo?: string;
  label?: string;
  sublabel?: string;
  sublabelColor?: string;
  showGlow?: boolean;
  className?: string;
}

export default function CircularScoreRing({
  value,
  max = 100,
  size = 160,
  strokeWidth = 10,
  color = '#22C55E',
  gradientTo,
  label,
  sublabel,
  sublabelColor,
  showGlow = true,
  className = '',
}: CircularScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(value, max);
  const offset = circumference - (clamped / max) * circumference;
  const glowColor = `${color}40`;
  const gradientId = useId().replace(/:/g, '');
  const endColor = gradientTo || '#60A5FA';

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {showGlow && (
        <div
          className="absolute rounded-full"
          style={{
            width: size - strokeWidth * 2,
            height: size - strokeWidth * 2,
            boxShadow: `0 0 40px 12px ${glowColor}`,
          }}
        />
      )}
      <svg width={size} height={size} className="-rotate-90 relative z-10">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={endColor} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1A2238"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
        <span className="text-white text-4xl font-black tracking-tight">{label ?? value}</span>
        {sublabel && (
          <span
            className="text-[10px] uppercase tracking-wider font-bold mt-1"
            style={{ color: sublabelColor || '#64748B' }}
          >
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
