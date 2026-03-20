'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-background gap-6 px-4">
      <div className="w-16 h-16 rounded-2xl bg-error/10 flex items-center justify-center">
        <span className="text-error text-2xl font-black">!</span>
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold text-text-primary tracking-tight mb-2">Something went wrong</h2>
        <p className="text-sm text-text-secondary max-w-xs">An unexpected error occurred. Please try again.</p>
      </div>
      <button
        onClick={reset}
        className="px-6 py-3 primary-gradient text-white font-bold rounded-xl shadow-glow active:scale-95 transition-all cursor-pointer focus-ring"
      >
        Try again
      </button>
    </div>
  );
}
