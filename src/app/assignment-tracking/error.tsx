'use client';

import React, { useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { AlertTriangle } from 'lucide-react';

export default function AssignmentTrackingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Assignment tracking page error:', error);
  }, [error]);

  return (
    <AppLayout>
      <div className="px-6 lg:px-8 py-6 max-w-screen-2xl mx-auto">
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
            <AlertTriangle size={22} className="text-red-500" />
          </div>
          <p className="text-sm font-medium text-slate-800 mb-1">
            Failed to load assignment tracker
          </p>
          <p className="text-xs text-slate-500 mb-4">{error.message}</p>
          <button onClick={reset} className="btn-secondary text-xs">
            Try again
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
