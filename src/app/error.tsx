'use client';

import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="card p-12 max-w-md w-full flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <AlertTriangle size={22} className="text-red-500" />
        </div>
        <p className="text-sm font-medium text-slate-800 mb-1">
          Something went wrong
        </p>
        <p className="text-xs text-slate-500 mb-4">{error.message}</p>
        <button onClick={reset} className="btn-secondary text-xs">
          Try again
        </button>
      </div>
    </div>
  );
}
