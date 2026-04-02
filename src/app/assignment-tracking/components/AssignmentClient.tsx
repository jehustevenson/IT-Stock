'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Toaster } from 'sonner';
import { Plus, Search, Filter, AlertTriangle, UserCheck, RotateCcw, Clock, RefreshCw } from 'lucide-react';
import type { Assignment } from '@/lib/mockData';
import AssignmentTable from './AssignmentTable';
import AssignmentFormModal from './AssignmentFormModal';
import ReturnModal from './ReturnModal';

const DEPARTMENTS = ['All','Engineering','Design','Finance','Administration','IT Infrastructure','Sales'];
const STATUSES = ['All','Active','Overdue','Returned'];

function dbRowToAssignment(row: Record<string, unknown>): Assignment {
  return {
    id:             row.id as string,
    assetId:        row.asset_id as string,
    assetTag:       row.asset_tag as string,
    assetName:      row.asset_name as string,
    category:       row.category as Assignment['category'],
    staffName:      row.staff_name as string,
    staffId:        row.staff_id as string,
    department:     row.department as string,
    dateAssigned:   row.date_assigned as string,
    expectedReturn: row.expected_return as string,
    status:         row.status as Assignment['status'],
    returnedDate:   (row.returned_date as string) ?? undefined,
    notes:          (row.notes as string) ?? undefined,
  };
}

export default function AssignmentClient() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [returnAssignment, setReturnAssignment] = useState<Assignment | null>(null);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/assignments');
      if (!res.ok) throw new Error();
      const rows = await res.json();
      setAssignments(rows.map(dbRowToAssignment));
    } catch {
      toast.error('Could not load assignments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

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

  async function handleNewAssignment(data: Omit<Assignment, 'id'>) {
    const res = await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) { toast.error('Failed to create assignment'); return; }
    const row = await res.json();
    setAssignments((prev) => [dbRowToAssignment(row), ...prev]);
    setAssignModalOpen(false);
    toast.success(`${data.assetTag} assigned to ${data.staffName}`);
  }

  async function handleReturn(id: string, returnedDate: string) {
    const res = await fetch(`/api/assignments/${id}/return`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnedDate }),
    });
    if (!res.ok) { toast.error('Failed to process return'); return; }
    setAssignments((prev) =>
      prev.map((a) => a.id === id ? { ...a, status: 'Returned' as const, returnedDate } : a)
    );
    setReturnAssignment(null);
    toast.success('Asset checked in successfully');
  }

  return (
    <>
      <Toaster position="bottom-right" richColors />
      <div className="px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl mx-auto space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Assignment Tracking</h1>
            <p className="text-sm text-slate-500 mt-1">Manage equipment assignments and track returns</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchAssignments} className="btn-secondary text-xs gap-1.5" disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button onClick={() => setAssignModalOpen(true)} className="btn-primary text-xs gap-1.5">
              <Plus size={14} />
              New Assignment
            </button>
          </div>
        </div>

        {/* Stats strip */}
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

        {stats.overdue > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
            <Clock size={15} className="text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">{stats.overdue} assignment{stats.overdue > 1 ? 's are' : ' is'} overdue.</span>{' '}
              Contact the assigned staff members to arrange equipment return.
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
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1">
            {STATUSES.map((s) => (
              <button
                key={s}
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

        {loading ? (
          <div className="card flex items-center justify-center py-16">
            <RefreshCw size={20} className="animate-spin text-slate-400" />
          </div>
        ) : (
          <AssignmentTable assignments={filtered} onReturn={setReturnAssignment} />
        )}
      </div>

      <AssignmentFormModal open={assignModalOpen} onClose={() => setAssignModalOpen(false)} onSubmit={handleNewAssignment} />
      {returnAssignment && (
        <ReturnModal
          open={!!returnAssignment}
          onClose={() => setReturnAssignment(null)}
          assignment={returnAssignment}
          onConfirm={handleReturn}
        />
      )}
    </>
  );
}