import { useLocation } from 'wouter';

export default function WelcomeScreen() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] w-full max-w-md mx-auto relative overflow-hidden bg-black">
      <img
        src="/welcome-bg.png"
        alt="Welcome to Goalsy Executive"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Transparent tap targets over the Figma buttons */}
      <button
        onClick={() => setLocation('/create-account')}
        className="absolute left-6 right-6 bottom-[138px] h-14 z-10"
        aria-label="Get Started"
      />
      <button
        onClick={() => setLocation('/signin')}
        className="absolute left-6 right-6 bottom-[72px] h-14 z-10"
        aria-label="Sign In"
      />
    </div>
  );
}
