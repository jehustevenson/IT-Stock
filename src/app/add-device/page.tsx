'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import AppLayout from '@/components/AppLayout';
import { Asset, AssetCategory, AssetStatus } from '@/lib/mockData';
import { ArrowLeft, Plus, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Toaster } from 'sonner';

type FormData = Omit<Asset, 'id'>;

const CATEGORIES: AssetCategory[] = [
  'Laptop', 'Desktop', 'Monitor', 'Printer', 'Networking', 'Accessory', 'Server', 'Phone',
];
const STATUSES: AssetStatus[] = ['Available', 'Assigned', 'Faulty', 'Retired'];

export default function AddDevicePage() {
  const [submitted, setSubmitted] = useState(false);
  const [addedTag, setAddedTag]   = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      status:   'Available',
      category: 'Laptop',
    },
  });

  const onFormSubmit = async (data: FormData) => {
    const res = await fetch('/api/assets', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? 'Failed to add asset. Please try again.');
      return;
    }

    const row = await res.json();
    setAddedTag(row.asset_tag);
    setSubmitted(true);
  };

  function handleAddAnother() {
    reset({ status: 'Available', category: 'Laptop' });
    setSubmitted(false);
    setAddedTag('');
  }

  return (
    <AppLayout>
      <Toaster position="bottom-right" richColors />
      <div className="px-6 lg:px-8 xl:px-10 py-6 max-w-3xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <Link href="/inventory-management">
            <span className="icon-btn" title="Back to Inventory">
              <ArrowLeft size={18} />
            </span>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Add New Device</h1>
            <p className="text-sm text-slate-500 mt-0.5">Register a new IT asset to the inventory</p>
          </div>
        </div>

        {/* Success State */}
        {submitted ? (
          <div className="card p-8 flex flex-col items-center text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 size={28} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Device Added Successfully</h2>
              <p className="text-sm text-slate-500 mt-1">
                Asset{' '}
                <span className="font-mono font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                  {addedTag}
                </span>{' '}
                has been registered to the inventory.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button onClick={handleAddAnother} className="btn-primary gap-1.5">
                <Plus size={15} />
                Add Another Device
              </button>
              <Link href="/inventory-management">
                <span className="btn-secondary">View Inventory</span>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onFormSubmit)} className="card p-6 space-y-6">
            {/* Asset Identification */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Asset Identification
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">
                    Asset Tag / Unique ID <span className="text-red-500">*</span>
                  </label>
                  <p className="form-helper -mt-0.5 mb-1">Format: IT-[TYPE]-[NUMBER] e.g. IT-LT-0045</p>
                  <input
                    {...register('assetTag', {
                      required: 'Asset tag is required',
                      pattern: { value: /^IT-[A-Z]{2}-\d{4}$/, message: 'Format must be IT-XX-0000' },
                    })}
                    placeholder="IT-LT-0045"
                    className="form-input font-mono"
                  />
                  {errors.assetTag && <p className="form-error">{errors.assetTag.message}</p>}
                </div>
                <div>
                  <label className="form-label">
                    Serial Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('serialNumber', { required: 'Serial number is required' })}
                    placeholder="e.g. DLAT5540-2024-0045"
                    className="form-input font-mono"
                  />
                  {errors.serialNumber && <p className="form-error">{errors.serialNumber.message}</p>}
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Device Details */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Device Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="form-label">
                    Item Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('name', {
                      required: 'Item name is required',
                      minLength: { value: 3, message: 'Name must be at least 3 characters' },
                    })}
                    placeholder="e.g. Dell Latitude 5540"
                    className="form-input"
                  />
                  {errors.name && <p className="form-error">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="form-label">Category <span className="text-red-500">*</span></label>
                  <select {...register('category', { required: true })} className="form-input">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Status <span className="text-red-500">*</span></label>
                  <select {...register('status', { required: true })} className="form-input">
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">
                    Purchase Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    {...register('purchaseDate', { required: 'Purchase date is required' })}
                    className="form-input"
                  />
                  {errors.purchaseDate && <p className="form-error">{errors.purchaseDate.message}</p>}
                </div>
                <div>
                  <label className="form-label">
                    Location <span className="text-red-500">*</span>
                  </label>
                  <p className="form-helper -mt-0.5 mb-1">Building, floor, or room</p>
                  <input
                    {...register('location', { required: 'Location is required' })}
                    placeholder="e.g. Floor 3 — Engineering"
                    className="form-input"
                  />
                  {errors.location && <p className="form-error">{errors.location.message}</p>}
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Assignment (optional) */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Assignment (Optional)
              </h3>
              <p className="text-xs text-slate-400 mb-3">
                Fill these fields if the asset is currently assigned to a staff member.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Staff Name</label>
                  <input {...register('assignedTo')} placeholder="e.g. Marcus Osei" className="form-input" />
                </div>
                <div>
                  <label className="form-label">Staff ID</label>
                  <input {...register('assignedToId')} placeholder="e.g. EMP-1042" className="form-input font-mono" />
                </div>
                <div>
                  <label className="form-label">Department</label>
                  <input {...register('department')} placeholder="e.g. Engineering" className="form-input" />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Notes */}
            <div>
              <label className="form-label">Notes</label>
              <p className="form-helper -mt-0.5 mb-1">
                Any relevant notes — repair status, condition, special instructions
              </p>
              <textarea
                {...register('notes')}
                rows={3}
                placeholder="e.g. Battery replaced in Jan 2026. Minor cosmetic scratches on lid."
                className="form-input resize-none"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <Link href="/inventory-management">
                <span className="btn-secondary">Cancel</span>
              </Link>
              <button type="submit" disabled={isSubmitting} className="btn-primary gap-2">
                {isSubmitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Plus size={15} />
                    Add Device
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
}