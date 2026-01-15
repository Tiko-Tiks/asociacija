'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from './_guards'
import { authViolation } from '@/app/domain/errors'
import { logAudit } from '@/app/utils/audit'
import { getCurrentUser } from './auth'

/**
 * ============================================================================
 * V2 – GOVERNANCE-LOCKED, DO NOT AUTO-MODIFY
 * ============================================================================
 * 
 * This module implements V2 pre-onboarding governance submission with governance guarantees.
 * Any automation here breaks legal guarantees.
 * 
 * V2 Pre-Onboarding Governance Submission
 * 
 * STRICTLY FORBIDDEN:
 * - Creating governance_configs
 * - Creating org_rulesets
 * - Creating positions
 * - Calling submit_org_for_review()
 * 
 * ONLY writes to:
 * - orgs.metadata.governance.proposed.*
 * - orgs.status = 'SUBMITTED_FOR_REVIEW'
 * 
 * STATUS: FROZEN - No modifications without governance approval
 * ============================================================================
 */

export interface GovernanceAnswers {
  [key: string]: string | number | boolean
}

export interface BoardMember {
  full_name: string
  email?: string
  term_start?: string
  term_end?: string
}

export interface PreOnboardingGovernanceSubmission {
  answers: GovernanceAnswers
  boardMembers?: BoardMember[]
  aiReviewed?: boolean
}

/**
 * Submit governance answers for V2 pre-onboarding
 * 
 * @param orgSlug - Organization slug
 * @param submission - Governance answers and board members
 * @returns Success status
 */
export async function submitPreOnboardingGovernance(
  orgSlug: string,
  submission: PreOnboardingGovernanceSubmission
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  const adminSupabase = createAdminClient()

  try {
    // Step 1: Validate access - HARD RULES
    const { data: org, error: orgError } = await supabase
      .from('orgs')
      .select('id, name, slug, status, metadata')
      .eq('slug', orgSlug)
      .maybeSingle()

    if (orgError || !org) {
      return { success: false, error: 'Bendruomenė nerasta' }
    }

    // HARD RULE 1: org.status MUST be 'ONBOARDING'
    if (org.status !== 'ONBOARDING') {
      await logAccessBlocked(org.id, user.id, 'invalid_status')
      return { success: false, error: 'Bendruomenė neturi teisingo statuso' }
    }

    // HARD RULE 2: org.metadata.fact.pre_org MUST be true
    const isPreOrg = org.metadata?.fact?.pre_org === true
    if (!isPreOrg) {
      await logAccessBlocked(org.id, user.id, 'not_pre_org')
      return { success: false, error: 'Bendruomenė nėra PRE_ORG' }
    }

    // HARD RULE 3: current user MUST be OWNER of org
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('id, role, member_status')
      .eq('org_id', org.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (membershipError || !membership) {
      await logAccessBlocked(org.id, user.id, 'not_member')
      return { success: false, error: 'Neturite narystės šioje bendruomenėje' }
    }

    if (membership.role !== 'OWNER') {
      await logAccessBlocked(org.id, user.id, 'not_owner')
      return { success: false, error: 'Tik pirmininkas (OWNER) gali pateikti valdymo atsakymus' }
    }

    // Step 2: Prepare metadata update
    // Get existing metadata or create new
    const existingMetadata = org.metadata || {}
    
    // Build governance.proposed object
    const governanceProposed: Record<string, any> = {}
    
    // Store all answers under governance.proposed.*
    Object.entries(submission.answers).forEach(([key, value]) => {
      governanceProposed[key] = value
    })

    // Store board members if provided
    if (submission.boardMembers && submission.boardMembers.length > 0) {
      governanceProposed.board_members = submission.boardMembers.map(member => ({
        full_name: member.full_name,
        email: member.email || null,
        term_start: member.term_start || null,
        term_end: member.term_end || null,
      }))
    }

    // Update metadata
    const updatedMetadata = {
      ...existingMetadata,
      governance: {
        ...existingMetadata.governance,
        proposed: governanceProposed,
      },
      // Preserve existing fact and ai namespaces
      fact: existingMetadata.fact || {},
      ai: existingMetadata.ai || {},
    }

    // Step 3: Update org with new metadata and status
    // NOTE: Using 'SUBMITTED_FOR_REVIEW' as 'READY_FOR_APPROVAL' is not in the enum
    // If 'READY_FOR_APPROVAL' is needed, a schema migration would be required
    const { error: updateError } = await adminSupabase
      .from('orgs')
      .update({
        metadata: updatedMetadata,
        status: 'SUBMITTED_FOR_REVIEW', // Status transition (closest match to READY_FOR_APPROVAL)
      })
      .eq('id', org.id)

    if (updateError) {
      console.error('Error updating org:', updateError)
      return { success: false, error: 'Nepavyko išsaugoti valdymo atsakymų' }
    }

    // Step 4: Audit logging
    const auditMetadata: Record<string, any> = {
      fact: {
        source: 'pre_onboarding_v2',
      },
    }

    if (submission.aiReviewed) {
      auditMetadata.fact.ai_reviewed = true
    }

    await logAudit(adminSupabase, {
      orgId: org.id,
      userId: user.id,
      action: 'GOVERNANCE_PROPOSED',
      targetTable: 'orgs',
      targetId: org.id,
      metadata: auditMetadata,
    })

    return { success: true }
  } catch (error: any) {
    console.error('Error submitting pre-onboarding governance:', error)
    return { 
      success: false, 
      error: error?.message || 'Įvyko netikėta klaida' 
    }
  }
}

/**
 * Get existing proposed governance answers (for editing)
 */
export async function getPreOnboardingGovernance(
  orgSlug: string
): Promise<{
  success: boolean
  answers?: GovernanceAnswers
  boardMembers?: BoardMember[]
  error?: string
}> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  try {
    // Validate access
    const { data: org, error: orgError } = await supabase
      .from('orgs')
      .select('id, status, metadata')
      .eq('slug', orgSlug)
      .maybeSingle()

    if (orgError || !org) {
      return { success: false, error: 'Bendruomenė nerasta' }
    }

    if (org.status !== 'ONBOARDING' || org.metadata?.fact?.pre_org !== true) {
      return { success: false, error: 'Netinkamas bendruomenės statusas' }
    }

    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('org_id', org.id)
      .eq('user_id', user.id)
      .eq('role', 'OWNER')
      .maybeSingle()

    if (!membership) {
      return { success: false, error: 'Neturite teisių' }
    }

    // Extract proposed governance from metadata
    const proposed = org.metadata?.governance?.proposed || {}
    const boardMembers = proposed.board_members || []

    // Remove board_members from answers (it's separate)
    const { board_members, ...answers } = proposed

    return {
      success: true,
      answers: answers as GovernanceAnswers,
      boardMembers: boardMembers as BoardMember[],
    }
  } catch (error: any) {
    console.error('Error fetching pre-onboarding governance:', error)
    return { success: false, error: error?.message || 'Įvyko netikėta klaida' }
  }
}

async function logAccessBlocked(orgId: string, userId: string, reason: string) {
  try {
    const adminSupabase = createAdminClient()
    await logAudit(adminSupabase, {
      orgId,
      userId,
      action: 'PRE_ORG_ACCESS_BLOCKED',
      targetTable: 'orgs',
      targetId: orgId,
      metadata: {
        fact: {
          entrypoint: 'pre_onboarding',
          reason,
        },
      },
    })
  } catch (error) {
    console.error('AUDIT INCIDENT: Failed to log PRE_ORG_ACCESS_BLOCKED:', error)
  }
}
