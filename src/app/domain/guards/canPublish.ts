'use server'

import { createClient } from '@/lib/supabase/server'
import { MEMBERSHIP_STATUS, MEMBERSHIP_ROLE } from '@/app/domain/constants'
import { authViolation, accessDenied, DomainError } from '@/app/domain/errors'
import { isPlatformAdmin } from '@/app/actions/admin'

/**
 * Publishing Authorization Guard (v2 AUTHZ)
 * 
 * Determines if user can publish/edit/delete content.
 * 
 * Allowed if:
 * - membership.member_status == 'ACTIVE' AND (
 *     membership.role == 'OWNER'
 *     OR EXISTS active position in `positions` where:
 *        org_id == orgId
 *        user_id == auth.uid()
 *        is_active == true
 *        title IN ('Pirmininkas', 'Chairman')
 *   )
 * 
 * Otherwise denies with explicit error `access_denied`.
 * 
 * @param orgId - Organization ID
 * @returns true if user can publish, false otherwise
 * @throws Error('auth_violation') if user is not authenticated
 * @throws Error('access_denied') if user does not have publishing permissions
 */
export async function canPublish(orgId: string): Promise<boolean> {
  const supabase = await createClient()

  // Step 1: Require authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    authViolation()
  }

  // Step 1.5: Check if this is branduolys org - only super admins can publish
  const { data: org, error: orgError }: any = await supabase
    .from('orgs')
    .select('slug')
    .eq('id', orgId)
    .maybeSingle()

  if (orgError) {
    console.error('Error fetching org for canPublish:', orgError)
    accessDenied()
  }

  // If this is branduolys org, only super admins can publish
  if (org && (org.slug === 'branduolys' || org.slug === 'platform')) {
    const isAdmin = await isPlatformAdmin()
    if (!isAdmin) {
      accessDenied()
    }
    return true // Super admin can publish in branduolys
  }

  // Step 2: Check for ACTIVE membership
  // CRITICAL: Use member_status (not status) per schema fix
  const { data: membership, error: membershipError }: any = await supabase
    .from('memberships')
    .select('id, role, member_status')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .eq('member_status', MEMBERSHIP_STATUS.ACTIVE)
    .maybeSingle()

  if (membershipError) {
    if (membershipError?.code === '42501') {
      authViolation()
    }
    console.error('Error fetching membership for canPublish:', membershipError)
    accessDenied()
  }

  // Step 3: If no ACTIVE membership, deny
  if (!membership) {
    accessDenied()
  }

  // Step 4: Check if user is OWNER
  if (membership.role === MEMBERSHIP_ROLE.OWNER) {
    return true
  }

  // Step 5: Check for active Chairman position
  const { data: position, error: positionError }: any = await supabase
    .from('positions')
    .select('id, title, is_active')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .in('title', ['Pirmininkas', 'Chairman'])
    .maybeSingle()

  if (positionError) {
    if (positionError?.code === '42501') {
      authViolation()
    }
    console.error('Error fetching position for canPublish:', positionError)
    accessDenied()
  }

  // Step 6: If active Chairman position exists, allow
  if (position && position.is_active) {
    return true
  }

  // Step 7: Otherwise, deny
  accessDenied()
}

/**
 * Check if user can publish (non-throwing version)
 * 
 * Returns boolean instead of throwing error.
 * Useful for UI to disable buttons.
 * 
 * @param orgId - Organization ID
 * @returns true if user can publish, false otherwise
 */
export async function checkCanPublish(orgId: string): Promise<boolean> {
  try {
    await canPublish(orgId)
    return true
  } catch (error: any) {
    if (error instanceof DomainError) {
      if (error.code === 'access_denied' || error.code === 'auth_violation') {
        return false
      }
    }
    // Re-throw unexpected errors
    throw error
  }
}

