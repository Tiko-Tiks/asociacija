'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation } from '@/app/domain/errors'
import { MEMBERSHIP_ROLE } from '@/app/domain/constants'
import { getOrgActivationStatus } from '@/app/domain/guards/orgActivation'
import { getRequiredConsents } from './consents'

/**
 * Onboarding Status Check (B3.2)
 * 
 * Determines which step of onboarding the user should be on.
 * Only for OWNER/Chairman.
 */

export interface OnboardingStatus {
  orgId: string
  orgName: string
  membershipId: string
  currentStep: 1 | 2 | 3 | null // null = already active, no onboarding needed
  step1Complete: boolean // Governance submitted
  step2Complete: boolean // All consents accepted
  step3Complete: boolean // Platformos approved (org is ACTIVE)
  activationStatus: {
    status: string | null
    hasActiveRuleset: boolean
    isActive: boolean
  }
  missingConsents: string[]
}

/**
 * Get onboarding status for current user
 * 
 * @returns Onboarding status or null if user is not OWNER or org is already active
 */
export async function getOnboardingStatus(): Promise<OnboardingStatus | null> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Step 1: Get user's orgs
  // CRITICAL: Use member_status (not status) per schema fix
  const { data: memberships, error: membershipsError }: any = await supabase
    .from('memberships')
    .select('id, org_id, role')
    .eq('user_id', user.id)
    .eq('member_status', 'ACTIVE')

  if (membershipsError) {
    if (membershipsError?.code === '42501') {
      authViolation()
    }
    console.error('Error fetching memberships:', membershipsError)
    return null
  }

  if (!memberships || memberships.length === 0) {
    return null
  }

  // Step 2: Find OWNER membership
  // NOTE: After schema fix, user should have OWNER role in only ONE org
  // (partial unique index enforces 1 OWNER per org)
  const ownerMembership = memberships.find((m: any) => m.role === MEMBERSHIP_ROLE.OWNER)
  if (!ownerMembership) {
    return null
  }
  
  // If multiple OWNER memberships found, log warning (should not happen due to unique index)
  const ownerCount = memberships.filter((m: any) => m.role === MEMBERSHIP_ROLE.OWNER).length
  if (ownerCount > 1) {
    console.warn('AUDIT WARNING: User has OWNER role in multiple orgs:', {
      userId: user.id,
      ownerCount,
      orgIds: memberships.filter((m: any) => m.role === MEMBERSHIP_ROLE.OWNER).map((m: any) => m.org_id),
    })
  }

  const orgId = ownerMembership.org_id

  // Step 2.5: Get org name
  const { data: org }: any = await supabase
    .from('orgs')
    .select('name')
    .eq('id', orgId)
    .single()

  const orgName = org?.name || 'Bendruomenė'

  // Step 3: Check activation status
  const activationStatus = await getOrgActivationStatus(orgId)

  // DEBUG: Log activation status for troubleshooting
  console.log('ONBOARDING_STATUS_DEBUG:', {
    orgId,
    orgName,
    activationStatus,
    userId: user.id,
  })

  // CRITICAL: If org is ACTIVE but has no active ruleset, still show onboarding
  // This handles the case where org was manually set to ACTIVE without completing onboarding
  // If org is ACTIVE AND has active ruleset, then onboarding is complete
  if (activationStatus.isActive && activationStatus.hasActiveRuleset) {
    console.log('ONBOARDING_SKIP: Org is fully active (ACTIVE + ruleset), redirecting to dashboard', { orgId })
    return {
      orgId,
      orgName,
      membershipId: ownerMembership.id,
      currentStep: null,
      step1Complete: true,
      step2Complete: true,
      step3Complete: true,
      activationStatus,
      missingConsents: [],
    }
  }

  // If org status is ACTIVE but no ruleset, allow onboarding to complete it
  if (activationStatus.status === 'ACTIVE' && !activationStatus.hasActiveRuleset) {
    console.log('ONBOARDING_CONTINUE: Org status is ACTIVE but no ruleset, allowing onboarding to complete', {
      orgId,
      orgStatus: activationStatus.status,
      hasActiveRuleset: activationStatus.hasActiveRuleset,
    })
  }

  // Step 4: Check if governance answers submitted (step 1)
  const { data: governanceConfig, error: governanceError }: any = await supabase
    .from('governance_configs')
    .select('id, answers')
    .eq('org_id', orgId)
    .maybeSingle()

  if (governanceError && governanceError.code !== 'PGRST116') {
    console.error('Error checking governance config:', governanceError)
  }

  // Check if board members are required and assigned
  let boardMembersRequired = false
  let boardMembersAssigned = true
  
  if (governanceConfig?.answers) {
    const answers = governanceConfig.answers
    const governingBodyType = answers.governing_body_type
    const boardMemberCount = answers.board_member_count
    
    // Only require board members if organization has a governing body (not 'nera')
    if (governingBodyType && governingBodyType !== 'nera' && boardMemberCount && boardMemberCount > 0) {
      boardMembersRequired = true
      
      // Check if board members have been assigned
      const { data: boardAssignments } = await supabase
        .from('board_member_assignments')
        .select('id')
        .eq('org_id', orgId)
        .eq('is_active', true)
      
      // If table doesn't exist, check positions table
      if (!boardAssignments) {
        const { data: positions } = await supabase
          .from('positions')
          .select('id')
          .eq('org_id', orgId)
          .eq('is_active', true)
          .ilike('title', '%BOARD%')
        
        boardMembersAssigned = (positions?.length || 0) >= boardMemberCount
      } else {
        boardMembersAssigned = (boardAssignments?.length || 0) >= boardMemberCount
      }
    }
  }

  // Step 1 is complete only if governance is submitted AND board members are assigned (if required)
  const step1Complete = !!governanceConfig && (!boardMembersRequired || boardMembersAssigned)
  
  // DEBUG: Log step 1 status
  console.log('ONBOARDING_STEP1_DEBUG:', {
    orgId,
    step1Complete,
    governanceConfigId: governanceConfig?.id,
    governanceError: governanceError?.code,
    boardMembersRequired,
    boardMembersAssigned,
  })

  // Step 5: Check consents (step 2)
  const { missing } = await getRequiredConsents(orgId, user.id)
  const step2Complete = missing.length === 0

  // DEBUG: Log step 2 status
  console.log('ONBOARDING_STEP2_DEBUG:', {
    orgId,
    step2Complete,
    missingConsents: missing,
  })

  // Step 6: Check if PROPOSED ruleset exists (needed for step 3)
  const { data: proposedRuleset }: any = await supabase
    .from('org_rulesets')
    .select('id')
    .eq('org_id', orgId)
    .eq('status', 'PROPOSED')
    .maybeSingle()

  const hasProposedRuleset = !!proposedRuleset

  // Step 7: Determine current step
  let currentStep: 1 | 2 | 3 | null = null

  if (!step1Complete) {
    currentStep = 1
  } else if (!step2Complete) {
    currentStep = 2
  } else if (hasProposedRuleset && !activationStatus.hasActiveRuleset) {
    // Step 1 and 2 complete, PROPOSED ruleset exists, but no ACTIVE ruleset yet
    // This means waiting for Platformos approval
    currentStep = 3
  } else if (activationStatus.status === 'ACTIVE' && !activationStatus.hasActiveRuleset) {
    // Org is ACTIVE but no ruleset - this is an inconsistent state
    // Allow user to continue onboarding to fix it
    // If governance and consents are complete, show step 3 (waiting for admin to activate ruleset)
    if (step1Complete && step2Complete) {
      currentStep = 3
    } else if (!step1Complete) {
      currentStep = 1
    } else {
      currentStep = 2
    }
  } else {
    // All steps complete or inconsistent state - should redirect
    currentStep = null
  }

  // DEBUG: Log final status
  console.log('ONBOARDING_FINAL_STATUS:', {
    orgId,
    currentStep,
    step1Complete,
    step2Complete,
    step3Complete: activationStatus.isActive,
    activationStatus,
  })

  return {
    orgId,
    orgName,
    membershipId: ownerMembership.id,
    currentStep,
    step1Complete,
    step2Complete,
    step3Complete: activationStatus.isActive,
    activationStatus,
    missingConsents: missing,
  }
}

