// Lightweight request-body validators for API routes.
// Returns a typed value on success, or a descriptive string error on failure.
// Keeps things dependency-free — if the project grows, swap for zod.

import type {
  AssetCategory,
  AssetStatus,
  SchoolSection,
} from '@/lib/supabase/types';

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const ASSET_CATEGORIES: AssetCategory[] = [
  'Laptop', 'Desktop', 'Monitor', 'Printer',
  'Networking', 'Accessory', 'Server', 'Phone',
  'iPad', 'System Unit', 'Interactive Screen',
];
const ASSET_STATUSES: AssetStatus[] = ['Available', 'Assigned', 'Faulty', 'Retired'];
const SCHOOL_SECTIONS: SchoolSection[] = ['Infant School', 'Junior School', 'Secondary School'];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ASSET_TAG_RE = /^[A-Z0-9-]{3,30}$/;

/**
 * Sanitizes a user-supplied search term for safe interpolation into a
 * PostgREST `.or()` filter string. Commas, parentheses, and quotes are
 * structural characters in PostgREST filter syntax — left unescaped they let
 * a search term alter the filter logic. LIKE wildcards (% and _) are also
 * escaped so users can search for them literally.
 */
export function sanitizeSearchTerm(term: string): string {
  return term
    .replace(/[,()"]/g, ' ')        // strip PostgREST structural chars
    .replace(/[\\%_]/g, '\\$&')     // escape LIKE wildcards & backslash
    .trim();
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function isOptionalString(v: unknown): v is string | undefined | null {
  return v === undefined || v === null || typeof v === 'string';
}

function isIsoDate(v: unknown): v is string {
  return typeof v === 'string' && DATE_RE.test(v) && !Number.isNaN(new Date(v).getTime());
}

// ─── Assets ──────────────────────────────────────────────────────────────────

export interface AssetCreateInput {
  assetTag: string;
  name: string;
  category: AssetCategory;
  serialNumber: string;
  purchaseDate: string;
  status?: AssetStatus;
  location: string;
  school?: SchoolSection | null;
  assignedTo?: string | null;
  assignedToId?: string | null;
  department?: string | null;
  notes?: string | null;
  supplier?: string | null;
  purchaseCost?: number | null;
}

export function validateAssetCreate(body: unknown): ValidationResult<AssetCreateInput> {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Body must be a JSON object' };
  const b = body as Record<string, unknown>;

  if (!isNonEmptyString(b.assetTag))      return { ok: false, error: 'assetTag is required' };
  if (!ASSET_TAG_RE.test(b.assetTag))     return { ok: false, error: 'assetTag must match /^[A-Z0-9-]{3,30}$/' };
  if (!isNonEmptyString(b.name))          return { ok: false, error: 'name is required' };
  if (!isNonEmptyString(b.category))      return { ok: false, error: 'category is required' };
  if (!ASSET_CATEGORIES.includes(b.category as AssetCategory))
    return { ok: false, error: `category must be one of: ${ASSET_CATEGORIES.join(', ')}` };
  if (!isNonEmptyString(b.serialNumber))  return { ok: false, error: 'serialNumber is required' };
  if (!isIsoDate(b.purchaseDate))         return { ok: false, error: 'purchaseDate must be YYYY-MM-DD' };
  if (!isNonEmptyString(b.location))      return { ok: false, error: 'location is required' };

  if (b.status !== undefined && !ASSET_STATUSES.includes(b.status as AssetStatus))
    return { ok: false, error: `status must be one of: ${ASSET_STATUSES.join(', ')}` };
  if (b.school !== undefined && b.school !== null && !SCHOOL_SECTIONS.includes(b.school as SchoolSection))
    return { ok: false, error: `school must be one of: ${SCHOOL_SECTIONS.join(', ')}` };

  if (!isOptionalString(b.assignedTo))     return { ok: false, error: 'assignedTo must be a string' };
  if (!isOptionalString(b.assignedToId))   return { ok: false, error: 'assignedToId must be a string' };
  if (!isOptionalString(b.department))     return { ok: false, error: 'department must be a string' };
  if (!isOptionalString(b.notes))          return { ok: false, error: 'notes must be a string' };
  if (!isOptionalString(b.supplier))       return { ok: false, error: 'supplier must be a string' };

  // purchaseCost: optional non-negative number (accepts numeric strings from CSV/forms)
  let purchaseCost: number | null = null;
  if (b.purchaseCost !== undefined && b.purchaseCost !== null && b.purchaseCost !== '') {
    // Tolerate spreadsheet currency formatting: "$588.56", "GH₵ 4,500.00", etc.
    const n =
      typeof b.purchaseCost === 'number'
        ? b.purchaseCost
        : Number(String(b.purchaseCost).replace(/[^0-9.-]/g, ''));
    if (Number.isNaN(n) || !Number.isFinite(n) || n < 0) {
      return { ok: false, error: 'purchaseCost must be a non-negative number' };
    }
    purchaseCost = Math.round(n * 100) / 100; // 2dp currency precision
  }

  return {
    ok: true,
    value: {
      assetTag:      b.assetTag.trim(),
      name:          b.name.trim(),
      category:      b.category as AssetCategory,
      serialNumber:  b.serialNumber.trim(),
      purchaseDate:  b.purchaseDate,
      status:        (b.status as AssetStatus | undefined) ?? 'Available',
      location:      b.location.trim(),
      school:        (b.school as SchoolSection | null | undefined) ?? null,
      assignedTo:    (b.assignedTo as string | null | undefined) ?? null,
      assignedToId:  (b.assignedToId as string | null | undefined) ?? null,
      department:    (b.department as string | null | undefined) ?? null,
      notes:         (b.notes as string | null | undefined) ?? null,
      supplier:      ((b.supplier as string | null | undefined) ?? null)?.trim() || null,
      purchaseCost,
    },
  };
}

export type AssetUpdateInput = AssetCreateInput;

export function validateAssetUpdate(body: unknown): ValidationResult<AssetUpdateInput> {
  // Full PUT replaces the record — same shape as create, but status is required.
  const base = validateAssetCreate(body);
  if (!base.ok) return base;
  if (!(body as Record<string, unknown>).status) {
    return { ok: false, error: 'status is required for full update' };
  }
  return base;
}

export function validateAssetStatusPatch(body: unknown): ValidationResult<{ status: AssetStatus }> {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Body must be a JSON object' };
  const b = body as Record<string, unknown>;
  if (!isNonEmptyString(b.status)) return { ok: false, error: 'status is required' };
  if (!ASSET_STATUSES.includes(b.status as AssetStatus))
    return { ok: false, error: `status must be one of: ${ASSET_STATUSES.join(', ')}` };
  return { ok: true, value: { status: b.status as AssetStatus } };
}

// ─── Assignments ─────────────────────────────────────────────────────────────

export interface AssignmentCreateInput {
  assetTag: string;
  staffName: string;
  staffId: string;
  department: string;
  dateAssigned: string;
  expectedReturn: string;
  notes?: string | null;
}

export function validateAssignmentCreate(body: unknown): ValidationResult<AssignmentCreateInput> {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Body must be a JSON object' };
  const b = body as Record<string, unknown>;

  if (!isNonEmptyString(b.assetTag))       return { ok: false, error: 'assetTag is required' };
  if (!isNonEmptyString(b.staffName))      return { ok: false, error: 'staffName is required' };
  if (!isNonEmptyString(b.staffId))        return { ok: false, error: 'staffId is required' };
  if (!isNonEmptyString(b.department))     return { ok: false, error: 'department is required' };
  if (!isIsoDate(b.dateAssigned))          return { ok: false, error: 'dateAssigned must be YYYY-MM-DD' };
  if (!isIsoDate(b.expectedReturn))        return { ok: false, error: 'expectedReturn must be YYYY-MM-DD' };
  if (!isOptionalString(b.notes))          return { ok: false, error: 'notes must be a string' };

  return {
    ok: true,
    value: {
      assetTag:       b.assetTag.trim(),
      staffName:      b.staffName.trim(),
      staffId:        b.staffId.trim(),
      department:     b.department.trim(),
      dateAssigned:   b.dateAssigned,
      expectedReturn: b.expectedReturn,
      notes:          (b.notes as string | null | undefined) ?? null,
    },
  };
}

export interface AssignmentUpdateInput {
  expectedReturn: string;
}

export function validateAssignmentUpdate(body: unknown): ValidationResult<AssignmentUpdateInput> {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Body must be a JSON object' };
  const b = body as Record<string, unknown>;
  if (!isIsoDate(b.expectedReturn)) return { ok: false, error: 'expectedReturn must be YYYY-MM-DD' };
  return { ok: true, value: { expectedReturn: b.expectedReturn } };
}

export interface AssignmentReturnInput {
  returnedDate: string;
  condition?: string | null;
  notes?: string | null;
}

export function validateAssignmentReturn(body: unknown): ValidationResult<AssignmentReturnInput> {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Body must be a JSON object' };
  const b = body as Record<string, unknown>;
  if (!isIsoDate(b.returnedDate))         return { ok: false, error: 'returnedDate must be YYYY-MM-DD' };
  if (!isOptionalString(b.condition))     return { ok: false, error: 'condition must be a string' };
  if (!isOptionalString(b.notes))         return { ok: false, error: 'notes must be a string' };
  return {
    ok: true,
    value: {
      returnedDate: b.returnedDate,
      condition:    (b.condition as string | null | undefined) ?? null,
      notes:        (b.notes as string | null | undefined) ?? null,
    },
  };
}
