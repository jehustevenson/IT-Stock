'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '@/components/ui/Modal';
import { Assignment, AssetCategory } from '@/lib/mockData';
import { Loader2 } from 'lucide-react';

type FormData = Omit<Assignment, 'id' | 'status' | 'returnedDate'>;

interface AssignmentFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Assignment, 'id'>) => Promise<void>;
}

const CATEGORIES: AssetCategory[] = [
  'Laptop', 'Desktop', 'Monitor', 'Printer', 'Networking', 'Accessory', 'Server', 'Phone',
];

const DEPARTMENTS = [
  'Engineering',
  'Design',
  'Finance',
  'Administration',
  'IT Infrastructure',
  'Sales',
  'Marketing',
  'HR',
  'Legal',
  'Operations',
];

// Accepts EMP-0000 or DEPT-XXXX formats
const STAFF_ID_PATTERN = /^(EMP-\d{4}|DEPT-[A-Z]+)$/;

export default function AssignmentFormModal({
  open,
  onClose,
  onSubmit,
}: AssignmentFormModalProps) {
  const today = new Date().toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      category: 'Laptop',
      department: 'Engineering',
      dateAssigned: today,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        category: 'Laptop',
        department: 'Engineering',
        dateAssigned: today,
      });
    }
  }, [open, reset, today]);

  const onFormSubmit = async (data: FormData) => {
    try {
      await onSubmit({ ...data, status: 'Active' });
    } catch (err: unknown) {
      // Surface API errors back into the form
      const message =
        err instanceof Error ? err.message : 'Failed to create assignment. Please try again.';
      setError('root', { message });
    }
  };

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                Asset Tag <span className="text-red-500">*</span>
              </label>
              <p className="form-helper -mt-0.5 mb-1">The asset tag of the item being assigned</p>
              <input
                {...register('assetTag', {
                  required: 'Asset tag is required',
                  pattern: { value: /^IT-[A-Z]{2}-\d{4}$/, message: 'Format must be IT-XX-0000' },
                })}
                placeholder="IT-LT-0042"
                className="form-input font-mono"
              />
              {errors.assetTag && <p className="form-error">{errors.assetTag.message}</p>}
            </div>
            <div>
              <label className="form-label">
                Asset Name <span className="text-red-500">*</span>
              </label>
              <input
                {...register('assetName', { required: 'Asset name is required' })}
                placeholder="e.g. Dell Latitude 5540"
                className="form-input"
              />
              {errors.assetName && <p className="form-error">{errors.assetName.message}</p>}
            </div>
            <div>
              <label className="form-label">
                Category <span className="text-red-500">*</span>
              </label>
              <select {...register('category', { required: true })} className="form-input">
                {CATEGORIES.map((c) => (
                  <option key={`asgn-cat-${c}`} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
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
                  required: 'Staff name is required',
                  minLength: { value: 2, message: 'Name too short' },
                })}
                placeholder="e.g. Priya Nair"
                className="form-input"
              />
              {errors.staffName && <p className="form-error">{errors.staffName.message}</p>}
            </div>
            <div>
              <label className="form-label">
                Staff ID <span className="text-red-500">*</span>
              </label>
              <p className="form-helper -mt-0.5 mb-1">
                Employee ID (EMP-0000) or Department ID (DEPT-INFRA)
              </p>
              <input
                {...register('staffId', {
                  required: 'Staff ID is required',
                  pattern: {
                    value: STAFF_ID_PATTERN,
                    message: 'Use format EMP-0000 or DEPT-NAME',
                  },
                })}
                placeholder="EMP-1042 or DEPT-INFRA"
                className="form-input font-mono"
              />
              {errors.staffId && <p className="form-error">{errors.staffId.message}</p>}
            </div>
            <div>
              <label className="form-label">
                Department <span className="text-red-500">*</span>
              </label>
              <select {...register('department', { required: true })} className="form-input">
                {DEPARTMENTS.map((d) => (
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
                {...register('dateAssigned', { required: 'Date assigned is required' })}
                className="form-input"
              />
              {errors.dateAssigned && <p className="form-error">{errors.dateAssigned.message}</p>}
            </div>
            <div>
              <label className="form-label">
                Expected Return Date <span className="text-red-500">*</span>
              </label>
              <p className="form-helper -mt-0.5 mb-1">
                When the asset should be returned — used for overdue tracking
              </p>
              <input
                type="date"
                {...register('expectedReturn', { required: 'Expected return date is required' })}
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

        {/* Root/API error */}
        {errors.root && (
          <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700">{errors.root.message}</p>
          </div>
        )}

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