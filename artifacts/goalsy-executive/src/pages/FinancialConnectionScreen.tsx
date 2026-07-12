import { useLocation } from 'wouter';
import OnboardingShell from '@/components/OnboardingShell';

export default function FinancialConnectionScreen() {
  const [, navigate] = useLocation();

  return (
    <OnboardingShell background="/financial-connection-bg.png" alt="Connect your financial accounts">
      {/* Back to Create Account */}
      <button
        onClick={() => navigate('/create-account')}
        className="absolute top-[5.69%] left-[6.15%] w-[12.31%] h-[5.69%] z-10 flex items-center justify-center"
        aria-label="Back"
      />

      {/* Connect Accounts button */}
      <button
        onClick={() => navigate('/goals')}
        className="absolute left-[6.15%] right-[6.15%] bottom-[12.80%] h-[6.64%] z-10"
        aria-label="Connect Accounts"
      />

      {/* Skip for Now button */}
      <button
        onClick={() => navigate('/goals')}
        className="absolute left-[6.15%] right-[6.15%] bottom-[6.87%] h-[4.74%] z-10"
        aria-label="Skip for Now"
      />
    </OnboardingShell>
  );
}
