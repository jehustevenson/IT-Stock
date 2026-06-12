'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '@/components/ui/Modal';
import { Assignment, Asset } from '@/lib/supabase/types';
import { SCHOOL_DEPARTMENTS } from '@/lib/assetUtils';
import { Loader2, PackageCheck } from 'lucide-react';

type FormData = Omit<Assignment, 'id' | 'status' | 'returnedDate'>;

interface AssignmentFormModalProps {
  open:            boolean;
  onClose:         () => void;
  onSubmit:        (data: Omit<Assignment, 'id'>) => void;
  availableAssets?: Asset[];
}

export default function AssignmentFormModal({
  open,
  onClose,
  onSubmit,
  availableAssets = [],
}: AssignmentFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      department:   'Administration',
      dateAssigned: new Date().toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        department:   'Administration',
        dateAssigned: new Date().toISOString().split('T')[0],
      });
    }
  }, [open, reset]);

  // Watch the picked-asset fields so we can show them in read-only display.
  // Source of truth is the dropdown — these are never hand-edited.
  const pickedTag      = watch('assetTag');
  const pickedName     = watch('assetName');
  const pickedCategory = watch('category');

  function handleAssetSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const tag   = e.target.value;
    const found = availableAssets.find((a) => a.assetTag === tag);
    // Only set form values when the selection resolves to an asset — otherwise
    // clear them so we don't leak a stale pick into the submit payload.
    if (found) {
      setValue('assetTag',  found.assetTag, { shouldValidate: true });
      setValue('assetName', found.name,     { shouldValidate: true });
      setValue('category',  found.category, { shouldValidate: true });
    } else {
      setValue('assetTag',  '');
      setValue('assetName', '');
    }
  }

  const onFormSubmit = async (data: FormData) => {
    await new Promise((r) => setTimeout(r, 300));
    onSubmit({ ...data, status: 'Active' });
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Asset Assignment"
      subtitle="Assign an IT asset to a staff member and set the expected return date."
      size="lg"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="px-6 py-5 space-y-5">

        {/* Asset Details */}
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Asset Details
          </h3>

          {availableAssets.length === 0 ? (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800 font-medium">No assets available to assign</p>
              <p className="text-xs text-amber-700 mt-1">
                All assets are currently assigned, faulty, or retired. Return an asset or add a new
                one before creating an assignment.
              </p>
            </div>
          ) : (
            <div className="mb-4">
              <label className="form-label flex items-center gap-1.5">
                <PackageCheck size={13} className="text-emerald-600" />
                Pick from Available Assets <span className="text-red-500">*</span>
              </label>
              <p className="form-helper -mt-0.5 mb-1">
                {availableAssets.length} asset{availableAssets.length !== 1 ? 's' : ''} ready to assign
              </p>
              <select
                onChange={handleAssetSelect}
                value={pickedTag ?? ''}
                className="form-input text-sm"
              >
                <option value="" disabled>— Select an available asset —</option>
                {availableAssets.map((a) => (
                  <option key={a.id} value={a.assetTag}>
                    {a.assetTag} — {a.name} ({a.category}){a.school ? ` · ${a.school}` : ''} · {a.location}
                  </option>
                ))}
              </select>
              {/* Hidden registered fields — values flow in via setValue() from handleAssetSelect
                  so the form payload still includes assetTag/assetName/category, but the user
                  can't edit them directly. */}
              <input type="hidden" {...register('assetTag',  { required: 'Please select an asset' })} />
              <input type="hidden" {...register('assetName', { required: true })} />
              <input type="hidden" {...register('category',  { required: true })} />
              {errors.assetTag && <p className="form-error mt-1">{errors.assetTag.message}</p>}
            </div>
          )}

          {pickedTag && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Asset Tag</label>
                <div className="form-input font-mono bg-slate-50 text-slate-700 cursor-not-allowed select-all">
                  {pickedTag}
                </div>
              </div>
              <div>
                <label className="form-label">Asset Name</label>
                <div className="form-input bg-slate-50 text-slate-700 cursor-not-allowed">
                  {pickedName}
                </div>
              </div>
              <div>
                <label className="form-label">Category</label>
                <div className="form-input bg-slate-50 text-slate-700 cursor-not-allowed">
                  {pickedCategory}
                </div>
              </div>
            </div>
          )}
        </div>

        <hr className="border-slate-100" />

        {/* Staff Details */}
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Staff Member
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                Staff Name <span className="text-red-500">*</span>
              </label>
              <input
                {...register('staffName', {
                  required:  'Staff name is required',
                  minLength: { value: 2, message: 'Name too short' },
                })}
                placeholder="e.g. Kwame Mensah"
                className="form-input"
              />
              {errors.staffName && <p className="form-error">{errors.staffName.message}</p>}
            </div>
            <div>
              <label className="form-label">
                Staff ID <span className="text-red-500">*</span>
              </label>
              <p className="form-helper -mt-0.5 mb-1">Employee ID — format EMP-0000</p>
              <input
                {...register('staffId', {
                  required: 'Staff ID is required',
                  pattern:  { value: /^EMP-\d{4}$/, message: 'Format must be EMP-0000' },
                })}
                placeholder="EMP-1042"
                className="form-input font-mono"
              />
              {errors.staffId && <p className="form-error">{errors.staffId.message}</p>}
            </div>
            <div>
              <label className="form-label">
                Department / Year Group <span className="text-red-500">*</span>
              </label>
              {/* FIX: replaced generic corporate list with school departments */}
              <select {...register('department', { required: true })} className="form-input">
                {SCHOOL_DEPARTMENTS.map((d) => (
                  <option key={`asgn-dept-${d}`} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Dates */}
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Assignment Dates
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                Date Assigned <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('dateAssigned', { required: 'Assignment date is required' })}
                max={today}
                className="form-input"
              />
              {errors.dateAssigned && <p className="form-error">{errors.dateAssigned.message}</p>}
            </div>
            <div>
              <label className="form-label">
                Expected Return <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('expectedReturn', {
                  required: 'Expected return date is required',
                  validate: (value) =>
                    value >= today || 'Return date must be today or later',
                })}
                min={today}
                className="form-input"
              />
              {errors.expectedReturn && (
                <p className="form-error">{errors.expectedReturn.message}</p>
              )}
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Notes */}
        <div>
          <label className="form-label">Notes</label>
          <p className="form-helper -mt-0.5 mb-1">
            Reason for assignment, special conditions, or handover notes
          </p>
          <textarea
            {...register('notes')}
            rows={3}
            placeholder="e.g. Assigned for new hire onboarding. Includes charger and carry case."
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
            className="btn-primary min-w-[150px] justify-center"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Assigning…
              </>
            ) : (
              'Create Assignment'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}