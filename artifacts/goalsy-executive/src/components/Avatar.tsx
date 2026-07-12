import { User } from 'lucide-react';

interface AvatarProps {
  src?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'nav';
  className?: string;
}

export default function Avatar({ src, fallback, size = 'md', className = '' }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
    xl: 'w-20 h-20 text-xl',
    nav: 'w-10 h-10 text-sm',
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20,
    xl: 32,
    nav: 16,
  };

  return (
    <div
      className={`bg-[#0F1625] border border-[#1A2238] rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${sizeClasses[size]} ${className}`}
      aria-label={fallback ? `Avatar for ${fallback}` : 'User avatar'}
    >
      {src ? (
        <img src={src} alt={fallback || 'Avatar'} className="w-full h-full object-cover" />
      ) : fallback ? (
        <span className="text-white font-semibold">{fallback.slice(0, 2).toUpperCase()}</span>
      ) : (
        <User size={iconSizes[size]} className="text-[#64748B]" />
      )}
    </div>
  );
}
