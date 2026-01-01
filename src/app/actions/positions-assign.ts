'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'
import { MEMBERSHIP_ROLE, MEMBERSHIP_STATUS } from '@/app/domain/constants'
import { revalidatePath } from 'next/cache'

/**
 * Server Action to assign a position to a member.
 * 
 * Schema v17.0: positions table
 * - org_id: UUID (foreign key to orgs)
 * - user_id: UUID (foreign key to profiles)
 * - title: string (position title)
 * - start_date: date (required)
 * - end_date: date (optional, nullable)
 * - is_active: boolean (default true)
 * 
 * Rules:
 * - OWNER role only
 * - Multiple positions allowed per user
 * - Requires start_date
 * - end_date is optional
 * - Logs to audit_logs
 * 
 * @param org_id - Organization ID
 * @param target_user_id - User ID to assign position to
 * @param title - Position title
 * @param start_date - Start date (ISO string)
 * @param end_date - End date (ISO string, optional)
 * @returns Success indicator
 * @throws Error('auth_violation') if not OWNER
 * @throws Error('operation_failed') if insert fails
 */
export async function assignPosition(
  org_id: string,
  target_user_id: string,
  title: string,
  start_date: string,
  end_date?: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Validate inputs
  if (!title || title.trim().length === 0) {
    return { success: false, error: 'Pareigų pavadinimas yra privalomas' }
  }

  if (!start_date) {
    return { success: false, error: 'Pradžios data yra privaloma' }
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
    return { success: false, error: 'Tik OWNER gali priskirti pareigas' }
  }

  // Step 2: Verify target user exists in the org
  const { data: targetMembership, error: targetError }: any = await supabase
    .from('memberships')
    .select('id')
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
    return { success: false, error: 'Narys nerastas šioje organizacijoje' }
  }

  // Step 3: Prepare position data
  const positionData: any = {
    org_id: org_id,
    user_id: target_user_id,
    title: title.trim(),
    start_date: start_date,
    is_active: true,
  }

  // Add end_date only if provided
  if (end_date && end_date.trim().length > 0) {
    positionData.end_date = end_date
  }

  // Step 4: INSERT into positions
  const { data: insertedPosition, error: insertError }: any = await supabase
    .from('positions')
    .insert(positionData)
    .select('id, title, start_date, end_date, is_active')

  if (insertError) {
    if (insertError?.code === '42501') {
      authViolation()
    }
    console.error('Error inserting position:', insertError)
    operationFailed()
  }

  if (!insertedPosition || insertedPosition.length === 0) {
    return { success: false, error: 'Nepavyko sukurti pareigų įrašo' }
  }

  const newPosition = insertedPosition[0]

  // Step 5: INSERT audit_logs
  const newValue = {
    id: newPosition.id,
    org_id: org_id,
    user_id: target_user_id,
    title: newPosition.title,
    start_date: newPosition.start_date,
    end_date: newPosition.end_date || null,
    is_active: newPosition.is_active,
  }

  const { error: auditError }: any = await supabase
    .from('audit_logs')
    .insert({
      org_id: org_id,
      user_id: user.id,
      action: 'POSITION_ASSIGNED',
      target_table: 'positions',
      target_id: newPosition.id,
      old_value: null, // New position, no old value
      new_value: newValue,
    })

  if (auditError) {
    // Log error but don't fail the operation (audit is secondary)
    console.error('Error inserting audit log:', auditError)
    // Continue - position assignment succeeded even if audit log failed
  }

  // Step 6: Revalidate members page
  revalidatePath('/dashboard/members')

  return { success: true }
}

