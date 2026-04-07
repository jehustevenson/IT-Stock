'use client';

import React, {
  createContext, useContext, useState,
  useCallback, useEffect, ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { Asset, AssetStatus, Assignment } from '@/lib/supabase/types';
import { markOverdueAssignments } from '@/app/actions/overdue';

interface AppDataContextValue {
  assets:      Asset[];
  assignments: Assignment[];
  loading:     boolean;
  error:       string | null;

  addAsset:          (asset: Omit<Asset, 'id'>) => Promise<Asset>;
  updateAsset:       (asset: Asset) => Promise<void>;
  deleteAsset:       (id: string) => Promise<void>;
  deleteAssets:      (ids: Set<string>) => Promise<void>;
  changeAssetStatus: (id: string, status: AssetStatus) => Promise<void>;

  addAssignment:    (assignment: Omit<Assignment, 'id'>) => Promise<void>;
  returnAssignment: (id: string, returnedDate: string, condition?: string, notes?: string) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

// ── Mappers ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToAsset(row: any): Asset {
  return {
    id:            row.id,
    assetTag:      row.asset_tag,
    name:          row.name,
    category:      row.category,
    serialNumber:  row.serial_number,
    purchaseDate:  row.purchase_date,
    status:        row.status,
    location:      row.location,
    school:        row.school          ?? undefined,
    assignedTo:    row.assigned_to     ?? undefined,
    assignedToId:  row.assigned_to_id  ?? undefined,
    department:    row.department      ?? undefined,
    notes:         row.notes           ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToAssignment(row: any): Assignment {
  return {
    id:             row.id,
    assetId:        row.asset_id,
    assetTag:       row.asset_tag,
    assetName:      row.asset_name,
    category:       row.category,
    staffName:      row.staff_name,
    staffId:        row.staff_id,
    department:     row.department,
    dateAssigned:   row.date_assigned,
    expectedReturn: row.expected_return,
    status:         row.status,
    returnedDate:   row.returned_date ?? undefined,
    notes:          row.notes         ?? undefined,
  };
}

// ── Helper: redirect to /login on 401 ────────────────────────────────────────

async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, options);
  if (res.status === 401) {
    // Session expired — hard redirect to login
    window.location.href = '/login';
    throw new Error('Session expired');
  }
  return res;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [assets,      setAssets]      = useState<Asset[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setError(null);
      try {
        // FIX: mark overdue before fetching so statuses are fresh on every load
        await markOverdueAssignments().catch((e) =>
          console.warn('Overdue check failed (non-fatal):', e)
        );

        const [aRes, asRes] = await Promise.all([
          apiFetch('/api/assets'),
          apiFetch('/api/assignments'),
        ]);

        if (!aRes.ok)  throw new Error(`Assets API error: ${aRes.status}`);
        if (!asRes.ok) throw new Error(`Assignments API error: ${asRes.status}`);

        setAssets((await aRes.json()).map(rowToAsset));
        setAssignments((await asRes.json()).map(rowToAssignment));
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
    }
    load();
  }, []);

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

    const newAsset = rowToAsset(await res.json());
    setAssets((prev) => [newAsset, ...prev]);

    // FIX: removed the silent paired-assignment creation that bypassed validation.
    // Assignments must be created explicitly through the Assignment form.

    return newAsset;
  }, []);

  const updateAsset = useCallback(async (updated: Asset): Promise<void> => {
    const res = await apiFetch(`/api/assets/${updated.id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(updated),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? 'Failed to update asset');
    }

    const updatedAsset = rowToAsset(await res.json());
    setAssets((prev) => prev.map((a) => (a.id === updated.id ? updatedAsset : a)));
  }, []);

  const deleteAsset = useCallback(async (id: string): Promise<void> => {
    const res = await apiFetch(`/api/assets/${id}`, { method: 'DELETE' });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
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
  }, []);

  const deleteAssets = useCallback(async (ids: Set<string>): Promise<void> => {
    // FIX: check every response — partial failures no longer silently corrupt state
    const results = await Promise.all(
      [...ids].map((id) =>
        apiFetch(`/api/assets/${id}`, { method: 'DELETE' }).then((r) => ({ id, ok: r.ok, res: r }))
      )
    );

    const failed  = results.filter((r) => !r.ok);
    const deleted = new Set(results.filter((r) => r.ok).map((r) => r.id));

    if (failed.length > 0) {
      throw new Error(
        `${failed.length} of ${ids.size} asset(s) could not be deleted. The rest were removed.`
      );
    }

    const today = new Date().toISOString().split('T')[0];
    setAssets((prev) => prev.filter((a) => !deleted.has(a.id)));
    setAssignments((prev) =>
      prev.map((asgn) =>
        deleted.has(asgn.assetId) && (asgn.status === 'Active' || asgn.status === 'Overdue')
          ? { ...asgn, status: 'Returned' as const, returnedDate: today }
          : asgn
      )
    );
  }, []);

  const changeAssetStatus = useCallback(async (id: string, status: AssetStatus): Promise<void> => {
    const res = await apiFetch(`/api/assets/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? 'Failed to update status');
    }

    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  }, []);

  // ── Assignment mutations ────────────────────────────────────────────────────

  const addAssignment = useCallback(async (data: Omit<Assignment, 'id'>): Promise<void> => {
    const res = await apiFetch('/api/assignments', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? 'Failed to create assignment');
    }

    const newAssignment = rowToAssignment(await res.json());
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
  }, []);

  // FIX: returnAssignment now owns the API call instead of relying on ReturnModal
  // to have already called it. State only updates on confirmed API success.
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
  }, []);

  return (
    <AppDataContext.Provider value={{
      assets, assignments, loading, error,
      addAsset, updateAsset, deleteAsset, deleteAssets, changeAssetStatus,
      addAssignment, returnAssignment,
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