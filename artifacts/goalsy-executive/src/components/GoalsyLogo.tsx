import { Layers } from 'lucide-react';

interface GoalsyLogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export default function GoalsyLogo({ size = 'md' }: GoalsyLogoProps) {
  // sm / md — squircle G icon image, used in the app header at small sizes
  if (size !== 'lg') {
    const cls = size === 'sm' ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl';
    return <img src="/logo-icon.png" alt="Goalsy" className={cls} draggable={false} />;
  }

  // lg — blue rounded square with white icon, used on the splash screen
  // Matches the Figma spec: 80×80, #2563EB, radius 16px, 0px 0px 40px glow
  return (
    <div
      className="flex items-center justify-center flex-shrink-0"
      style={{
        width: 80,
        height: 80,
        backgroundColor: '#2563EB',
        borderRadius: 16,
        boxShadow: '0px 0px 40px rgba(37, 99, 235, 0.3)',
      }}
    >
      <Layers color="white" size={40} strokeWidth={1.75} />
    </div>
  );
}
