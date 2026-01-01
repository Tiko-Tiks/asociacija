'use server'

import { createClient } from '@/lib/supabase/server'
import { authViolation, accessDenied } from '@/app/domain/errors'

/**
 * Organization Activation Guard (B3.1.2)
 * 
 * CRITICAL: Blocks all operational features unless:
 * - org.org_status === 'ACTIVE' (from org_activation_state view)
 * - org has ACTIVE ruleset (has_active_ruleset = true)
 * 
 * Uses org_activation_state view which provides:
 * - org_id
 * - org_status (PENDING | ACTIVE | SUSPENDED)
 * - has_active_ruleset (boolean)
 * 
 * This guard MUST be used in:
 * - Projects
 * - Invoices
 * - Members
 * - Resolutions
 * - Events
 * 
 * @param orgId - Organization ID
 * @throws Error('auth_violation') if user is not authenticated
 * @throws Error('access_denied') if org is not active
 */
export async function requireOrgActive(orgId: string): Promise<void> {
  const supabase = await createClient()

  // Step 1: Require authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    authViolation()
  }

  // Step 2: Fetch org activation state from view
  const { data: activationState, error: stateError }: any = await supabase
    .from('org_activation_state')
    .select('org_id, org_status, has_active_ruleset')
    .eq('org_id', orgId)
    .maybeSingle()

  if (stateError) {
    if (stateError?.code === '42501') {
      authViolation()
    }
    console.error('Error fetching org activation state:', stateError)
    accessDenied()
  }

  // Step 3: If no activation state found, deny
  if (!activationState) {
    accessDenied()
  }

  // Step 4: Check if org is ACTIVE
  if (activationState.org_status !== 'ACTIVE') {
    accessDenied()
  }

  // Step 5: Check if org has active ruleset
  if (!activationState.has_active_ruleset) {
    accessDenied()
  }

  // Step 6: Org is active and has ruleset - allow
  return
}

/**
 * Check if org is active (non-throwing version)
 * 
 * Returns boolean instead of throwing error.
 * Useful for UI to disable buttons.
 * 
 * @param orgId - Organization ID
 * @returns true if org is active, false otherwise
 */
export async function checkOrgActive(orgId: string): Promise<boolean> {
  try {
    await requireOrgActive(orgId)
    return true
  } catch (error: any) {
    if (error?.code === 'access_denied' || error?.code === 'auth_violation') {
      return false
    }
    // Re-throw unexpected errors
    throw error
  }
}

/**
 * Get org activation status (for UI display)
 * 
 * @param orgId - Organization ID
 * @returns Activation status info
 */
export async function getOrgActivationStatus(orgId: string): Promise<{
  status: string | null
  hasActiveRuleset: boolean
  isActive: boolean
}> {
  const supabase = await createClient()

  // DEBUG: Log activation status check
  console.log('ORG_ACTIVATION_STATUS_CHECK:', { orgId })

  // Fetch from org_activation_state view
  const { data: activationState, error }: any = await supabase
    .from('org_activation_state')
    .select('org_id, org_status, has_active_ruleset')
    .eq('org_id', orgId)
    .maybeSingle()

  if (error) {
    // FALLBACK: If view doesn't exist, fallback to direct orgs table check
    // NOTE: According to documentation, org_activation_state view SHOULD always exist.
    // This fallback is a safety measure for edge cases (e.g., during migration).
    // In production, this should never be triggered.
    if (error?.code === 'PGRST205' || error?.code === '42P01') {
      console.warn('org_activation_state view not found, checking orgs.status directly (FALLBACK MODE)', { orgId })
      
      // Check orgs table directly
      const { data: org, error: orgError }: any = await supabase
        .from('orgs')
        .select('id, status')
        .eq('id', orgId)
        .maybeSingle()

      if (orgError) {
        console.error('Error fetching org status:', orgError)
        return {
          status: null,
          hasActiveRuleset: false,
          isActive: false,
        }
      }

      // Check for active ruleset (if org_rulesets table exists)
      const { data: ruleset, error: rulesetError }: any = await supabase
        .from('org_rulesets')
        .select('id, status')
        .eq('org_id', orgId)
        .eq('status', 'ACTIVE')
        .maybeSingle()

      if (rulesetError && rulesetError.code !== 'PGRST116') {
        console.error('Error fetching ruleset:', rulesetError)
      }

      const hasActiveRuleset = !!ruleset
      const isActive = org?.status === 'ACTIVE' && hasActiveRuleset

      // DEBUG: Log fallback result
      console.log('ORG_ACTIVATION_STATUS_FALLBACK:', {
        orgId,
        orgStatus: org?.status,
        hasActiveRuleset,
        isActive,
        rulesetId: ruleset?.id,
      })

      return {
        status: org?.status || null,
        hasActiveRuleset,
        isActive,
      }
    }

    console.error('Error fetching org activation status:', error)
    return {
      status: null,
      hasActiveRuleset: false,
      isActive: false,
    }
  }

  if (!activationState) {
    // FALLBACK: If view returns null, fallback to orgs table check
    // NOTE: According to documentation, org_activation_state view SHOULD always return data.
    // This fallback is a safety measure for edge cases.
    // In production, this should never be triggered.
    console.warn('org_activation_state returned null, checking orgs table directly (FALLBACK MODE)', { orgId })
    
    const { data: org }: any = await supabase
      .from('orgs')
      .select('id, status')
      .eq('id', orgId)
      .maybeSingle()

    if (org) {
      const { data: ruleset }: any = await supabase
        .from('org_rulesets')
        .select('id')
        .eq('org_id', orgId)
        .eq('status', 'ACTIVE')
        .maybeSingle()

      const result = {
        status: org.status || null,
        hasActiveRuleset: !!ruleset,
        isActive: org.status === 'ACTIVE' && !!ruleset,
      }

      // DEBUG: Log fallback result
      console.log('ORG_ACTIVATION_STATUS_NULL_FALLBACK:', {
        orgId,
        ...result,
      })

      return result
    }

    return {
      status: null,
      hasActiveRuleset: false,
      isActive: false,
    }
  }

  const result = {
    status: activationState.org_status,
    hasActiveRuleset: activationState.has_active_ruleset || false,
    isActive: activationState.org_status === 'ACTIVE' && activationState.has_active_ruleset,
  }

  // DEBUG: Log view result
  console.log('ORG_ACTIVATION_STATUS_VIEW:', {
    orgId,
    ...result,
    viewData: activationState,
  })

  return result
}

