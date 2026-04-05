'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Asset, AssetStatus, Assignment } from '@/lib/mockData';

interface AppDataContextValue {
  assets: Asset[];
  assignments: Assignment[];
  loading: boolean;

  addAsset: (asset: Omit<Asset, 'id'>) => Promise<Asset>;
  updateAsset: (asset: Asset) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  deleteAssets: (ids: Set<string>) => Promise<void>;
  changeAssetStatus: (id: string, status: AssetStatus) => Promise<void>;

  addAssignment: (assignment: Omit<Assignment, 'id'>) => Promise<void>;
  returnAssignment: (id: string, returnedDate: string) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

// ── Mappers: DB snake_case rows → camelCase app types ────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToAsset(row: any): Asset {
  return {
    id:           row.id,
    assetTag:     row.asset_tag,
    name:         row.name,
    category:     row.category,
    serialNumber: row.serial_number,
    purchaseDate: row.purchase_date,
    status:       row.status,
    location:     row.location,
    school:       row.school        ?? undefined,
    assignedTo:   row.assigned_to   ?? undefined,
    assignedToId: row.assigned_to_id ?? undefined,
    department:   row.department    ?? undefined,
    notes:        row.notes         ?? undefined,
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

// ── Provider ─────────────────────────────────────────────────────────────────

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets]           = useState<Asset[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading]         = useState(true);

  // Load everything from the database on first mount
  useEffect(() => {
    async function load() {
      try {
        const [aRes, asRes] = await Promise.all([
          fetch('/api/assets'),
          fetch('/api/assignments'),
        ]);
        if (aRes.ok)  setAssets((await aRes.json()).map(rowToAsset));
        if (asRes.ok) setAssignments((await asRes.json()).map(rowToAssignment));
      } catch (err) {
        console.error('Failed to load data from DB:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Asset mutations ─────────────────────────────────────────────────────────

  const addAsset = useCallback(async (data: Omit<Asset, 'id'>): Promise<Asset> => {
    const res = await fetch('/api/assets', {
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

    // If added as Assigned, create a matching assignment in the DB too
    if (data.status === 'Assigned' && data.assignedTo && data.assignedToId) {
      const today         = new Date().toISOString().split('T')[0];
      const defaultReturn = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      try {
        const aRes = await fetch('/api/assignments', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assetTag:       newAsset.assetTag,
            assetName:      newAsset.name,
            category:       newAsset.category,
            staffName:      data.assignedTo,
            staffId:        data.assignedToId,
            department:     data.department ?? '',
            dateAssigned:   today,
            expectedReturn: defaultReturn,
            status:         'Active',
          }),
        });
        if (aRes.ok) {
          const newAssignment = rowToAssignment(await aRes.json());
          setAssignments((prev) => [newAssignment, ...prev]);
        }
      } catch (err) {
        console.error('Failed to create paired assignment:', err);
      }
    }

    return newAsset;
  }, []);

  const updateAsset = useCallback(async (updated: Asset): Promise<void> => {
    const res = await fetch(`/api/assets/${updated.id}`, {
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
    const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' });

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
    await Promise.all([...ids].map((id) => fetch(`/api/assets/${id}`, { method: 'DELETE' })));

    const today = new Date().toISOString().split('T')[0];
    setAssets((prev) => prev.filter((a) => !ids.has(a.id)));
    setAssignments((prev) =>
      prev.map((asgn) =>
        ids.has(asgn.assetId) && (asgn.status === 'Active' || asgn.status === 'Overdue')
          ? { ...asgn, status: 'Returned' as const, returnedDate: today }
          : asgn
      )
    );
  }, []);

  const changeAssetStatus = useCallback(async (id: string, status: AssetStatus): Promise<void> => {
    const res = await fetch(`/api/assets/${id}`, {
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
    const res = await fetch('/api/assignments', {
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

    // Sync asset status locally
    setAssets((prev) =>
      prev.map((a) =>
        a.assetTag === data.assetTag
          ? { ...a, status: 'Assigned' as AssetStatus, assignedTo: data.staffName, assignedToId: data.staffId, department: data.department }
          : a
      )
    );
  }, []);

  const returnAssignment = useCallback(async (id: string, returnedDate: string): Promise<void> => {
    // ReturnModal already calls the API directly, so here we just sync local state
    let assetTag = '';
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.id === id) { assetTag = a.assetTag; return { ...a, status: 'Returned' as const, returnedDate }; }
        return a;
      })
    );

    if (assetTag) {
      setAssets((prev) =>
        prev.map((a) =>
          a.assetTag === assetTag
            ? { ...a, status: 'Available' as AssetStatus, assignedTo: undefined, assignedToId: undefined, department: undefined }
            : a
        )
      );
    }
  }, []);

  return (
    <AppDataContext.Provider value={{
      assets, assignments, loading,
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