import { ReactNode } from 'react';

interface OnboardingShellProps {
  background: string;
  alt: string;
  children?: ReactNode;
}

export default function OnboardingShell({ background, alt, children }: OnboardingShellProps) {
  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-[#05070A]">
      <div className="relative w-full max-w-[390px] aspect-[390/844] max-h-[100dvh] overflow-hidden bg-black">
        <img
          src={background}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {children}
      </div>
    </div>
  );
}
