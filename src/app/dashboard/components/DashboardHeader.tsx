'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export default function DashboardHeader() {
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    // Set on mount so it's accurate and avoids hydration mismatch
    setLastUpdated(
      new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  }, []);

  function handleRefresh() {
    window.location.reload();
  }

  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Asset Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          IT inventory overview — last updated{' '}
          <span className="font-medium text-slate-700">
            {lastUpdated || '…'}
          </span>
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </div>
        <button onClick={handleRefresh} className="btn-secondary text-xs gap-1.5">
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>
    </div>
  );
}