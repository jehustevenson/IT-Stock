'use client';

import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Toaster } from 'sonner';
import { Plus, Search, Filter, AlertTriangle, UserCheck, RotateCcw, Clock } from 'lucide-react';
import { Assignment } from '@/lib/mockData';
import { useAppData } from '@/lib/AppDataContext';
import AssignmentTable from './AssignmentTable';
import AssignmentFormModal from './AssignmentFormModal';
import ReturnModal from './ReturnModal';

const DEPARTMENTS = ['All', 'Engineering', 'Design', 'Finance', 'Administration', 'IT Infrastructure', 'Sales'];
const STATUSES = ['All', 'Active', 'Overdue', 'Returned'];

export default function AssignmentClient() {
  const { assignments, assets, loading, addAssignment, returnAssignment } = useAppData();

  const [search, setSearch]           = useState('');
  const [filterDept, setFilterDept]   = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [returnTarget, setReturnTarget]       = useState<Assignment | null>(null);

  const filtered = useMemo(() => {
    let result = assignments;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.staffName.toLowerCase().includes(q) ||
          a.staffId.toLowerCase().includes(q) ||
          a.assetTag.toLowerCase().includes(q) ||
          a.assetName.toLowerCase().includes(q) ||
          a.department.toLowerCase().includes(q)
      );
    }
    if (filterDept !== 'All')   result = result.filter((a) => a.department === filterDept);
    if (filterStatus !== 'All') result = result.filter((a) => a.status === filterStatus);
    return result;
  }, [assignments, search, filterDept, filterStatus]);

  const stats = useMemo(() => ({
    total:    assignments.length,
    active:   assignments.filter((a) => a.status === 'Active').length,
    overdue:  assignments.filter((a) => a.status === 'Overdue').length,
    returned: assignments.filter((a) => a.status === 'Returned').length,
  }), [assignments]);

  const availableAssets = useMemo(
    () => assets.filter((a) => a.status === 'Available'),
    [assets]
  );

  async function handleNewAssignment(data: Omit<Assignment, 'id'>) {
    try {
      await addAssignment(data);
      setAssignModalOpen(false);
      toast.success(`${data.assetTag} assigned to ${data.staffName}`);
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to create assignment');
    }
  }

  function handleReturn(id: string, returnedDate: string) {
    returnAssignment(id, returnedDate);
    setReturnTarget(null);
    toast.success('Asset checked in — inventory updated to Available');
  }

  return (
    <>
      <Toaster position="bottom-right" richColors />
      <div className="px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Assignment Tracking</h1>
            <p className="text-sm text-slate-500 mt-1">
              {loading ? 'Loading…' : 'Manage equipment assignments and track returns'}
            </p>
          </div>
          <button onClick={() => setAssignModalOpen(true)} className="btn-primary text-xs gap-1.5">
            <Plus size={14} />
            New Assignment
          </button>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <UserCheck size={15} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900 tabular-nums">{stats.total}</p>
              <p className="text-xs text-slate-500">Total</p>
            </div>
          </div>
          <div className="card px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <UserCheck size={15} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900 tabular-nums">{stats.active}</p>
              <p className="text-xs text-slate-500">Active</p>
            </div>
          </div>
          <div className="card px-4 py-3 flex items-center gap-3 border-amber-100 bg-amber-50/30">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={15} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-amber-700 tabular-nums">{stats.overdue}</p>
              <p className="text-xs text-amber-600">Overdue</p>
            </div>
          </div>
          <div className="card px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
              <RotateCcw size={15} className="text-slate-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900 tabular-nums">{stats.returned}</p>
              <p className="text-xs text-slate-500">Returned</p>
            </div>
          </div>
        </div>

        {/* Overdue Banner */}
        {stats.overdue > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
            <Clock size={15} className="text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">{stats.overdue} assignment{stats.overdue > 1 ? 's are' : ' is'} overdue.</span>{' '}
              Contact the assigned staff members to arrange equipment return.
            </p>
          </div>
        )}

        {/* Available hint */}
        {availableAssets.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <UserCheck size={15} className="text-emerald-600 flex-shrink-0" />
            <p className="text-sm text-emerald-800">
              <span className="font-semibold">{availableAssets.length} asset{availableAssets.length > 1 ? 's are' : ' is'} available</span>{' '}
              and ready to be assigned.{' '}
              <button
                onClick={() => setAssignModalOpen(true)}
                className="underline font-semibold hover:text-emerald-900 transition-colors"
              >
                Create assignment →
              </button>
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by staff, asset, department…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pl-9 text-xs h-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <span className="text-xs text-slate-500">Dept:</span>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {DEPARTMENTS.map((d) => (
                <option key={`dept-${d}`} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            {STATUSES.map((s) => (
              <button
                key={`asgn-status-${s}`}
                onClick={() => setFilterStatus(s)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
                  filterStatus === s ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs text-slate-400 tabular-nums">
            {filtered.length} of {assignments.length} assignments
          </span>
        </div>

        {/* Loading skeleton */}
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
          <AssignmentTable assignments={filtered} onReturn={setReturnTarget} />
        )}
      </div>

      {/* Modals */}
      <AssignmentFormModal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        onSubmit={handleNewAssignment}
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
    </>
  );
}