'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'
import { MEMBERSHIP_ROLE, MEMBERSHIP_STATUS } from '@/app/domain/constants'
import { revalidatePath } from 'next/cache'

/**
 * Server Action to update member status (ACTIVE or SUSPENDED).
 * 
 * Schema v17.0:
 * - memberships.member_status
 * - memberships.status_reason
 * - audit_logs table for tracking changes
 * 
 * Rules:
 * - OWNER role only
 * - Cannot change own status
 * - Requires reason
 * - Logs to audit_logs
 * 
 * @param org_id - Organization ID
 * @param target_user_id - User ID whose status to change
 * @param new_status - New status: 'ACTIVE' or 'SUSPENDED'
 * @param reason - Reason for status change (required)
 * @returns Success indicator
 * @throws Error('auth_violation') if not OWNER
 * @throws Error('rls_blocked') if RLS blocks update
 * @throws Error('operation_failed') if update fails
 */
export async function updateMemberStatus(
  org_id: string,
  target_user_id: string,
  new_status: 'ACTIVE' | 'SUSPENDED',
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Validate reason is provided
  if (!reason || reason.trim().length === 0) {
    return { success: false, error: 'Priežastis yra privaloma' }
  }

  // Validate new_status
  if (new_status !== 'ACTIVE' && new_status !== 'SUSPENDED') {
    return { success: false, error: 'Netinkamas statusas' }
  }

  // Step 1: Verify user is OWNER in this org
  const { data: membership, error: membershipError }: any = await supabase
    .from('memberships')
    .select('id, role, status')
    .eq('user_id', user.id)
    .eq('org_id', org_id)
    .eq('status', MEMBERSHIP_STATUS.ACTIVE)
    .maybeSingle()

  if (membershipError) {
    if (membershipError?.code === '42501') {
      authViolation()
    }
    console.error('Error fetching membership:', membershipError)
    operationFailed()
  }

  if (!membership) {
    return { success: false, error: 'Neturite prieigos prie šios organizacijos' }
  }

  if (membership.role !== MEMBERSHIP_ROLE.OWNER) {
    return { success: false, error: 'Tik OWNER gali keisti narių statusus' }
  }

  // Step 2: Prevent self-status change
  if (target_user_id === user.id) {
    return { success: false, error: 'Negalite keisti savo statuso' }
  }

  // Step 3: Fetch current membership row (for old_value in audit log)
  const { data: targetMembership, error: targetError }: any = await supabase
    .from('memberships')
    .select('id, member_status, status_reason')
    .eq('user_id', target_user_id)
    .eq('org_id', org_id)
    .maybeSingle()

  if (targetError) {
    if (targetError?.code === '42501') {
      authViolation()
    }
    console.error('Error fetching target membership:', targetError)
    operationFailed()
  }

  if (!targetMembership) {
    return { success: false, error: 'Narys nerastas' }
  }

  // Step 4: Prepare old and new values for audit log
  const oldValue = {
    member_status: targetMembership.member_status || null,
    status_reason: targetMembership.status_reason || null,
  }

  const newValue = {
    member_status: new_status,
    status_reason: reason.trim(),
  }

  // Step 5: UPDATE memberships
  const { data: updatedRows, error: updateError }: any = await supabase
    .from('memberships')
    .update({
      member_status: new_status,
      status_reason: reason.trim(),
    })
    .eq('user_id', target_user_id)
    .eq('org_id', org_id)
    .select('id')

  if (updateError) {
    if (updateError?.code === '42501') {
      authViolation()
    }
    console.error('Error updating member status:', updateError)
    operationFailed()
  }

  // Step 6: Check if RLS blocked the update (zero rows returned)
  if (!updatedRows || updatedRows.length === 0) {
    console.error('RLS blocked member status update:', {
      org_id,
      target_user_id,
      new_status,
    })
    return { success: false, error: 'Atnaujinimas buvo blokuotas. Patikrinkite prieigą.' }
  }

  // Step 7: INSERT audit_logs
  const { error: auditError }: any = await supabase
    .from('audit_logs')
    .insert({
      org_id: org_id,
      user_id: user.id,
      action: 'MEMBER_STATUS_CHANGE',
      target_table: 'memberships',
      target_id: targetMembership.id, // membership.id, not user_id
      old_value: oldValue,
      new_value: newValue,
    })

  if (auditError) {
    // Log error but don't fail the operation (audit is secondary)
    console.error('Error inserting audit log:', auditError)
    // Continue - status update succeeded even if audit log failed
  }

  // Step 8: Revalidate members page
  revalidatePath('/dashboard/members')

  return { success: true }
}

