// Re-export all canonical types from the single source of truth.
// No type definitions live here — import from '@/lib/supabase/types' instead.
export type {
  AssetStatus,
  AssetCategory,
  AssignmentStatus,
  AuditAction,
  SchoolSection,
  Asset,
  Assignment,
  AuditLog,
} from '@/lib/supabase/types';

export { SCHOOLS } from '@/lib/supabase/types';

// Empty arrays kept for any legacy imports that haven't been migrated yet.
// Data is loaded from Supabase via AppDataContext — these are never used at runtime.
export const ASSETS: import('@/lib/supabase/types').Asset[]      = [];
export const ASSIGNMENTS: import('@/lib/supabase/types').Assignment[] = [];
export const AUDIT_LOGS: import('@/lib/supabase/types').AuditLog[]    = [];