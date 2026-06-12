'use client';

import React, { useState, useMemo } from 'react';
import { toast, Toaster } from 'sonner';
import { Plus, Search, Filter, Download, Upload, AlertTriangle } from 'lucide-react';
import { Asset, AssetStatus, AssetCategory, SCHOOLS } from '@/lib/supabase/types';
import { CATEGORIES, exportAssetsCSV } from '@/lib/assetUtils';
import { useAppData } from '@/lib/AppDataContext';
import AssetTable from './AssetTable';
import AssetFormModal from './AssetFormModal';
import QRCodeModal from './QRCodeModal';
import BulkImportModal from './BulkImportModal';
import ConfirmModal from '@/components/ui/ConfirmModal';

const STATUSES: AssetStatus[] = ['Available', 'Assigned', 'Faulty', 'Retired'];

export default function InventoryClient() {
  const {
    assets, loading, error, refetch,
    addAsset, updateAsset, deleteAsset, deleteAssets, changeAssetStatus,
  } = useAppData();

  const [search,           setSearch]           = useState('');
  const [filterCategory,   setFilterCategory]   = useState<string>('All');
  const [filterSchool,     setFilterSchool]     = useState<string>('All');
  const [filterStatus,     setFilterStatus]     = useState<string>('All');
  const [sortKey,          setSortKey]          = useState<keyof Asset>('assetTag');
  const [sortDir,          setSortDir]          = useState<'asc' | 'desc'>('asc');
  const [selectedIds,      setSelectedIds]      = useState<Set<string>>(new Set());
  const [addModalOpen,     setAddModalOpen]     = useState(false);
  const [importModalOpen,  setImportModalOpen]  = useState(false);
  const [editAsset,        setEditAsset]        = useState<Asset | null>(null);
  const [qrAsset,          setQrAsset]          = useState<Asset | null>(null);
  const [deleteId,         setDeleteId]         = useState<string | null>(null);
  const [bulkDeleteOpen,   setBulkDeleteOpen]   = useState(false);
  const [deleteLoading,    setDeleteLoading]    = useState(false);

  const filtered = useMemo(() => {
    let result = assets;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q)         ||
          a.assetTag.toLowerCase().includes(q)     ||
          a.serialNumber.toLowerCase().includes(q) ||
          a.location.toLowerCase().includes(q)     ||
          (a.assignedTo?.toLowerCase().includes(q) ?? false)
      );
    }
    if (filterCategory !== 'All') result = result.filter((a) => a.category === filterCategory);
    if (filterSchool   !== 'All') result = result.filter((a) => a.school   === filterSchool);
    if (filterStatus   !== 'All') result = result.filter((a) => a.status   === filterStatus);

    return [...result].sort((a, b) => {
      const av = (a[sortKey] ?? '') as string;
      const bv = (b[sortKey] ?? '') as string;
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [assets, search, filterCategory, filterSchool, filterStatus, sortKey, sortDir]);

  function handleSort(key: keyof Asset) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }

  function handleExportCSV() {
    // FIX: was a no-op button — now exports the current filtered view
    exportAssetsCSV(
      filtered,
      `assets-${filterSchool !== 'All' ? filterSchool.replace(/\s+/g, '-').toLowerCase() + '-' : ''}${new Date().toISOString().split('T')[0]}.csv`
    );
    toast.success(`Exported ${filtered.length} assets to CSV`);
  }

  async function handleAdd(data: Omit<Asset, 'id'>) {
    try {
      const newAsset = await addAsset(data);
      setAddModalOpen(false);
      toast.success(`Asset ${newAsset.assetTag} added to inventory`);
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to add asset');
    }
  }

  async function handleEdit(data: Asset) {
    try {
      await updateAsset(data);
      setEditAsset(null);
      toast.success(`Asset ${data.assetTag} updated successfully`);
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to update asset');
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteId) return;
    setDeleteLoading(true);
    const asset = assets.find((a) => a.id === deleteId);
    try {
      await deleteAsset(deleteId);
      setDeleteId(null);
      toast.success(`Asset ${asset?.assetTag} removed from inventory`);
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to delete asset');
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleBulkDelete() {
    setDeleteLoading(true);
    const count = selectedIds.size;
    try {
      await deleteAssets(selectedIds);
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      toast.success(`${count} assets removed from inventory`);
    } catch (err) {
      // FIX: partial failures now surface a meaningful message
      toast.error((err as Error).message ?? 'Failed to delete assets');
      // Refresh state so UI reflects what actually got deleted
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleStatusChange(id: string, status: AssetStatus) {
    try {
      await changeAssetStatus(id, status);
      toast.success('Asset status updated');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to update status');
    }
  }

  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = { All: assets.length };
    for (const a of assets) counts[a.category] = (counts[a.category] ?? 0) + 1;
    return counts;
  }, [assets]);

  const schoolStats = useMemo(() => {
    const counts: Record<string, number> = { All: assets.length };
    for (const a of assets) {
      if (a.school) counts[a.school] = (counts[a.school] ?? 0) + 1;
    }
    return counts;
  }, [assets]);

  // FIX: surface load errors rather than showing empty tables silently
  if (error) {
    return (
      <div className="px-6 lg:px-8 py-6 max-w-screen-2xl mx-auto">
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
            <AlertTriangle size={22} className="text-red-500" />
          </div>
          <p className="text-sm font-medium text-slate-800 mb-1">Failed to load inventory</p>
          <p className="text-xs text-slate-500 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-secondary text-xs">
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
            <h1 className="text-2xl font-semibold text-slate-900">Inventory Management</h1>
            <p className="text-sm text-slate-500 mt-1">
              {loading ? 'Loading…' : `${assets.length} assets tracked across all categories`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* FIX: Export CSV now actually exports */}
            <button
              onClick={handleExportCSV}
              disabled={loading || assets.length === 0}
              className="btn-secondary text-xs gap-1.5 disabled:opacity-50"
            >
              <Download size={14} />
              Export CSV
            </button>
            <button
              onClick={() => setImportModalOpen(true)}
              className="btn-secondary text-xs gap-1.5"
            >
              <Upload size={14} />
              Import CSV
            </button>
            <button onClick={() => setAddModalOpen(true)} className="btn-primary text-xs gap-1.5">
              <Plus size={14} />
              Add Asset
            </button>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">By Category</p>
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
                <span className={`tabular-nums ${filterCategory === cat ? 'text-blue-100' : 'text-slate-400'}`}>
                  {categoryStats[cat] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* School Filter Chips */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">By School</p>
          <div className="flex items-center gap-2 flex-wrap">
            {(['All', ...SCHOOLS] as const).map((school) => (
              <button
                key={`school-chip-${school}`}
                onClick={() => setFilterSchool(school)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
                  filterSchool === school
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {school}
                <span className={`tabular-nums ${filterSchool === school ? 'text-emerald-100' : 'text-slate-400'}`}>
                  {schoolStats[school] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Search + Status Filter */}
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
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg slide-up">
                <span className="text-xs font-medium text-red-700">{selectedIds.size} selected</span>
                <button
                  onClick={() => setBulkDeleteOpen(true)}
                  className="text-xs font-semibold text-red-600 hover:text-red-800 transition-colors"
                >
                  Delete Selected
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
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
          <div className="card p-12 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <svg className="animate-spin w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-slate-500">Loading inventory…</p>
            </div>
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

      {/* Modals */}
      <BulkImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImported={() => {
          // Reconcile client cache with what actually got persisted
          refetch();
          toast.success('Import complete');
        }}
      />
      <AssetFormModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSubmit={handleAdd}
        mode="add"
      />
      {editAsset && (
        <AssetFormModal
          open={!!editAsset}
          onClose={() => setEditAsset(null)}
          onSubmit={(data) => handleEdit({ ...data, id: editAsset.id })}
          mode="edit"
          defaultValues={editAsset}
        />
      )}
      {qrAsset && (
        <QRCodeModal
          open={!!qrAsset}
          onClose={() => setQrAsset(null)}
          asset={qrAsset}
        />
      )}
      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Asset"
        message="Are you sure you want to remove this asset from inventory? This action cannot be undone and will also close all associated assignment records."
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