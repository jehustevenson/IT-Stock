'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast, Toaster } from 'sonner';
import AppLayout from '@/components/AppLayout';
import { Asset, AssetCategory, AssetStatus, SchoolSection, SCHOOLS } from '@/lib/supabase/types';
import { useAppData } from '@/lib/AppDataContext';
import {
  CATEGORIES,
  SCHOOL_COLORS,
  generateTag,
} from '@/lib/assetUtils';
import { ArrowLeft, Plus, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import Link from 'next/link';

type FormData = Omit<Asset, 'id'>;

const STATUSES: AssetStatus[] = ['Available', 'Assigned', 'Faulty', 'Retired'];

export default function AddDevicePage() {
  const { addAsset } = useAppData();
  const [submitted, setSubmitted] = useState(false);
  const [addedTag,  setAddedTag]  = useState('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: { status: 'Available', category: 'Laptop' },
  });

  const watchedSchool   = useWatch({ control, name: 'school' });
  const watchedCategory = useWatch({ control, name: 'category' });
  const watchedStatus   = useWatch({ control, name: 'status' });
  const showAssignment  = watchedStatus === 'Assigned';

  const regenerateTag = useCallback(() => {
    if (watchedSchool && watchedCategory) {
      setValue(
        'assetTag',
        generateTag(watchedSchool as SchoolSection, watchedCategory as AssetCategory),
        { shouldValidate: true }
      );
    }
  }, [watchedSchool, watchedCategory, setValue]);

  useEffect(() => {
    if (watchedSchool && watchedCategory) {
      setValue(
        'assetTag',
        generateTag(watchedSchool as SchoolSection, watchedCategory as AssetCategory),
        { shouldValidate: true }
      );
    }
  }, [watchedSchool, watchedCategory, setValue]);

  const onFormSubmit = async (data: FormData) => {
    try {
      const newAsset = await addAsset(data);
      setAddedTag(newAsset.assetTag);
      setSubmitted(true);
    } catch (err) {
      // FIX: was silently console.error — now shows a visible toast
      toast.error((err as Error).message ?? 'Failed to add device. Please try again.');
    }
  };

  function handleAddAnother() {
    reset({ status: 'Available', category: 'Laptop' });
    setSubmitted(false);
    setAddedTag('');
  }

  return (
    <AppLayout>
      {/* FIX: Toaster was missing from this page */}
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
              <Link href="/assignment-tracking">
                <span className="btn-secondary">Go to Assignments</span>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onFormSubmit)} className="card p-6 space-y-6">

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
                      required:  'Item name is required',
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
                    {CATEGORIES.map((c) => (
                      <option key={`cat-${c}`} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Status <span className="text-red-500">*</span></label>
                  <select {...register('status', { required: true })} className="form-input">
                    {STATUSES.map((s) => (
                      <option key={`status-${s}`} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Purchase Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    {...register('purchaseDate', { required: 'Purchase date is required' })}
                    className="form-input"
                  />
                  {errors.purchaseDate && <p className="form-error">{errors.purchaseDate.message}</p>}
                </div>
                <div>
                  <label className="form-label">Location <span className="text-red-500">*</span></label>
                  <p className="form-helper -mt-0.5 mb-1">Building, floor, or room</p>
                  <input
                    {...register('location', { required: 'Location is required' })}
                    placeholder="e.g. Block A — Room 12"
                    className="form-input"
                  />
                  {errors.location && <p className="form-error">{errors.location.message}</p>}
                </div>
                <div>
                  <label className="form-label">Supplier</label>
                  <p className="form-helper -mt-0.5 mb-1">Optional — vendor the device was bought from</p>
                  <input
                    {...register('supplier')}
                    placeholder="e.g. CompuGhana"
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Purchase Cost</label>
                  <p className="form-helper -mt-0.5 mb-1">Optional — amount it was bought for</p>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('purchaseCost', {
                      setValueAs: (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
                      min: { value: 0, message: 'Cost cannot be negative' },
                    })}
                    placeholder="e.g. 4500.00"
                    className="form-input"
                  />
                  {errors.purchaseCost && <p className="form-error">{errors.purchaseCost.message}</p>}
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* School Section */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                School Section
              </h3>
              <label className="form-label">School <span className="text-red-500">*</span></label>
              <p className="form-helper -mt-0.5 mb-2">Which school section does this asset belong to?</p>
              <div className="flex items-center gap-2 flex-wrap">
                {SCHOOLS.map((school) => (
                  <label key={school} className="relative cursor-pointer">
                    <input
                      type="radio"
                      value={school}
                      {...register('school', { required: 'Please select a school section' })}
                      className="peer sr-only"
                    />
                    <span
                      className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-150
                        border-slate-200 text-slate-600 bg-white hover:border-slate-300
                        ${SCHOOL_COLORS[school]}`}
                    >
                      {school}
                    </span>
                  </label>
                ))}
              </div>
              {errors.school && <p className="form-error mt-1">{errors.school.message}</p>}
            </div>

            <hr className="border-slate-100" />

            {/* Asset Identification */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Asset Identification
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">
                    Asset Tag <span className="text-red-500">*</span>
                  </label>
                  <p className="form-helper -mt-0.5 mb-1">
                    Auto-generated — edit or regenerate if needed
                  </p>
                  <div className="relative">
                    <input
                      {...register('assetTag', {
                        required: 'Asset tag is required',
                        pattern: {
                          value:   /^(INF|JUN|SEC)-[A-Z]{2}-\d{4}$/,
                          message: 'Format must be INF/JUN/SEC-XX-0000',
                        },
                      })}
                      placeholder="Select school & category above"
                      className="form-input font-mono pr-9"
                    />
                    {watchedSchool && watchedCategory && (
                      <button
                        type="button"
                        onClick={regenerateTag}
                        className="absolute right-2 top-1/2 -translate-y-1/2 icon-btn"
                        title="Generate a new ID"
                      >
                        <RefreshCw size={13} />
                      </button>
                    )}
                  </div>
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

            {/* Assignment Details */}
            {showAssignment && (
              <>
                <hr className="border-slate-100" />
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Assignment Details
                  </h3>
                  <p className="text-xs text-slate-400 mb-3">
                    Enter the staff member this asset is being assigned to.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="form-label">Staff Name</label>
                      <input
                        {...register('assignedTo')}
                        placeholder="e.g. Kwame Mensah"
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="form-label">Staff ID</label>
                      <input
                        {...register('assignedToId')}
                        placeholder="e.g. EMP-1042"
                        className="form-input font-mono"
                      />
                    </div>
                    <div>
                      <label className="form-label">Department</label>
                      <input
                        {...register('department')}
                        placeholder="e.g. Year 3"
                        className="form-input"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <hr className="border-slate-100" />

            {/* Notes */}
            <div>
              <label className="form-label">Notes</label>
              <textarea
                {...register('notes')}
                rows={3}
                placeholder="e.g. Battery replaced Jan 2026. Minor cosmetic scratches on lid."
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