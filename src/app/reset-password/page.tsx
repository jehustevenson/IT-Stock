'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { KeyRound, Loader2, Monitor } from 'lucide-react';

/**
 * Landing page for the password-recovery email link.
 *
 * The Supabase browser client (PKCE flow with detectSessionInUrl) exchanges
 * the `?code=` from the email link for a session automatically on page load.
 * Once a session exists, we let the user set a new password via
 * `auth.updateUser`. If the link is expired/invalid, no session ever appears
 * and we show a way back to request a fresh link.
 */
export default function ResetPasswordPage() {
  const supabase = createClient();

  // 'checking' → waiting for the code exchange; 'ready' → session present;
  // 'invalid' → no session appeared (expired or already-used link).
  const [linkState, setLinkState] = useState<'checking' | 'ready' | 'invalid'>('checking');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // The code exchange may still be in flight when this runs, so subscribe
    // to auth changes as well as checking the current session.
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) setLinkState('ready');
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled && session) setLinkState('ready');
    });

    // Give the exchange a few seconds before declaring the link dead.
    const timer = setTimeout(() => {
      if (!cancelled) {
        setLinkState((s) => (s === 'checking' ? 'invalid' : s));
      }
    }, 5000);

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setDone(true);
    // Recovery session is a real session — go straight in. Hard navigation so
    // AppDataProvider remounts and loads data.
    setTimeout(() => window.location.assign('/dashboard'), 1200);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <Monitor size={18} className="text-white" />
          </div>
          <span className="text-lg font-semibold text-slate-900">ITAssetTracker</span>
        </div>

        <div className="card p-6">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-slate-900">Set a new password</h1>
          </div>

          {linkState === 'checking' && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={15} className="animate-spin" />
              Verifying reset link…
            </div>
          )}

          {linkState === 'invalid' && (
            <div className="space-y-4">
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-700">
                  This reset link is invalid or has expired.
                </p>
              </div>
              <Link href="/forgot-password" className="btn-primary w-full justify-center">
                Request a new link
              </Link>
            </div>
          )}

          {linkState === 'ready' && (
            done ? (
              <div className="px-3 py-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  Password updated — taking you to the dashboard…
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="form-label">New password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Confirm new password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    autoComplete="new-password"
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
                      Updating…
                    </>
                  ) : (
                    <>
                      <KeyRound size={15} />
                      Update password
                    </>
                  )}
                </button>
              </form>
            )
          )}
        </div>
      </div>
    </div>
  );
}
