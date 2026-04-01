'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '@/components/ui/Modal';
import { Asset, AssetCategory, AssetStatus } from '@/lib/mockData';
import { Loader2 } from 'lucide-react';

type FormData = Omit<Asset, 'id'>;

interface AssetFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => void;
  mode: 'add' | 'edit';
  defaultValues?: Asset;
}

const CATEGORIES: AssetCategory[] = [
  'Laptop', 'Desktop', 'Monitor', 'Printer', 'Networking', 'Accessory', 'Server', 'Phone',
];
const STATUSES: AssetStatus[] = ['Available', 'Assigned', 'Faulty', 'Retired'];

export default function AssetFormModal({
  open, onClose, onSubmit, mode, defaultValues,
}: AssetFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: defaultValues
      ? {
          assetTag: defaultValues.assetTag,
          name: defaultValues.name,
          category: defaultValues.category,
          serialNumber: defaultValues.serialNumber,
          purchaseDate: defaultValues.purchaseDate,
          status: defaultValues.status,
          location: defaultValues.location,
          assignedTo: defaultValues.assignedTo ?? '',
          assignedToId: defaultValues.assignedToId ?? '',
          department: defaultValues.department ?? '',
          notes: defaultValues.notes ?? '',
        }
      : {
          status: 'Available',
          category: 'Laptop',
        },
  });

  useEffect(() => {
    if (open) {
      reset(
        defaultValues
          ? {
              assetTag: defaultValues.assetTag,
              name: defaultValues.name,
              category: defaultValues.category,
              serialNumber: defaultValues.serialNumber,
              purchaseDate: defaultValues.purchaseDate,
              status: defaultValues.status,
              location: defaultValues.location,
              assignedTo: defaultValues.assignedTo ?? '',
              assignedToId: defaultValues.assignedToId ?? '',
              department: defaultValues.department ?? '',
              notes: defaultValues.notes ?? '',
            }
          : { status: 'Available', category: 'Laptop' }
      );
    }
  }, [open, defaultValues, reset]);

  const onFormSubmit = async (data: FormData) => {
    // Simulate brief async
    await new Promise((r) => setTimeout(r, 400));
    // TODO: POST or PUT /api/assets
    onSubmit(data);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'add' ? 'Add New Asset' : `Edit Asset — ${defaultValues?.assetTag}`}
      subtitle={mode === 'add' ? 'Fill in all required fields to register a new IT asset.' : 'Update the details for this asset.'}
      size="lg"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="px-6 py-5 space-y-5">
        {/* Section: Identification */}
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Asset Identification
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                Asset Tag / Unique ID <span className="text-red-500">*</span>
              </label>
              <p className="form-helper -mt-0.5 mb-1">
                Format: IT-[TYPE]-[NUMBER] e.g. IT-LT-0045
              </p>
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

        {/* Section: Device Details */}
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
                {...register('name', { required: 'Item name is required', minLength: { value: 3, message: 'Name must be at least 3 characters' } })}
                placeholder="e.g. Dell Latitude 5540"
                className="form-input"
              />
              {errors.name && <p className="form-error">{errors.name.message}</p>}
            </div>
            <div>
              <label className="form-label">
                Category <span className="text-red-500">*</span>
              </label>
              <select {...register('category', { required: true })} className="form-input">
                {CATEGORIES.map((c) => (
                  <option key={`cat-opt-${c}`} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">
                Status <span className="text-red-500">*</span>
              </label>
              <select {...register('status', { required: true })} className="form-input">
                {STATUSES.map((s) => (
                  <option key={`status-opt-${s}`} value={s}>{s}</option>
                ))}
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

        {/* Section: Assignment (optional) */}
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
              <input
                {...register('assignedTo')}
                placeholder="e.g. Marcus Osei"
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
                placeholder="e.g. Engineering"
                className="form-input"
              />
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

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary min-w-[130px] justify-center"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving…
              </>
            ) : mode === 'add' ? (
              'Add Asset'
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}