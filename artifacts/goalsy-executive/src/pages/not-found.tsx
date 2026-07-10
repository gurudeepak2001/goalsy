import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-[#09090C] max-w-md mx-auto px-6">
      <div className="bg-[#0F1625] border border-[#1A2238] rounded-2xl p-6 w-full">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="h-8 w-8 text-[#EF4444]" />
          <h1 className="text-2xl font-bold text-white">
            404 Page Not Found
          </h1>
        </div>

        <p className="text-sm text-[#94A3B8]">
          Did you forget to add the page to the router?
        </p>
      </div>
    </div>
  );
}
