import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'manager' | 'operator' | 'viewer';

/**
 * Resolves a user's effective role.
 *
 * Precedence:
 *   1. `app_metadata.role` if explicitly set. app_metadata can only be written
 *      server-side (service-role key / Supabase dashboard), unlike
 *      user_metadata which any logged-in user can edit via
 *      `supabase.auth.updateUser()` — trusting user_metadata here would let
 *      any user promote themselves to admin.
 *   2. ADMIN_EMAILS env var — comma-separated allow-list of bootstrap admins.
 *      This exists because there's no in-app user-management UI; without it,
 *      a brand-new Supabase user has no role and is stuck at `viewer`.
 *   3. Default: `viewer`
 */
export function resolveUserRole(user: User): UserRole {
  const metaRole = user.app_metadata?.role as UserRole | undefined;
  if (metaRole && ['admin', 'manager', 'operator', 'viewer'].includes(metaRole)) {
    return metaRole;
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (user.email && adminEmails.includes(user.email.toLowerCase())) {
    return 'admin';
  }

  return 'viewer';
}

/**
 * Checks if the current user is authenticated and has the required role.
 * Roles from most to least privileged: admin > manager > operator > viewer
 *
 * Returns { user, role } if authorized, or a NextResponse error if not.
 */
export async function checkAuth(
  requiredRole: UserRole = 'operator'
): Promise<{ user: User; role: UserRole } | NextResponse> {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = resolveUserRole(user);
  
  // Role hierarchy: admin can do anything, manager can do most things, etc.
  const roleHierarchy: Record<UserRole, number> = {
    admin: 4,
    manager: 3,
    operator: 2,
    viewer: 1,
  };

  if (roleHierarchy[userRole] < roleHierarchy[requiredRole]) {
    return NextResponse.json(
      { error: `Insufficient permissions. Required role: ${requiredRole}, your role: ${userRole}` },
      { status: 403 }
    );
  }

  return { user, role: userRole };
}

/**
 * Permission matrix for different operations.
 * Adjust as needed for your business logic.
 */
export const PERMISSIONS = {
  // Asset operations
  'asset:read': ['viewer', 'operator', 'manager', 'admin'] as UserRole[],
  'asset:create': ['operator', 'manager', 'admin'] as UserRole[],
  'asset:update': ['operator', 'manager', 'admin'] as UserRole[],
  'asset:delete': ['manager', 'admin'] as UserRole[], // Only manager+ can delete
  'asset:export': ['operator', 'manager', 'admin'] as UserRole[],

  // Assignment operations
  'assignment:read': ['viewer', 'operator', 'manager', 'admin'] as UserRole[],
  'assignment:create': ['operator', 'manager', 'admin'] as UserRole[],
  'assignment:return': ['operator', 'manager', 'admin'] as UserRole[],
  'assignment:update': ['manager', 'admin'] as UserRole[],

  // Audit logs
  'audit:read': ['operator', 'manager', 'admin'] as UserRole[],
  'audit:export': ['manager', 'admin'] as UserRole[],

  // System admin
  'admin:manage-users': ['admin'] as UserRole[],
  'admin:settings': ['admin'] as UserRole[],
} as const;

/**
 * Check if a user has permission for a specific action.
 */
export function hasPermission(role: UserRole, permission: keyof typeof PERMISSIONS): boolean {
  const allowedRoles = PERMISSIONS[permission];
  return allowedRoles.includes(role);
}
