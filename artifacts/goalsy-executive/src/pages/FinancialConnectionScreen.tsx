import { useLocation } from 'wouter';

export default function FinancialConnectionScreen() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-[100dvh] w-full max-w-md mx-auto relative overflow-hidden bg-black">
      <img
        src="/financial-connection-bg.png"
        alt="Connect your financial accounts"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Back to Create Account */}
      <button
        onClick={() => navigate('/create-account')}
        className="absolute top-12 left-6 z-10 w-12 h-12 flex items-center justify-center"
        aria-label="Back"
      />

      {/* Connect Accounts button */}
      <button
        onClick={() => navigate('/goals')}
        className="absolute bottom-[108px] left-6 right-6 h-14 z-10"
        aria-label="Connect Accounts"
      />

      {/* Skip for Now button */}
      <button
        onClick={() => navigate('/goals')}
        className="absolute bottom-[58px] left-6 right-6 h-10 z-10"
        aria-label="Skip for Now"
      />
    </div>
  );
}
