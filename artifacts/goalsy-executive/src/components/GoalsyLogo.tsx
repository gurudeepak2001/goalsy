interface GoalsyLogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export default function GoalsyLogo({ size = 'md' }: GoalsyLogoProps) {
  const logoSrc = `${import.meta.env.BASE_URL}logo-icon.png`;
  const cls = size === 'sm'
    ? 'w-8 h-8 rounded-lg'
    : size === 'md'
      ? 'w-10 h-10 rounded-xl'
      : 'w-20 h-20 rounded-2xl';

  return (
    <img
      src={logoSrc}
      alt="Goalsy"
      className={`${cls} flex-shrink-0`}
      style={size === 'lg' ? { boxShadow: '0 0 40px rgba(37, 99, 235, 0.3)' } : undefined}
      draggable={false}
    />
  );
}
