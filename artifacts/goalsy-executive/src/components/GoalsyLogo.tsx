interface GoalsyLogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export default function GoalsyLogo({ size = 'md' }: GoalsyLogoProps) {
  // sm / md — squircle G icon, used in the app header at small sizes
  // lg      — full wordmark (G + "Goalsy" text), used on the splash screen
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-56 rounded-3xl',
  };

  const src = size === 'lg' ? '/logo-wordmark.png' : '/logo-icon.png';
  const alt = size === 'lg' ? 'Goalsy wordmark' : 'Goalsy';

  return (
    <img
      src={src}
      alt={alt}
      className={sizeClasses[size]}
      draggable={false}
    />
  );
}
