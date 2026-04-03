'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  ASSETS as INITIAL_ASSETS,
  ASSIGNMENTS as INITIAL_ASSIGNMENTS,
  Asset,
  AssetStatus,
  Assignment,
} from '@/lib/mockData';

interface AppDataContextValue {
  assets: Asset[];
  assignments: Assignment[];

  // Asset actions
  addAsset: (asset: Omit<Asset, 'id'>) => Asset;
  updateAsset: (asset: Asset) => void;
  deleteAsset: (id: string) => void;
  deleteAssets: (ids: Set<string>) => void;
  changeAssetStatus: (id: string, status: AssetStatus) => void;

  // Assignment actions
  addAssignment: (assignment: Omit<Assignment, 'id'>) => void;
  returnAssignment: (id: string, returnedDate: string) => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
  const [assignments, setAssignments] = useState<Assignment[]>(INITIAL_ASSIGNMENTS);

  /* ── Asset actions ─────────────────────────────────────────── */

  const addAsset = useCallback((data: Omit<Asset, 'id'>): Asset => {
    const newAsset: Asset = { ...data, id: `asset-${Date.now()}` };
    setAssets((prev) => [newAsset, ...prev]);
    return newAsset;
  }, []);

  const updateAsset = useCallback((updated: Asset) => {
    setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  }, []);

  const deleteAsset = useCallback((id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
    // Also close any active assignments for this asset
    setAssignments((prev) =>
      prev.map((asgn) =>
        asgn.assetId === id && asgn.status !== 'Returned'
          ? { ...asgn, status: 'Returned' as const, returnedDate: new Date().toISOString().split('T')[0] }
          : asgn
      )
    );
  }, []);

  const deleteAssets = useCallback((ids: Set<string>) => {
    setAssets((prev) => prev.filter((a) => !ids.has(a.id)));
    setAssignments((prev) =>
      prev.map((asgn) =>
        ids.has(asgn.assetId) && asgn.status !== 'Returned'
          ? { ...asgn, status: 'Returned' as const, returnedDate: new Date().toISOString().split('T')[0] }
          : asgn
      )
    );
  }, []);

  const changeAssetStatus = useCallback((id: string, status: AssetStatus) => {
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  }, []);

  /* ── Assignment actions ────────────────────────────────────── */

  const addAssignment = useCallback((data: Omit<Assignment, 'id'>) => {
    const newAsgn: Assignment = { ...data, id: `asgn-${Date.now()}` };
    setAssignments((prev) => [newAsgn, ...prev]);

    // Sync the matching asset → Assigned
    setAssets((prev) =>
      prev.map((a) =>
        a.assetTag === data.assetTag
          ? {
              ...a,
              status: 'Assigned' as AssetStatus,
              assignedTo: data.staffName,
              assignedToId: data.staffId,
              department: data.department,
            }
          : a
      )
    );
  }, []);

  const returnAssignment = useCallback((id: string, returnedDate: string) => {
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

    // Sync the matching asset → Available and clear assignee fields
    if (assetTag) {
      setAssets((prev) =>
        prev.map((a) =>
          a.assetTag === assetTag
            ? {
                ...a,
                status: 'Available' as AssetStatus,
                assignedTo: undefined,
                assignedToId: undefined,
                department: undefined,
              }
            : a
        )
      );
    }
  }, []);

  return (
    <AppDataContext.Provider
      value={{
        assets,
        assignments,
        addAsset,
        updateAsset,
        deleteAsset,
        deleteAssets,
        changeAssetStatus,
        addAssignment,
        returnAssignment,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside <AppDataProvider>');
  return ctx;
}