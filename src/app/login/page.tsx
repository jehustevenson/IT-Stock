'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Loader2, LogIn, Monitor } from 'lucide-react';

export default function LoginPage() {
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Hard navigation (not router.push): AppDataProvider lives in the root
    // layout and skips data-loading while on /login, so we need a full page
    // load to remount it and fetch data with the fresh session cookies.
    window.location.assign('/dashboard');
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <Monitor size={18} className="text-white" />
          </div>
          <span className="text-lg font-semibold text-slate-900">ITAssetTracker</span>
        </div>

        <div className="card p-6">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-slate-900">Sign in</h1>
            <p className="text-sm text-slate-500 mt-1">Enter your IT admin credentials</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="form-label">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@company.com"
                required
                autoComplete="email"
                className="form-input"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="form-label">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="form-input"
              />
            </div>

            {error && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn size={15} />
                  Sign in
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Access restricted to authorised IT personnel only.
        </p>
      </div>
    </div>
  );
}
