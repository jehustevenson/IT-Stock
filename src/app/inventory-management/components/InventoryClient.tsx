'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Toaster } from 'sonner';
import { Plus, Search, Filter, Download, RefreshCw, School } from 'lucide-react';
import type { Asset, AssetStatus, AssetCategory, SchoolSection } from '@/lib/mockData';
import { SCHOOLS } from '@/lib/mockData';
import AssetTable from './AssetTable';
import AssetFormModal from './AssetFormModal';
import QRCodeModal from './QRCodeModal';
import ConfirmModal from '@/components/ui/ConfirmModal';

const CATEGORIES: AssetCategory[] = [
  'Laptop', 'Desktop', 'Monitor', 'Printer', 'Networking', 'Accessory', 'Server', 'Phone',
];
const STATUSES: AssetStatus[] = ['Available', 'Assigned', 'Faulty', 'Retired'];

const SCHOOL_COLORS: Record<SchoolSection, { active: string; dot: string }> = {
  'Infant School':    { active: 'bg-pink-600 text-white border-pink-600',    dot: 'bg-pink-500'   },
  'Junior School':    { active: 'bg-violet-600 text-white border-violet-600', dot: 'bg-violet-500' },
  'Secondary School': { active: 'bg-teal-600 text-white border-teal-600',    dot: 'bg-teal-500'   },
};

function dbRowToAsset(row: Record<string, unknown>): Asset {
  return {
    id:            row.id as string,
    assetTag:      row.asset_tag as string,
    name:          row.name as string,
    category:      row.category as AssetCategory,
    serialNumber:  row.serial_number as string,
    purchaseDate:  row.purchase_date as string,
    status:        row.status as AssetStatus,
    location:      row.location as string,
    school:        (row.school as SchoolSection) ?? undefined,
    assignedTo:    (row.assigned_to as string)    ?? undefined,
    assignedToId:  (row.assigned_to_id as string) ?? undefined,
    department:    (row.department as string)      ?? undefined,
    notes:         (row.notes as string)           ?? undefined,
  };
}

export default function InventoryClient() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSchool, setFilterSchool] = useState<SchoolSection | 'All'>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [sortKey, setSortKey] = useState<keyof Asset>('assetTag');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [qrAsset, setQrAsset] = useState<Asset | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/assets');
      if (!res.ok) throw new Error('Failed to load assets');
      const rows = await res.json();
      setAssets(rows.map(dbRowToAsset));
    } catch {
      toast.error('Could not load assets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const filtered = useMemo(() => {
    let result = assets;
    if (filterSchool !== 'All') result = result.filter((a) => a.school === filterSchool);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.assetTag.toLowerCase().includes(q) ||
          a.serialNumber.toLowerCase().includes(q) ||
          a.location.toLowerCase().includes(q) ||
          (a.assignedTo?.toLowerCase().includes(q) ?? false)
      );
    }
    if (filterCategory !== 'All') result = result.filter((a) => a.category === filterCategory);
    if (filterStatus !== 'All')   result = result.filter((a) => a.status === filterStatus);

    result = [...result].sort((a, b) => {
      const av = (a[sortKey] ?? '') as string;
      const bv = (b[sortKey] ?? '') as string;
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });

    return result;
  }, [assets, search, filterSchool, filterCategory, filterStatus, sortKey, sortDir]);

  function handleSort(key: keyof Asset) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }

  async function handleAdd(data: Omit<Asset, 'id'>) {
    const res = await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) { toast.error('Failed to add asset'); return; }
    const row = await res.json();
    setAssets((prev) => [dbRowToAsset(row), ...prev]);
    setAddModalOpen(false);
    toast.success(`Asset ${row.asset_tag} added to inventory`);
  }

  async function handleEdit(data: Asset) {
    const res = await fetch(`/api/assets/${data.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) { toast.error('Failed to update asset'); return; }
    const row = await res.json();
    setAssets((prev) => prev.map((a) => (a.id === data.id ? dbRowToAsset(row) : a)));
    setEditAsset(null);
    toast.success(`Asset ${row.asset_tag} updated successfully`);
  }

  async function handleDeleteConfirm() {
    if (!deleteId) return;
    setDeleteLoading(true);
    const asset = assets.find((a) => a.id === deleteId);
    const res = await fetch(`/api/assets/${deleteId}`, { method: 'DELETE' });
    setDeleteLoading(false);
    if (!res.ok) { toast.error('Failed to delete asset'); return; }
    setAssets((prev) => prev.filter((a) => a.id !== deleteId));
    setDeleteId(null);
    toast.success(`Asset ${asset?.assetTag} removed from inventory`);
  }

  async function handleBulkDelete() {
    setDeleteLoading(true);
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map((id) => fetch(`/api/assets/${id}`, { method: 'DELETE' })));
    setAssets((prev) => prev.filter((a) => !selectedIds.has(a.id)));
    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
    setDeleteLoading(false);
    toast.success(`${ids.length} assets removed from inventory`);
  }

  async function handleStatusChange(id: string, status: AssetStatus) {
    const res = await fetch(`/api/assets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) { toast.error('Failed to update status'); return; }
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    toast.success('Asset status updated');
  }

  async function handleExportCSV() {
    const headers = ['Asset Tag', 'Name', 'Category', 'School', 'Serial Number', 'Status', 'Location', 'Purchase Date', 'Assigned To', 'Department'];
    const rows = filtered.map((a) => [
      a.assetTag, a.name, a.category, a.school ?? '', a.serialNumber, a.status,
      a.location, a.purchaseDate, a.assignedTo ?? '', a.department ?? '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'assets.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  // Stats per school for the chips
  const schoolStats = useMemo(() => {
    const counts: Record<string, number> = { All: assets.length };
    for (const a of assets) {
      if (a.school) counts[a.school] = (counts[a.school] ?? 0) + 1;
    }
    return counts;
  }, [assets]);

  // Category stats scoped to selected school
  const categoryStats = useMemo(() => {
    const scoped = filterSchool === 'All' ? assets : assets.filter((a) => a.school === filterSchool);
    const counts: Record<string, number> = { All: scoped.length };
    for (const a of scoped) counts[a.category] = (counts[a.category] ?? 0) + 1;
    return counts;
  }, [assets, filterSchool]);

  return (
    <>
      <Toaster position="bottom-right" richColors />
      <div className="px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl mx-auto space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Inventory Management</h1>
            <p className="text-sm text-slate-500 mt-1">
              {assets.length} assets tracked across all schools
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchAssets} className="btn-secondary text-xs gap-1.5" disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button onClick={handleExportCSV} className="btn-secondary text-xs gap-1.5">
              <Download size={14} />
              Export CSV
            </button>
            <button onClick={() => setAddModalOpen(true)} className="btn-primary text-xs gap-1.5">
              <Plus size={14} />
              Add Asset
            </button>
          </div>
        </div>

        {/* School filter chips */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <School size={13} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">School Section</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setFilterSchool('All'); setFilterCategory('All'); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
                filterSchool === 'All'
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              All Schools
              <span className={filterSchool === 'All' ? 'text-slate-300' : 'text-slate-400'}>
                {schoolStats['All'] ?? 0}
              </span>
            </button>
            {SCHOOLS.map((school) => {
              const colors = SCHOOL_COLORS[school];
              const isActive = filterSchool === school;
              return (
                <button
                  key={school}
                  onClick={() => { setFilterSchool(school); setFilterCategory('All'); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
                    isActive
                      ? colors.active
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white/70' : colors.dot}`} />
                  {school}
                  <span className={isActive ? 'opacity-70' : 'text-slate-400'}>
                    {schoolStats[school] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Category chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {(['All', ...CATEGORIES] as const).map((cat) => (
            <button
              key={`chip-${cat}`}
              onClick={() => setFilterCategory(cat)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
                filterCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {cat}
              <span className={filterCategory === cat ? 'text-blue-100' : 'text-slate-400'}>
                {categoryStats[cat] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {/* Search + status filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, tag, serial, location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pl-9 text-xs h-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <span className="text-xs text-slate-500">Status:</span>
            <div className="flex items-center gap-1">
              {(['All', ...STATUSES] as const).map((s) => (
                <button
                  key={`status-chip-${s}`}
                  onClick={() => setFilterStatus(s)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
                    filterStatus === s ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                <span className="text-xs font-medium text-red-700">{selectedIds.size} selected</span>
                <button onClick={() => setBulkDeleteOpen(true)} className="text-xs font-semibold text-red-600 hover:text-red-800">
                  Delete Selected
                </button>
                <button onClick={() => setSelectedIds(new Set())} className="text-xs text-slate-400 hover:text-slate-600">
                  Clear
                </button>
              </div>
            )}
            <span className="text-xs text-slate-400">
              {filtered.length} of {assets.length} assets
            </span>
          </div>
        </div>

        {loading ? (
          <div className="card flex items-center justify-center py-16">
            <RefreshCw size={20} className="animate-spin text-slate-400" />
          </div>
        ) : (
          <AssetTable
            assets={filtered}
            selectedIds={selectedIds}
            onSelectChange={setSelectedIds}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            onEdit={setEditAsset}
            onDelete={setDeleteId}
            onQR={setQrAsset}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>

      <AssetFormModal open={addModalOpen} onClose={() => setAddModalOpen(false)} onSubmit={handleAdd} mode="add" />
      {editAsset && (
        <AssetFormModal
          open={!!editAsset}
          onClose={() => setEditAsset(null)}
          onSubmit={(data) => handleEdit({ ...data, id: editAsset.id })}
          mode="edit"
          defaultValues={editAsset}
        />
      )}
      {qrAsset && <QRCodeModal open={!!qrAsset} onClose={() => setQrAsset(null)} asset={qrAsset} />}
      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Asset"
        message="Are you sure you want to remove this asset from inventory? This action cannot be undone and will also remove all associated assignment records."
        confirmLabel="Delete Asset"
        loading={deleteLoading}
      />
      <ConfirmModal
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        title={`Delete ${selectedIds.size} Assets`}
        message={`You are about to permanently delete ${selectedIds.size} selected assets. This cannot be undone.`}
        confirmLabel={`Delete ${selectedIds.size} Assets`}
        loading={deleteLoading}
      />
    </>
  );
}