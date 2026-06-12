'use client';

import React, { useEffect, useCallback } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import Modal from '@/components/ui/Modal';
import { Asset, AssetCategory, AssetStatus, SchoolSection, SCHOOLS } from '@/lib/supabase/types';
import { Loader2, RefreshCw } from 'lucide-react';

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
  'iPad', 'System Unit', 'Interactive Screen',
];
const STATUSES: AssetStatus[] = ['Available', 'Assigned', 'Faulty', 'Retired'];

const SCHOOL_PREFIX: Record<SchoolSection, string> = {
  'Infant School':    'INF',
  'Junior School':    'JUN',
  'Secondary School': 'SEC',
};

const CATEGORY_CODE: Record<AssetCategory, string> = {
  Laptop:     'LT',
  Desktop:    'DT',
  Monitor:    'MN',
  Printer:    'PR',
  Networking: 'NW',
  Accessory:  'AC',
  Server:        'SV',
  Phone:         'PH',
  'iPad':                'IP',
  'System Unit':         'SU',
  'Interactive Screen':  'IS',
};

function generateTag(school: SchoolSection, category: AssetCategory): string {
  const prefix = SCHOOL_PREFIX[school];
  const code = CATEGORY_CODE[category];
  const num = String(Math.floor(1000 + Math.random() * 9000));
  return `${prefix}-${code}-${num}`;
}

const SCHOOL_COLORS: Record<SchoolSection, string> = {
  'Infant School':    'peer-checked:bg-pink-600 peer-checked:border-pink-600 peer-checked:text-white',
  'Junior School':    'peer-checked:bg-violet-600 peer-checked:border-violet-600 peer-checked:text-white',
  'Secondary School': 'peer-checked:bg-teal-600 peer-checked:border-teal-600 peer-checked:text-white',
};

export default function AssetFormModal({
  open, onClose, onSubmit, mode, defaultValues,
}: AssetFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: defaultValues
      ? {
          assetTag:     defaultValues.assetTag,
          name:         defaultValues.name,
          category:     defaultValues.category,
          serialNumber: defaultValues.serialNumber,
          purchaseDate: defaultValues.purchaseDate,
          status:       defaultValues.status,
          location:     defaultValues.location,
          school:       defaultValues.school ?? undefined,
          assignedTo:   defaultValues.assignedTo   ?? '',
          assignedToId: defaultValues.assignedToId ?? '',
          department:   defaultValues.department   ?? '',
          notes:        defaultValues.notes        ?? '',
          supplier:     defaultValues.supplier     ?? '',
          purchaseCost: defaultValues.purchaseCost,
        }
      : {
          status:   'Available',
          category: 'Laptop',
        },
  });

  const watchedSchool   = useWatch({ control, name: 'school' });
  const watchedCategory = useWatch({ control, name: 'category' });
  const watchedStatus   = useWatch({ control, name: 'status' });
  const showAssignment  = watchedStatus === 'Assigned';

  const regenerateTag = useCallback(() => {
    if (watchedSchool && watchedCategory) {
      setValue('assetTag', generateTag(watchedSchool as SchoolSection, watchedCategory as AssetCategory), { shouldValidate: true });
    }
  }, [watchedSchool, watchedCategory, setValue]);

  // Auto-generate when school or category changes (add mode only)
  useEffect(() => {
    if (mode === 'add' && watchedSchool && watchedCategory) {
      setValue('assetTag', generateTag(watchedSchool as SchoolSection, watchedCategory as AssetCategory), { shouldValidate: true });
    }
  }, [watchedSchool, watchedCategory, mode, setValue]);

  useEffect(() => {
    if (open) {
      reset(
        defaultValues
          ? {
              assetTag:     defaultValues.assetTag,
              name:         defaultValues.name,
              category:     defaultValues.category,
              serialNumber: defaultValues.serialNumber,
              purchaseDate: defaultValues.purchaseDate,
              status:       defaultValues.status,
              location:     defaultValues.location,
              school:       defaultValues.school ?? undefined,
              assignedTo:   defaultValues.assignedTo   ?? '',
              assignedToId: defaultValues.assignedToId ?? '',
              department:   defaultValues.department   ?? '',
              notes:        defaultValues.notes        ?? '',
              supplier:     defaultValues.supplier     ?? '',
              purchaseCost: defaultValues.purchaseCost,
            }
          : { status: 'Available', category: 'Laptop' }
      );
    }
  }, [open, defaultValues, reset]);

  const onFormSubmit = async (data: FormData) => {
    await new Promise((r) => setTimeout(r, 400));
    onSubmit(data);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'add' ? 'Add New Asset' : `Edit Asset — ${defaultValues?.assetTag}`}
      subtitle={
        mode === 'add'
          ? 'Fill in all required fields to register a new IT asset.'
          : 'Update the details for this asset.'
      }
      size="lg"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="px-6 py-5 space-y-5">

        {/* Device Details */}
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Device Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="form-label">Item Name <span className="text-red-500">*</span></label>
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
                {CATEGORIES.map((c) => (
                  <option key={`cat-opt-${c}`} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Status <span className="text-red-500">*</span></label>
              <select {...register('status', { required: true })} className="form-input">
                {STATUSES.map((s) => (
                  <option key={`status-opt-${s}`} value={s}>{s}</option>
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
                Asset Tag / Unique ID <span className="text-red-500">*</span>
              </label>
              {mode === 'add' ? (
                <>
                  <p className="form-helper -mt-0.5 mb-1">
                    Auto-generated from school &amp; category — you can edit if needed
                  </p>
                  <div className="relative">
                    <input
                      {...register('assetTag', {
                        required: 'Asset tag is required',
                        pattern: {
                          value: /^(INF|JUN|SEC)-[A-Z]{2}-\d{4}$/,
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
                </>
              ) : (
                <>
                  <p className="form-helper -mt-0.5 mb-1">Asset tag cannot be changed after creation</p>
                  <input
                    {...register('assetTag')}
                    readOnly
                    className="form-input font-mono bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                </>
              )}
              {errors.assetTag && <p className="form-error">{errors.assetTag.message}</p>}
            </div>
            <div>
              <label className="form-label">Serial Number <span className="text-red-500">*</span></label>
              <input
                {...register('serialNumber', { required: 'Serial number is required' })}
                placeholder="e.g. DLAT5540-2024-0045"
                className="form-input font-mono"
              />
              {errors.serialNumber && <p className="form-error">{errors.serialNumber.message}</p>}
            </div>
          </div>
        </div>

        {/* Assignment Details — only shown when status is Assigned */}
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