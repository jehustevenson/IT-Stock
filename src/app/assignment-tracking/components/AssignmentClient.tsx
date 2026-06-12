'use client';

import React, { useState, useMemo } from 'react';
import { toast, Toaster } from 'sonner';
import { Plus, Search, Filter } from 'lucide-react';
import { Assignment, AssignmentStatus } from '@/lib/supabase/types';
import { useAppData } from '@/lib/AppDataContext';
import AssignmentTable from './AssignmentTable';
import AssignmentFormModal from './AssignmentFormModal';
import ReturnModal from './ReturnModal';
import EditReturnDateModal from './EditReturnDateModal';

const STATUSES: AssignmentStatus[] = ['Active', 'Returned', 'Overdue'];

export default function AssignmentClient() {
  const { assets, assignments, loading, error, addAssignment, returnAssignment, updateAssignmentReturn } = useAppData();

  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [returnTarget, setReturnTarget] = useState<Assignment | null>(null);
  const [editTarget,   setEditTarget]   = useState<Assignment | null>(null);

  // Only Available assets can be assigned
  const availableAssets = useMemo(
    () => assets.filter((a) => a.status === 'Available'),
    [assets]
  );

  const filtered = useMemo(() => {
    let result = assignments;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.assetTag.toLowerCase().includes(q) ||
          a.assetName.toLowerCase().includes(q) ||
          a.staffName.toLowerCase().includes(q) ||
          a.staffId.toLowerCase().includes(q) ||
          a.department.toLowerCase().includes(q)
      );
    }

    if (filterStatus !== 'All') {
      result = result.filter((a) => a.status === filterStatus);
    }

    // Sort: Overdue first, then Active, then Returned; within each group newest first
    const statusOrder: Record<string, number> = { Overdue: 0, Active: 1, Returned: 2 };
    return [...result].sort((a, b) => {
      const sd = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
      if (sd !== 0) return sd;
      return b.dateAssigned.localeCompare(a.dateAssigned);
    });
  }, [assignments, search, filterStatus]);

  // Stats for summary chips
  const activeCount  = assignments.filter((a) => a.status === 'Active').length;
  const overdueCount = assignments.filter((a) => a.status === 'Overdue').length;
  const returnedCount = assignments.filter((a) => a.status === 'Returned').length;

  async function handleAddAssignment(data: Omit<Assignment, 'id'>) {
    try {
      await addAssignment(data);
      setAddModalOpen(false);
      toast.success(`Asset ${data.assetTag} assigned to ${data.staffName}`);
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to create assignment');
    }
  }

  async function handleReturn(id: string, returnedDate: string, condition?: string, notes?: string) {
    try {
      await returnAssignment(id, returnedDate, condition, notes);
      setReturnTarget(null);
      toast.success('Asset checked in successfully');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to process return');
    }
  }

  async function handleEditReturnDate(id: string, expectedReturn: string) {
    try {
      await updateAssignmentReturn(id, expectedReturn);
      setEditTarget(null);
      toast.success('Expected return date updated');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to update return date');
    }
  }

  if (error) {
    return (
      <div className="px-6 lg:px-8 py-6 max-w-screen-2xl mx-auto">
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <p className="text-sm font-medium text-red-600 mb-1">Failed to load assignments</p>
          <p className="text-xs text-slate-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-secondary mt-4 text-xs"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="bottom-right" richColors />
      <div className="px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl mx-auto space-y-5">

        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Assignment Tracking</h1>
            <p className="text-sm text-slate-500 mt-1">
              {loading
                ? 'Loading…'
                : `${assignments.length} total assignments — ${activeCount} active, ${overdueCount} overdue`}
            </p>
          </div>
          <button onClick={() => setAddModalOpen(true)} className="btn-primary text-xs gap-1.5">
            <Plus size={14} />
            New Assignment
          </button>
        </div>

        {/* Overdue alert banner */}
        {overdueCount > 0 && (
          <div
            className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer"
            onClick={() => setFilterStatus('Overdue')}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 animate-pulse" />
            <p className="text-sm text-amber-800 flex-1">
              <span className="font-semibold">{overdueCount} overdue assignment{overdueCount > 1 ? 's' : ''}</span>
              {' '}— click to filter
            </p>
          </div>
        )}

        {/* Status summary chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {(['All', ...STATUSES] as const).map((s) => {
            const count =
              s === 'All'      ? assignments.length :
              s === 'Active'   ? activeCount :
              s === 'Overdue'  ? overdueCount :
              returnedCount;
            return (
              <button
                key={`status-chip-${s}`}
                onClick={() => setFilterStatus(s)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
                  filterStatus === s
                    ? s === 'Overdue'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {s}
                <span className={`tabular-nums ${filterStatus === s ? 'opacity-80' : 'text-slate-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by asset, staff name, ID, department…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pl-9 text-xs h-9"
            />
          </div>
          <span className="text-xs text-slate-400 ml-auto">
            {filtered.length} of {assignments.length} shown
          </span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="card p-12 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <svg className="animate-spin w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-slate-500">Loading assignments…</p>
            </div>
          </div>
        ) : (
          <AssignmentTable
            assignments={filtered}
            onReturn={(assignment) => setReturnTarget(assignment)}
            onEditReturnDate={(assignment) => setEditTarget(assignment)}
          />
        )}
      </div>

      {/* Modals */}
      <AssignmentFormModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSubmit={handleAddAssignment}
        availableAssets={availableAssets}
      />

      {returnTarget && (
        <ReturnModal
          open={!!returnTarget}
          onClose={() => setReturnTarget(null)}
          assignment={returnTarget}
          onConfirm={handleReturn}
        />
      )}

      {editTarget && (
        <EditReturnDateModal
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          assignment={editTarget}
          onConfirm={handleEditReturnDate}
        />
      )}
    </>
  );
}