'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Loader2, Mail, Monitor } from 'lucide-react';

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
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
            <h1 className="text-xl font-semibold text-slate-900">Reset password</h1>
            <p className="text-sm text-slate-500 mt-1">
              We&apos;ll email you a link to set a new password.
            </p>
          </div>

          {sent ? (
            <div className="px-3 py-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                If an account exists for <span className="font-medium">{email}</span>, a
                reset link is on its way. Check your inbox (and spam folder).
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    Sending…
                  </>
                ) : (
                  <>
                    <Mail size={15} />
                    Send reset link
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs mt-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft size={12} />
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
