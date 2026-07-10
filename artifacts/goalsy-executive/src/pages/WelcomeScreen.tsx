import { useLocation } from 'wouter';
import ExecutiveButton from '@/components/ExecutiveButton';

export default function WelcomeScreen() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] w-full max-w-md mx-auto relative overflow-hidden bg-black">
      <img
        src="/welcome-bg.png"
        alt="Welcome to Goalsy Executive"
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="absolute inset-x-0 bottom-0 px-6 pb-10 pt-12 flex flex-col items-center">
        <ExecutiveButton
          text="Get Started"
          onClick={() => setLocation('/create-account')}
        />
        <ExecutiveButton
          variant="outline"
          text="Sign In"
          className="mt-3"
          onClick={() => setLocation('/signin')}
        />
      </div>
    </div>
  );
}
