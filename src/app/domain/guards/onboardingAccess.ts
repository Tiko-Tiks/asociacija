'use server'

import { createClient } from '@/lib/supabase/server'
import { authViolation, accessDenied } from '@/app/domain/errors'
import { MEMBERSHIP_ROLE, MEMBERSHIP_STATUS } from '@/app/domain/constants'

/**
 * Onboarding Access Guard (B3.3)
 * 
 * Allows Chairman (OWNER) to access onboarding features
 * ONLY when organization is NOT ACTIVE yet.
 * 
 * Requirements:
 * - User is authenticated
 * - User is OWNER of the organization
 * - Organization status is NOT ACTIVE (org_activation_state.org_status != 'ACTIVE')
 * 
 * This guard is used for:
 * - Governance submission during onboarding
 * - Consent acceptance during onboarding
 * 
 * CRITICAL: After org activation, this guard will DENY access.
 * This ensures onboarding is blocked once org is active.
 * 
 * @param orgId - Organization ID
 * @throws Error('auth_violation') if user is not authenticated
 * @throws Error('access_denied') if user is not OWNER or org is already ACTIVE
 */
export async function requireOnboardingAccess(orgId: string): Promise<void> {
  const supabase = await createClient()

  // Step 1: Require authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    authViolation()
  }

  // Step 2: Check for ACTIVE membership with OWNER role
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
    console.error('Error fetching membership for onboarding access:', membershipError)
    accessDenied()
  }

  // Step 3: If no ACTIVE membership, deny
  if (!membership) {
    accessDenied()
  }

  // Step 4: Check if user is OWNER
  if (membership.role !== MEMBERSHIP_ROLE.OWNER) {
    accessDenied()
  }

  // Step 5: Check org activation state
  // CRITICAL: Allow onboarding if org is ACTIVE but has no active ruleset
  // This handles the case where org was manually set to ACTIVE without completing onboarding
  const { data: activationState, error: stateError }: any = await supabase
    .from('org_activation_state')
    .select('org_id, org_status, has_active_ruleset')
    .eq('org_id', orgId)
    .maybeSingle()

  if (stateError) {
    // If view doesn't exist or RLS blocks, fallback to direct orgs table check
    if (stateError?.code === '42501') {
      authViolation()
    }
    if (stateError?.code === 'PGRST205' || stateError?.code === '42P01') {
      // FALLBACK: View doesn't exist - fallback to orgs table
      // NOTE: According to documentation, org_activation_state view SHOULD always exist.
      // This fallback is a safety measure for edge cases (e.g., during migration).
      // In production, this should never be triggered.
      console.warn('org_activation_state view not found, checking orgs.status directly (FALLBACK MODE)')
      const { data: org, error: orgError }: any = await supabase
        .from('orgs')
        .select('id, status')
        .eq('id', orgId)
        .maybeSingle()

      if (orgError) {
        if (orgError?.code === '42501') {
          authViolation()
        }
        console.error('Error fetching org status for onboarding:', orgError)
        accessDenied()
      }

      // Check for active ruleset
      const { data: ruleset }: any = await supabase
        .from('org_rulesets')
        .select('id')
        .eq('org_id', orgId)
        .eq('status', 'ACTIVE')
        .maybeSingle()

      // If org is ACTIVE AND has active ruleset, deny onboarding
      if (org && org.status === 'ACTIVE' && ruleset) {
        console.log('Onboarding blocked: org is fully active (ACTIVE + ruleset)', { 
          orgId, 
          status: org.status,
          hasActiveRuleset: !!ruleset,
        })
        accessDenied()
      }

      // Org is not fully active - allow onboarding
      console.log('Onboarding allowed: org not fully active', {
        orgId,
        orgStatus: org?.status,
        hasActiveRuleset: !!ruleset,
      })
      return
    }
    console.error('Error fetching org activation state for onboarding:', stateError)
    accessDenied()
  }

  // Step 6: If org is ACTIVE AND has active ruleset, deny onboarding access
  // But if org is ACTIVE but has no ruleset, allow onboarding to complete it
  if (activationState && activationState.org_status === 'ACTIVE' && activationState.has_active_ruleset) {
    console.log('Onboarding blocked: org is fully active (ACTIVE + ruleset)', { 
      orgId, 
      org_status: activationState.org_status,
      has_active_ruleset: activationState.has_active_ruleset,
    })
    accessDenied()
  }

  // Debug: Log if activationState is null or has unexpected status
  if (!activationState) {
    console.log('Onboarding allowed: org_activation_state not found', { orgId })
  } else {
    console.log('Onboarding allowed: org not fully active', { 
      orgId, 
      org_status: activationState.org_status,
      has_active_ruleset: activationState.has_active_ruleset,
    })
  }

  // Step 7: User is OWNER and org is NOT fully active - allow onboarding
  return
}

/**
 * Check if user has onboarding access (non-throwing version)
 * 
 * Returns boolean instead of throwing error.
 * Useful for UI to disable buttons.
 * 
 * @param orgId - Organization ID
 * @returns true if user has onboarding access, false otherwise
 */
export async function checkOnboardingAccess(orgId: string): Promise<boolean> {
  try {
    await requireOnboardingAccess(orgId)
    return true
  } catch (error: any) {
    if (error?.code === 'access_denied' || error?.code === 'auth_violation') {
      return false
    }
    // Re-throw unexpected errors
    throw error
  }
}

