'use client';

import React, {
  createContext, useContext, useState,
  useCallback, useEffect, ReactNode,
} from 'react';
import {
  Asset,
  AssetStatus,
  Assignment,
  DBAsset,
  DBAssignment,
  toAsset,
  toAssignment,
} from '@/lib/supabase/types';
import { markOverdueAssignments } from '@/app/actions/overdue';

interface AppDataContextValue {
  assets:      Asset[];
  assignments: Assignment[];
  loading:     boolean;
  error:       string | null;
  refetch:     () => Promise<void>;

  addAsset:          (asset: Omit<Asset, 'id'>) => Promise<Asset>;
  updateAsset:       (asset: Asset) => Promise<void>;
  deleteAsset:       (id: string) => Promise<void>;
  deleteAssets:      (ids: Set<string>) => Promise<void>;
  changeAssetStatus: (id: string, status: AssetStatus) => Promise<void>;

  addAssignment:          (assignment: Omit<Assignment, 'id'>) => Promise<void>;
  returnAssignment:       (id: string, returnedDate: string, condition?: string, notes?: string) => Promise<void>;
  updateAssignmentReturn: (id: string, expectedReturn: string) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

// ── Helper: redirect to /login on 401 ────────────────────────────────────────

// Pages where no app data should load and 401s must never redirect —
// redirecting from here causes reload loops or kicks users out of the
// password-reset flow. Keep in sync with the middleware's isAuthPage list.
const AUTH_PAGES = ['/login', '/forgot-password', '/reset-password'];

function isOnAuthPage(): boolean {
  return (
    typeof window !== 'undefined' &&
    AUTH_PAGES.some((p) => window.location.pathname.startsWith(p))
  );
}

async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, options);
  if (res.status === 401) {
    // Session expired — hard redirect to login. Never redirect if we're
    // already on /login: that reloads the page, remounts the provider, and
    // creates an infinite refresh loop.
    if (typeof window !== 'undefined' && !isOnAuthPage()) {
      window.location.href = '/login';
    }
    throw new Error('Session expired');
  }
  return res;
}

// ── Paginated fetch helpers ──────────────────────────────────────────────────
// API routes now return { data, pagination }. Walk pages until hasMore is false.

interface Paginated<T> {
  data: T[];
  pagination: { offset: number; limit: number; total: number; hasMore: boolean };
}

async function fetchAllPages<T>(baseUrl: string): Promise<T[]> {
  const pageSize = 500;
  let offset = 0;
  let collected: T[] = [];
  // Safety bound: stop after 20 pages (10,000 rows) to avoid runaway loops.
  for (let i = 0; i < 20; i += 1) {
    const res = await apiFetch(`${baseUrl}?limit=${pageSize}&offset=${offset}`);
    if (!res.ok) throw new Error(`API error ${res.status} fetching ${baseUrl}`);
    const body = (await res.json()) as Paginated<T>;
    collected = collected.concat(body.data ?? []);
    if (!body.pagination?.hasMore) break;
    offset += pageSize;
  }
  return collected;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [assets,      setAssets]      = useState<Asset[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    // No data to load on auth pages — and fetching here would 401.
    if (isOnAuthPage()) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      // Mark overdue before fetching so statuses are fresh on every load.
      await markOverdueAssignments().catch((e) =>
        console.warn('Overdue check failed (non-fatal):', e)
      );

      const [assetRows, assignmentRows] = await Promise.all([
        fetchAllPages<DBAsset>('/api/assets'),
        fetchAllPages<DBAssignment>('/api/assignments'),
      ]);

      setAssets(assetRows.map(toAsset));
      setAssignments(assignmentRows.map(toAssignment));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load data';
      // Don't surface "Session expired" — the redirect handles it
      if (msg !== 'Session expired') {
        console.error('AppDataContext load error:', err);
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refetch = useCallback(async () => {
    setLoading(true);
    await load();
  }, [load]);

  // ── Asset mutations ─────────────────────────────────────────────────────────

  const addAsset = useCallback(async (data: Omit<Asset, 'id'>): Promise<Asset> => {
    const res = await apiFetch('/api/assets', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? 'Failed to add asset');
    }

    const newAsset = toAsset((await res.json()) as DBAsset);
    setAssets((prev) => [newAsset, ...prev]);
    return newAsset;
  }, []);

  const updateAsset = useCallback(async (updated: Asset): Promise<void> => {
    const res = await apiFetch(`/api/assets/${updated.id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(updated),
    });

    if (!res.ok) {
      // Server state unchanged; refetch to reconcile in case of partial failure.
      const err = await res.json().catch(() => ({}));
      await load();
      throw new Error(err.error ?? 'Failed to update asset');
    }

    const updatedAsset = toAsset((await res.json()) as DBAsset);
    setAssets((prev) => prev.map((a) => (a.id === updated.id ? updatedAsset : a)));
  }, [load]);

  const deleteAsset = useCallback(async (id: string): Promise<void> => {
    const res = await apiFetch(`/api/assets/${id}`, { method: 'DELETE' });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      await load();
      throw new Error(err.error ?? 'Failed to delete asset');
    }

    const today = new Date().toISOString().split('T')[0];
    setAssets((prev) => prev.filter((a) => a.id !== id));
    setAssignments((prev) =>
      prev.map((asgn) =>
        asgn.assetId === id && (asgn.status === 'Active' || asgn.status === 'Overdue')
          ? { ...asgn, status: 'Returned' as const, returnedDate: today }
          : asgn
      )
    );
  }, [load]);

  const deleteAssets = useCallback(async (ids: Set<string>): Promise<void> => {
    // Check every response — partial failures no longer silently corrupt state.
    const results = await Promise.all(
      [...ids].map((id) =>
        apiFetch(`/api/assets/${id}`, { method: 'DELETE' }).then((r) => ({ id, ok: r.ok }))
      )
    );

    const failed  = results.filter((r) => !r.ok);
    const deleted = new Set(results.filter((r) => r.ok).map((r) => r.id));

    const today = new Date().toISOString().split('T')[0];
    setAssets((prev) => prev.filter((a) => !deleted.has(a.id)));
    setAssignments((prev) =>
      prev.map((asgn) =>
        deleted.has(asgn.assetId) && (asgn.status === 'Active' || asgn.status === 'Overdue')
          ? { ...asgn, status: 'Returned' as const, returnedDate: today }
          : asgn
      )
    );

    if (failed.length > 0) {
      // Reconcile with server truth before surfacing the error.
      await load();
      throw new Error(
        `${failed.length} of ${ids.size} asset(s) could not be deleted. The rest were removed.`
      );
    }
  }, [load]);

  const changeAssetStatus = useCallback(async (id: string, status: AssetStatus): Promise<void> => {
    const res = await apiFetch(`/api/assets/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      await load();
      throw new Error(err.error ?? 'Failed to update status');
    }

    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  }, [load]);

  // ── Assignment mutations ────────────────────────────────────────────────────

  const addAssignment = useCallback(async (data: Omit<Assignment, 'id'>): Promise<void> => {
    const res = await apiFetch('/api/assignments', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      // Server may have created an assignment but failed to update the asset
      // (or vice versa). Refetch so the UI reflects actual state.
      await load();
      throw new Error(err.error ?? 'Failed to create assignment');
    }

    const newAssignment = toAssignment((await res.json()) as DBAssignment);
    setAssignments((prev) => [newAssignment, ...prev]);

    setAssets((prev) =>
      prev.map((a) =>
        a.assetTag === data.assetTag
          ? {
              ...a,
              status:        'Assigned' as AssetStatus,
              assignedTo:    data.staffName,
              assignedToId:  data.staffId,
              department:    data.department,
            }
          : a
      )
    );
  }, [load]);

  // returnAssignment now owns the API call. State only updates on confirmed success.
  const returnAssignment = useCallback(async (
    id: string,
    returnedDate: string,
    condition?: string,
    notes?: string,
  ): Promise<void> => {
    const res = await apiFetch(`/api/assignments/${id}/return`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ returnedDate, condition, notes }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      await load();
      throw new Error(err.error ?? 'Failed to process return');
    }

    let assetTag = '';
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          assetTag = a.assetTag;
          return { ...a, status: 'Returned' as const, returnedDate };
        }
        return a;
      })
    );

    if (assetTag) {
      setAssets((prev) =>
        prev.map((a) =>
          a.assetTag === assetTag
            ? {
                ...a,
                status:        'Available' as AssetStatus,
                assignedTo:    undefined,
                assignedToId:  undefined,
                department:    undefined,
              }
            : a
        )
      );
    }
  }, [load]);

  // Edit an assignment's expected return date; server recomputes Active/Overdue.
  const updateAssignmentReturn = useCallback(async (
    id: string,
    expectedReturn: string,
  ): Promise<void> => {
    const res = await apiFetch(`/api/assignments/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ expectedReturn }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      await load();
      throw new Error(err.error ?? 'Failed to update return date');
    }

    const updated = toAssignment((await res.json()) as DBAssignment);
    setAssignments((prev) => prev.map((a) => (a.id === id ? updated : a)));
  }, [load]);

  return (
    <AppDataContext.Provider value={{
      assets, assignments, loading, error, refetch,
      addAsset, updateAsset, deleteAsset, deleteAssets, changeAssetStatus,
      addAssignment, returnAssignment, updateAssignmentReturn,
    }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside <AppDataProvider>');
  return ctx;
}
