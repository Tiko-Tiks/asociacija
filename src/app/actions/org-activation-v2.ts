'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from './_guards'
import { logAudit } from '@/app/utils/audit'
import { RESOLUTION_STATUS } from '@/app/domain/constants'
import { getPreOnboardingReadiness } from './pre-onboarding-readiness'

/**
 * ============================================================================
 * V2 – GOVERNANCE-LOCKED, DO NOT AUTO-MODIFY
 * ============================================================================
 * 
 * This module implements V2 organization activation with governance guarantees.
 * Any automation here breaks legal guarantees.
 * 
 * V2 Organization Activation
 * 
 * STRICTLY FORBIDDEN:
 * - Auto-activation
 * - Activation without resolution
 * - Partial activation (no metadata move)
 * 
 * Preconditions (HARD):
 * - org.status MUST be 'SUBMITTED_FOR_REVIEW'
 * - org.metadata.fact.pre_org MUST be true
 * - All readiness checks PASS
 * - resolution_id MUST exist and be APPROVED
 * 
 * STATUS: FROZEN - No modifications without governance approval
 * ============================================================================
 */

/**
 * Activate organization V2
 * 
 * @param orgId - Organization ID
 * @param resolutionId - Resolution ID (must be APPROVED)
 * @returns Success status
 */
export async function activateOrganizationV2(
  orgId: string,
  resolutionId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const user = await requireAuth(supabase)

  try {
    // Step 1: Validate resolution exists and is APPROVED
    const { data: resolution, error: resolutionError } = await supabase
      .from('resolutions')
      .select('id, status, org_id')
      .eq('id', resolutionId)
      .maybeSingle()

    if (resolutionError || !resolution) {
      return { success: false, error: 'Sprendimas nerastas' }
    }

    if (resolution.status !== RESOLUTION_STATUS.APPROVED) {
      return { 
        success: false, 
        error: `Sprendimas nėra patvirtintas. Dabartinis statusas: ${resolution.status}` 
      }
    }

    // Step 2: Get org details
    const { data: org, error: orgError } = await supabase
      .from('orgs')
      .select('id, name, slug, status, metadata')
      .eq('id', orgId)
      .maybeSingle()

    if (orgError || !org) {
      return { success: false, error: 'Bendruomenė nerasta' }
    }

    // HARD PRECONDITION 1: org.status MUST be 'SUBMITTED_FOR_REVIEW'
    if (org.status !== 'SUBMITTED_FOR_REVIEW') {
      return { 
        success: false, 
        error: `Netinkamas bendruomenės statusas. Reikia: SUBMITTED_FOR_REVIEW, gauta: ${org.status}` 
      }
    }

    // HARD PRECONDITION 2: org.metadata.fact.pre_org MUST be true
    const isPreOrg = org.metadata?.fact?.pre_org === true
    if (!isPreOrg) {
      return { success: false, error: 'Bendruomenė nėra PRE_ORG' }
    }

    // HARD PRECONDITION 3: All readiness checks MUST PASS
    const readinessResult = await getPreOnboardingReadiness(org.slug || '')
    if (!readinessResult.success || !readinessResult.allReady) {
      return { 
        success: false, 
        error: 'Ne visi readiness patikros praėjo. Prašome patikrinti readiness sąrašą.' 
      }
    }

    // Step 3: Move metadata from governance.proposed to governance.*
    // CRITICAL: This must be atomic - no partial activation allowed
    const existingMetadata = org.metadata || {}
    const governanceProposed = existingMetadata.governance?.proposed || {}
    
    if (Object.keys(governanceProposed).length === 0) {
      return { 
        success: false, 
        error: 'Nėra governance.proposed duomenų, kuriuos būtų galima perkelti' 
      }
    }

    // Build new metadata structure
    // Copy all keys from governance.proposed to governance.* root level
    // Preserve existing governance keys that are not in proposed
    const existingGovernance = existingMetadata.governance || {}
    const updatedGovernance = {
      ...existingGovernance,
      // Copy all keys from proposed (this overwrites any existing keys with same name)
      ...governanceProposed,
    }
    
    // Remove proposed key (must not exist in final metadata)
    delete updatedGovernance.proposed

    // Build final metadata
    const updatedMetadata = {
      ...existingMetadata,
      governance: updatedGovernance,
      fact: {
        ...existingMetadata.fact,
        // Remove pre_org flag (must not exist in final metadata)
      },
    }

    // Ensure pre_org is removed
    if (updatedMetadata.fact) {
      delete updatedMetadata.fact.pre_org
      // If fact is now empty, we can remove it, but keep it for consistency
      if (Object.keys(updatedMetadata.fact).length === 0) {
        // Keep fact object but empty (or remove if preferred)
        // For now, keep it to maintain structure
      }
    }

    // Verify that proposed is removed and pre_org is removed
    if (updatedMetadata.governance?.proposed !== undefined) {
      return { 
        success: false, 
        error: 'Klaida: governance.proposed vis dar egzistuoja po perkėlimo' 
      }
    }
    
    if (updatedMetadata.fact?.pre_org !== undefined) {
      return { 
        success: false, 
        error: 'Klaida: fact.pre_org vis dar egzistuoja po pašalinimo' 
      }
    }

    // Step 4: Update orgs table
    // NOTE: Immutability of governance.* keys should be enforced by existing database triggers
    // This function assumes triggers will prevent modifications to governance.* after activation
    const { error: updateOrgError } = await adminSupabase
      .from('orgs')
      .update({
        status: 'ACTIVE',
        metadata: updatedMetadata,
      })
      .eq('id', orgId)

    if (updateOrgError) {
      console.error('Error updating org:', updateOrgError)
      return { success: false, error: 'Nepavyko atnaujinti bendruomenės' }
    }

    // Verify update succeeded
    const { data: updatedOrg, error: verifyError } = await adminSupabase
      .from('orgs')
      .select('id, status, metadata')
      .eq('id', orgId)
      .maybeSingle()

    if (verifyError || !updatedOrg) {
      return { success: false, error: 'Nepavyko patikrinti atnaujinimo' }
    }

    if (updatedOrg.status !== 'ACTIVE') {
      return { success: false, error: 'Bendruomenės statusas nebuvo atnaujintas į ACTIVE' }
    }

    if (updatedOrg.metadata?.governance?.proposed !== undefined) {
      return { success: false, error: 'Klaida: governance.proposed vis dar egzistuoja po atnaujinimo' }
    }

    if (updatedOrg.metadata?.fact?.pre_org !== undefined) {
      return { success: false, error: 'Klaida: fact.pre_org vis dar egzistuoja po atnaujinimo' }
    }

    // Step 5: Update membership status to ACTIVE
    // V2 onboarding creates membership with PENDING status
    // After activation, owner membership should be ACTIVE
    const { error: membershipUpdateError } = await adminSupabase
      .from('memberships')
      .update({
        member_status: 'ACTIVE',
      })
      .eq('org_id', orgId)
      .eq('role', 'OWNER')
      .eq('member_status', 'PENDING') // Only update PENDING memberships

    if (membershipUpdateError) {
      console.error('Error updating membership status:', membershipUpdateError)
      // Non-blocking: log but don't fail activation
      // Membership can be updated manually if needed
    }

    // Step 6: Update community_applications
    // Find application by email (from org owner's email or metadata)
    // First, try to get owner email
    const { data: ownerMembership } = await adminSupabase
      .from('memberships')
      .select('user_id')
      .eq('org_id', orgId)
      .eq('role', 'OWNER')
      .limit(1)
      .maybeSingle()

    let ownerEmail: string | null = null
    if (ownerMembership) {
      const { data: ownerProfile } = await adminSupabase
        .from('profiles')
        .select('email')
        .eq('id', ownerMembership.user_id)
        .maybeSingle()
      
      ownerEmail = ownerProfile?.email || null
    }

    // Try to find application by email (from metadata or owner profile)
    const applicationEmail = org.metadata?.fact?.email || ownerEmail
    let applicationId: string | null = null

    if (applicationEmail) {
      const { data: application } = await adminSupabase
        .from('community_applications')
        .select('id, email, community_name')
        .eq('email', applicationEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (application) {
        applicationId = application.id
      } else {
        // Try by community name as fallback
        const { data: appByName } = await adminSupabase
          .from('community_applications')
          .select('id, email, community_name')
          .eq('community_name', org.name)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (appByName) {
          applicationId = appByName.id
        } else {
          console.warn('Community application not found for org:', { orgId, orgName: org.name, email: applicationEmail })
        }
      }
    } else {
      console.warn('No email available to find community application for org:', orgId)
    }

    if (applicationId) {
      const { error: updateAppError } = await adminSupabase
        .from('community_applications')
        .update({
          status: 'APPROVED',
        })
        .eq('id', applicationId)

      if (updateAppError) {
        console.error('Error updating community application:', updateAppError)
        // Non-critical, log but don't fail
      }
    }

    // Step 6: Audit logging
    await logAudit(adminSupabase, {
      orgId: org.id,
      userId: user.id,
      action: 'ORG_ACTIVATED',
      targetTable: 'orgs',
      targetId: org.id,
      metadata: {
        fact: {
          source: 'activation_v2',
          resolution_id: resolutionId,
          previous_status: 'SUBMITTED_FOR_REVIEW',
        },
      },
    })

    return { success: true }
  } catch (error: any) {
    console.error('Error activating organization V2:', error)
    return { 
      success: false, 
      error: error?.message || 'Įvyko netikėta klaida' 
    }
  }
}

/**
 * Reject organization V2
 * 
 * @param orgId - Organization ID
 * @param resolutionId - Optional: Resolution ID if rejection is via resolution
 * @returns Success status
 */
export async function rejectOrganizationV2(
  orgId: string,
  resolutionId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const user = await requireAuth(supabase)

  try {
    // Step 1: Get org details
    const { data: org, error: orgError } = await supabase
      .from('orgs')
      .select('id, name, slug, status, metadata')
      .eq('id', orgId)
      .maybeSingle()

    if (orgError || !org) {
      return { success: false, error: 'Bendruomenė nerasta' }
    }

    // HARD PRECONDITION: org.status MUST be 'SUBMITTED_FOR_REVIEW'
    if (org.status !== 'SUBMITTED_FOR_REVIEW') {
      return { 
        success: false, 
        error: `Netinkamas bendruomenės statusas. Reikia: SUBMITTED_FOR_REVIEW, gauta: ${org.status}` 
      }
    }

    // Step 2: Validate resolution if provided
    if (resolutionId) {
      const { data: resolution, error: resolutionError } = await supabase
        .from('resolutions')
        .select('id, status')
        .eq('id', resolutionId)
        .maybeSingle()

      if (resolutionError || !resolution) {
        return { success: false, error: 'Sprendimas nerastas' }
      }

      if (resolution.status !== RESOLUTION_STATUS.APPROVED) {
        return { 
          success: false, 
          error: `Sprendimas nėra patvirtintas. Dabartinis statusas: ${resolution.status}` 
        }
      }
    }

    // Step 3: Update orgs table
    const { error: updateOrgError } = await adminSupabase
      .from('orgs')
      .update({
        status: 'DECLINED',
      })
      .eq('id', orgId)

    if (updateOrgError) {
      console.error('Error updating org:', updateOrgError)
      return { success: false, error: 'Nepavyko atnaujinti bendruomenės' }
    }

    // Step 4: Update community_applications
    // Find application by email (from org owner's email or metadata)
    const { data: ownerMembership } = await adminSupabase
      .from('memberships')
      .select('user_id')
      .eq('org_id', orgId)
      .eq('role', 'OWNER')
      .limit(1)
      .maybeSingle()

    let ownerEmail: string | null = null
    if (ownerMembership) {
      const { data: ownerProfile } = await adminSupabase
        .from('profiles')
        .select('email')
        .eq('id', ownerMembership.user_id)
        .maybeSingle()
      
      ownerEmail = ownerProfile?.email || null
    }

    const applicationEmail = org.metadata?.fact?.email || ownerEmail
    let applicationId: string | null = null

    if (applicationEmail) {
      const { data: application } = await adminSupabase
        .from('community_applications')
        .select('id, email')
        .eq('email', applicationEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (application) {
        applicationId = application.id
      } else {
        // Try by community name as fallback
        const { data: appByName } = await adminSupabase
          .from('community_applications')
          .select('id, email')
          .eq('community_name', org.name)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (appByName) {
          applicationId = appByName.id
        }
      }
    }

    if (applicationId) {
      const { error: updateAppError } = await adminSupabase
        .from('community_applications')
        .update({
          status: 'REJECTED',
        })
        .eq('id', applicationId)

      if (updateAppError) {
        console.error('Error updating community application:', updateAppError)
        // Non-critical, log but don't fail
      }
    }

    // Step 5: Audit logging
    await logAudit(adminSupabase, {
      orgId: org.id,
      userId: user.id,
      action: 'ORG_REJECTED',
      targetTable: 'orgs',
      targetId: org.id,
      metadata: {
        fact: {
          source: 'activation_v2',
          resolution_id: resolutionId || null,
          previous_status: 'SUBMITTED_FOR_REVIEW',
        },
      },
    })

    return { success: true }
  } catch (error: any) {
    console.error('Error rejecting organization V2:', error)
    return { 
      success: false, 
      error: error?.message || 'Įvyko netikėta klaida' 
    }
  }
}
