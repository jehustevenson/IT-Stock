'use client';

import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Toaster } from 'sonner';
import { Plus, Search, Filter, Download } from 'lucide-react';
import { Asset, AssetStatus, AssetCategory, SchoolSection, SCHOOLS } from '@/lib/mockData';
import { useAppData } from '@/lib/AppDataContext';
import AssetTable from './AssetTable';
import AssetFormModal from './AssetFormModal';
import QRCodeModal from './QRCodeModal';
import ConfirmModal from '@/components/ui/ConfirmModal';

const CATEGORIES: AssetCategory[] = [
  'Laptop', 'Desktop', 'Monitor', 'Printer', 'Networking', 'Accessory', 'Server', 'Phone',
];
const STATUSES: AssetStatus[] = ['Available', 'Assigned', 'Faulty', 'Retired'];

export default function InventoryClient() {
  const { assets, addAsset, updateAsset, deleteAsset, deleteAssets, changeAssetStatus } = useAppData();

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterSchool, setFilterSchool] = useState<string>('All');
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

  const filtered = useMemo(() => {
    let result = assets;
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
    if (filterSchool !== 'All') result = result.filter((a) => a.school === filterSchool);
    if (filterStatus !== 'All') result = result.filter((a) => a.status === filterStatus);

    result = [...result].sort((a, b) => {
      const av = (a[sortKey] ?? '') as string;
      const bv = (b[sortKey] ?? '') as string;
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });

    return result;
  }, [assets, search, filterCategory, filterSchool, filterStatus, sortKey, sortDir]);

  function handleSort(key: keyof Asset) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }

  function handleAdd(data: Omit<Asset, 'id'>) {
    const newAsset = addAsset(data);
    setAddModalOpen(false);
    toast.success(`Asset ${newAsset.assetTag} added to inventory`);
  }

  function handleEdit(data: Asset) {
    updateAsset(data);
    setEditAsset(null);
    toast.success(`Asset ${data.assetTag} updated successfully`);
  }

  function handleDeleteConfirm() {
    if (!deleteId) return;
    setDeleteLoading(true);
    const asset = assets.find((a) => a.id === deleteId);
    setTimeout(() => {
      deleteAsset(deleteId);
      setDeleteId(null);
      setDeleteLoading(false);
      toast.success(`Asset ${asset?.assetTag} removed from inventory`);
    }, 600);
  }

  function handleBulkDelete() {
    setDeleteLoading(true);
    const count = selectedIds.size;
    setTimeout(() => {
      deleteAssets(selectedIds);
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      setDeleteLoading(false);
      toast.success(`${count} assets removed from inventory`);
    }, 700);
  }

  function handleStatusChange(id: string, status: AssetStatus) {
    changeAssetStatus(id, status);
    toast.success('Asset status updated');
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

  return (
    <>
      <Toaster position="bottom-right" richColors />
      <div className="px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl mx-auto space-y-5">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Inventory Management</h1>
            <p className="text-sm text-slate-500 mt-1">
              {assets.length} assets tracked across all categories
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary text-xs gap-1.5">
              <Download size={14} />
              Export CSV
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

        {/* Search + Status Filter Bar */}
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

        {/* Table */}
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
      </div>

      {/* Modals */}
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