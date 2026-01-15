'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from './_guards'
import { logAudit } from '@/app/utils/audit'
import {
  CONSENT_TYPE,
  ConsentType,
  CHAIRMAN_REQUIRED_CONSENTS,
} from '@/app/domain/constants'

/**
 * ============================================================================
 * V2 – GOVERNANCE-LOCKED, DO NOT AUTO-MODIFY
 * ============================================================================
 * 
 * This module implements V2 pre-onboarding consents with governance guarantees.
 * Any automation here breaks legal guarantees.
 * 
 * V2 Pre-Onboarding Consents
 * 
 * STRICTLY FORBIDDEN:
 * - Changing orgs.status
 * - Writing to orgs.metadata.governance.*
 * - Creating org_rulesets
 * - Calling any activation / review RPC
 * 
 * ONLY writes to:
 * - member_consents table
 * 
 * STATUS: FROZEN - No modifications without governance approval
 * ============================================================================
 */

/**
 * Get required consents for V2 pre-onboarding
 * 
 * @param orgSlug - Organization slug
 * @returns Required consents and acceptance status
 */
export async function getPreOnboardingConsents(orgSlug: string): Promise<{
  success: boolean
  required?: ConsentType[]
  accepted?: ConsentType[]
  missing?: ConsentType[]
  error?: string
}> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  try {
    // Step 1: Validate access
    const { data: org, error: orgError } = await supabase
      .from('orgs')
      .select('id, status, metadata')
      .eq('slug', orgSlug)
      .maybeSingle()

    if (orgError || !org) {
      return { success: false, error: 'Bendruomenė nerasta' }
    }

    // HARD RULE 1: org.status MUST be 'SUBMITTED_FOR_REVIEW'
    if (org.status !== 'SUBMITTED_FOR_REVIEW') {
      return { success: false, error: 'Netinkamas bendruomenės statusas' }
    }

    // HARD RULE 2: org.metadata.fact.pre_org MUST be true
    const isPreOrg = org.metadata?.fact?.pre_org === true
    if (!isPreOrg) {
      return { success: false, error: 'Bendruomenė nėra PRE_ORG' }
    }

    // HARD RULE 3: current user MUST be OWNER
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

    // Step 2: Determine required consents
    // For V2 pre-onboarding, use CHAIRMAN_REQUIRED_CONSENTS
    // In the future, this could be derived from orgs.metadata.governance.proposed.*
    const required = CHAIRMAN_REQUIRED_CONSENTS

    // Step 3: Get accepted consents
    const { data: consents, error: consentsError } = await supabase
      .from('member_consents')
      .select('consent_type')
      .eq('user_id', user.id)
      .eq('org_id', org.id)

    if (consentsError && consentsError.code !== 'PGRST116') {
      console.error('Error fetching consents:', consentsError)
      // If table doesn't exist, return all as missing
      if (consentsError.code === 'PGRST205' || consentsError.code === '42P01') {
        return {
          success: true,
          required,
          accepted: [],
          missing: required,
        }
      }
      return { success: false, error: 'Nepavyko gauti sutikimų sąrašo' }
    }

    const accepted = (consents || []).map((c: any) => c.consent_type as ConsentType)
    const missing = required.filter((c) => !accepted.includes(c))

    return {
      success: true,
      required,
      accepted,
      missing,
    }
  } catch (error: any) {
    console.error('Error getting pre-onboarding consents:', error)
    return { success: false, error: error?.message || 'Įvyko netikėta klaida' }
  }
}

/**
 * Accept a consent for V2 pre-onboarding
 * 
 * @param orgSlug - Organization slug
 * @param consentType - Type of consent
 * @returns Success status
 */
export async function acceptPreOnboardingConsent(
  orgSlug: string,
  consentType: ConsentType
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const user = await requireAuth(supabase)

  try {
    // Step 1: Validate consent type
    const allConsents = Object.values(CONSENT_TYPE)
    if (!allConsents.includes(consentType)) {
      return { success: false, error: 'Neteisingas sutikimo tipas' }
    }

    // Step 2: Validate access
    const { data: org, error: orgError } = await supabase
      .from('orgs')
      .select('id, status, metadata')
      .eq('slug', orgSlug)
      .maybeSingle()

    if (orgError || !org) {
      return { success: false, error: 'Bendruomenė nerasta' }
    }

    // HARD RULE 1: org.status MUST be 'SUBMITTED_FOR_REVIEW'
    if (org.status !== 'SUBMITTED_FOR_REVIEW') {
      await logAccessBlocked(org.id, user.id, 'invalid_status')
      return { success: false, error: 'Netinkamas bendruomenės statusas' }
    }

    // HARD RULE 2: org.metadata.fact.pre_org MUST be true
    const isPreOrg = org.metadata?.fact?.pre_org === true
    if (!isPreOrg) {
      await logAccessBlocked(org.id, user.id, 'not_pre_org')
      return { success: false, error: 'Bendruomenė nėra PRE_ORG' }
    }

    // HARD RULE 3: current user MUST be OWNER
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
      return { success: false, error: 'Tik pirmininkas (OWNER) gali priimti sutikimus' }
    }

    // Step 3: Check if consent already exists
    const { data: existingConsent, error: consentCheckError } = await supabase
      .from('member_consents')
      .select('id')
      .eq('org_id', org.id)
      .eq('user_id', user.id)
      .eq('consent_type', consentType)
      .maybeSingle()

    if (consentCheckError && consentCheckError.code !== 'PGRST116') {
      console.error('Error checking consent:', consentCheckError)
      return { success: false, error: 'Nepavyko patikrinti sutikimo' }
    }

    // Step 4: Insert or update consent
    if (existingConsent) {
      // Update existing consent
      const { error: updateError } = await adminSupabase
        .from('member_consents')
        .update({
          agreed_at: new Date().toISOString(),
          version: '1.0', // TODO: Get actual version from consent management
        })
        .eq('id', existingConsent.id)

      if (updateError) {
        console.error('Error updating consent:', updateError)
        return { success: false, error: 'Nepavyko atnaujinti sutikimo' }
      }
    } else {
      // Insert new consent
      const { error: insertError } = await adminSupabase
        .from('member_consents')
        .insert({
          org_id: org.id,
          user_id: user.id,
          consent_type: consentType,
          version: '1.0', // TODO: Get actual version
          agreed_at: new Date().toISOString(),
        })

      if (insertError) {
        if (insertError.code === '42P01') {
          return { success: false, error: 'Sutikimų lentelė neegzistuoja' }
        }
        console.error('Error inserting consent:', insertError)
        return { success: false, error: 'Nepavyko išsaugoti sutikimo' }
      }
    }

    // Step 5: Audit logging
    await logAudit(adminSupabase, {
      orgId: org.id,
      userId: user.id,
      action: 'CONSENTS_ACCEPTED',
      targetTable: 'member_consents',
      targetId: existingConsent?.id || null,
      metadata: {
        fact: {
          source: 'pre_onboarding_v2',
          consent_type: consentType,
        },
      },
    })

    return { success: true }
  } catch (error: any) {
    console.error('Error accepting pre-onboarding consent:', error)
    return { 
      success: false, 
      error: error?.message || 'Įvyko netikėta klaida' 
    }
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
          entrypoint: 'pre_onboarding_consents',
          reason,
        },
      },
    })
  } catch (error) {
    console.error('AUDIT INCIDENT: Failed to log PRE_ORG_ACCESS_BLOCKED:', error)
  }
}
