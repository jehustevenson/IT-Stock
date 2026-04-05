'use server';

import { createClient } from '@/lib/supabase/server';

/**
 * Updates all Active assignments to Overdue if their expectedReturn date has passed.
 * This should be called periodically (e.g., via a cron job or Edge Function).
 * Can also be manually triggered when fetching assignments.
 */
export async function markOverdueAssignments() {
  const supabase = await createClient();

  try {
    // Get current date at midnight UTC
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Find all Active assignments where expectedReturn < today
    const { data: overdueAssignments, error: selectErr } = await supabase
      .from('assignments')
      .select('id, asset_tag, staff_name, staff_id, department')
      .eq('status', 'Active')
      .lt('expected_return', todayStr);

    if (selectErr) {
      console.error('Error fetching overdue assignments:', selectErr);
      return { success: false, error: selectErr.message, updated: 0 };
    }

    if (!overdueAssignments || overdueAssignments.length === 0) {
      return { success: true, updated: 0, message: 'No overdue assignments to update' };
    }

    // Update all found assignments to Overdue status
    const { error: updateErr } = await supabase
      .from('assignments')
      .update({ status: 'Overdue' })
      .eq('status', 'Active')
      .lt('expected_return', todayStr);

    if (updateErr) {
      console.error('Error updating assignments to Overdue:', updateErr);
      return { success: false, error: updateErr.message, updated: 0 };
    }

    // Log audit entries for each updated assignment
    const { data: { user } } = await supabase.auth.getUser();
    const performedBy = user?.email ?? 'System (Scheduler)';

    const auditLogs = overdueAssignments.map((asgn) => ({
      action: 'Flagged' as const,
      asset_tag: asgn.asset_tag,
      asset_name: '', // We'll fetch this separately if needed
      performed_by: performedBy,
      details: `Assignment marked as overdue — expected return date passed. Staff: ${asgn.staff_name} (${asgn.staff_id}) — ${asgn.department}`,
    }));

    if (auditLogs.length > 0) {
      await supabase.from('audit_logs').insert(auditLogs);
    }

    return {
      success: true,
      updated: overdueAssignments.length,
      message: `Updated ${overdueAssignments.length} assignment(s) to Overdue status`,
    };
  } catch (err) {
    console.error('Unexpected error in markOverdueAssignments:', err);
    return { success: false, error: String(err), updated: 0 };
  }
}
