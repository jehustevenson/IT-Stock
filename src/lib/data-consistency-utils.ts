import { createClient } from '@/lib/supabase/server';

/**
 * Validates data consistency between assets and assignments tables.
 * Can be run periodically to detect and fix inconsistencies.
 */
export async function validateDataConsistency() {
  const supabase = await createClient();
  const issues: Array<{ type: string; severity: 'error' | 'warning'; description: string }> = [];
  const fixes: Array<{ description: string; executed: boolean; error?: string }> = [];

  try {
    // Check 1: Assets with status='Assigned' should have at least one Active/Overdue assignment
    const { data: assignedAssets } = await supabase
      .from('assets')
      .select('id, asset_tag, status')
      .eq('status', 'Assigned');

    if (assignedAssets) {
      for (const asset of assignedAssets) {
        const { data: activeAssignments } = await supabase
          .from('assignments')
          .select('id')
          .eq('asset_tag', asset.asset_tag)
          .in('status', ['Active', 'Overdue'])
          .limit(1);

        if (!activeAssignments || activeAssignments.length === 0) {
          issues.push({
            type: 'orphan_assignment',
            severity: 'error',
            description: `Asset ${asset.asset_tag} is marked as Assigned but has no active assignments`,
          });

          // Fix: Set asset back to Available
          const { error } = await supabase
            .from('assets')
            .update({ status: 'Available', assigned_to: null, assigned_to_id: null, department: null })
            .eq('id', asset.id);

          fixes.push({
            description: `Reverted asset ${asset.asset_tag} from Assigned to Available`,
            executed: !error,
            error: error?.message,
          });
        }
      }
    }

    // Check 2: Active/Overdue assignments should reference assets with status='Assigned'
    const { data: activeAssignments } = await supabase
      .from('assignments')
      .select('id, asset_tag, status')
      .in('status', ['Active', 'Overdue']);

    if (activeAssignments) {
      for (const assignment of activeAssignments) {
        const { data: assets } = await supabase
          .from('assets')
          .select('status')
          .eq('asset_tag', assignment.asset_tag)
          .limit(1);

        if (assets && assets.length > 0 && assets[0].status !== 'Assigned') {
          issues.push({
            type: 'status_mismatch',
            severity: 'warning',
            description: `Assignment ${assignment.id} for asset ${assignment.asset_tag} is ${assignment.status} but asset status is ${assets[0].status}`,
          });

          // Fix: Update asset status to Assigned
          const { error } = await supabase
            .from('assets')
            .update({ status: 'Assigned' })
            .eq('asset_tag', assignment.asset_tag);

          fixes.push({
            description: `Updated asset ${assignment.asset_tag} status to Assigned`,
            executed: !error,
            error: error?.message,
          });
        }
      }
    }

    // Check 3: Returned assignments should not reference active assets as Assigned
    const { data: returnedAssignments } = await supabase
      .from('assignments')
      .select('id, asset_tag')
      .eq('status', 'Returned');

    if (returnedAssignments) {
      for (const assignment of returnedAssignments) {
        const { data: activeAssign } = await supabase
          .from('assignments')
          .select('id')
          .eq('asset_tag', assignment.asset_tag)
          .in('status', ['Active', 'Overdue'])
          .limit(1);

        // If there are no active assignments, asset should be Available
        if (!activeAssign || activeAssign.length === 0) {
          const { data: assets } = await supabase
            .from('assets')
            .select('status')
            .eq('asset_tag', assignment.asset_tag)
            .limit(1);

          if (assets && assets.length > 0 && assets[0].status === 'Assigned') {
            issues.push({
              type: 'orphan_asset',
              severity: 'error',
              description: `Asset ${assignment.asset_tag} is marked as Assigned but all assignments are Returned`,
            });

            const { error } = await supabase
              .from('assets')
              .update({ status: 'Available', assigned_to: null, assigned_to_id: null, department: null })
              .eq('asset_tag', assignment.asset_tag);

            fixes.push({
              description: `Reverted asset ${assignment.asset_tag} to Available`,
              executed: !error,
              error: error?.message,
            });
          }
        }
      }
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      issues,
      fixes,
      summary: {
        issuesFound: issues.length,
        fixesApplied: fixes.filter((f) => f.executed).length,
        fixesFailed: fixes.filter((f) => !f.executed).length,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: String(err),
      timestamp: new Date().toISOString(),
      issues,
      fixes,
    };
  }
}

/**
 * Ensures that when an asset is deleted, all its assignments are properly closed.
 * This provides stronger guarantees than the current context-only approach.
 */
export async function ensureAssignmentsClosed(assetTag: string, closedDate: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('assignments')
    .update({ status: 'Returned', returned_date: closedDate })
    .eq('asset_tag', assetTag)
    .neq('status', 'Returned');

  return { success: !error, error: error?.message };
}

/**
 * Gets the current assignment status for an asset.
 * Useful for validation before operations.
 */
export async function getAssetAssignmentStatus(assetTag: string) {
  const supabase = await createClient();

  const { data: activeAssignment } = await supabase
    .from('assignments')
    .select('id, staff_name, staff_id, status')
    .eq('asset_tag', assetTag)
    .in('status', ['Active', 'Overdue'])
    .limit(1)
    .maybeSingle();

  const { data: latestAssignment } = await supabase
    .from('assignments')
    .select('id, status, returned_date')
    .eq('asset_tag', assetTag)
    .order('date_assigned', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    activeAssignment,
    latestAssignment,
    isCurrentlyAssigned: !!activeAssignment,
  };
}