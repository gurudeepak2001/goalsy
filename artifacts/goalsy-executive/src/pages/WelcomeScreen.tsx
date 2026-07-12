import { useLocation } from 'wouter';
import OnboardingShell from '@/components/OnboardingShell';

export default function WelcomeScreen() {
  const [, setLocation] = useLocation();

  return (
    <OnboardingShell background="/welcome-bg.png" alt="Welcome to Goalsy Executive">
      {/* Transparent tap targets over the Figma buttons */}
      <button
        onClick={() => setLocation('/create-account')}
        className="absolute left-[6.15%] right-[6.15%] bottom-[16.35%] h-[6.64%] z-10"
        aria-label="Get Started"
      />
      <button
        onClick={() => setLocation('/signin')}
        className="absolute left-[6.15%] right-[6.15%] bottom-[8.53%] h-[6.64%] z-10"
        aria-label="Sign In"
      />
    </OnboardingShell>
  );
}
