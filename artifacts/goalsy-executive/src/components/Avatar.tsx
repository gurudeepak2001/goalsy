import { User } from 'lucide-react';

interface AvatarProps {
  src?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Avatar({ src, fallback, size = 'md' }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
    xl: 'w-20 h-20 text-xl',
  };

  return (
    <div
      className={`bg-[#0F1625] border border-[#1A2238] rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${sizeClasses[size]}`}
      aria-label={fallback ? `Avatar for ${fallback}` : 'User avatar'}
    >
      {src ? (
        <img src={src} alt={fallback || 'Avatar'} className="w-full h-full object-cover" />
      ) : fallback ? (
        <span className="text-white font-semibold">{fallback.slice(0, 2).toUpperCase()}</span>
      ) : (
        <User size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} className="text-[#64748B]" />
      )}
    </div>
  );
}
