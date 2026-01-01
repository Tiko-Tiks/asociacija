'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'
import {
  MEMBERSHIP_ROLE,
  CONSENT_TYPE,
  ConsentType,
  CHAIRMAN_REQUIRED_CONSENTS,
  MEMBER_REQUIRED_CONSENTS,
} from '@/app/domain/constants'
import { requireOnboardingAccess } from '@/app/domain/guards/onboardingAccess'
import { revalidatePath } from 'next/cache'

/**
 * Consent Management (B3.1.2)
 * 
 * Handles consent acceptance for:
 * - Chairman (FIRST LOGIN): CORE_STATUTES, CHARTER, TERMS, PRIVACY
 * - Members: INTERNAL_RULES, CHARTER, TERMS, PRIVACY
 */

/**
 * Accept a consent
 * 
 * @param orgId - Organization ID
 * @param consentType - Type of consent
 * @returns Success status
 */
export async function acceptConsent(
  orgId: string,
  consentType: ConsentType
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Step 1: Validate consent type
  const allConsents = Object.values(CONSENT_TYPE)
  if (!allConsents.includes(consentType)) {
    return { success: false, error: 'Neteisingas sutikimo tipas' }
  }

  // Step 2: Get user membership
  // CRITICAL: Use member_status (not status) per schema fix
  const { data: membership, error: membershipError }: any = await supabase
    .from('memberships')
    .select('id, role, member_status')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .eq('member_status', 'ACTIVE')
    .maybeSingle()

  if (membershipError) {
    if (membershipError?.code === '42501') {
      authViolation()
    }
    console.error('Error fetching membership:', membershipError)
    operationFailed()
  }

  if (!membership) {
    return { success: false, error: 'Neturite narystės šioje organizacijoje' }
  }

  // Step 2.5: If user is OWNER and consent is Chairman-required, check onboarding access
  if (membership.role === MEMBERSHIP_ROLE.OWNER && CHAIRMAN_REQUIRED_CONSENTS.includes(consentType)) {
    try {
      await requireOnboardingAccess(orgId)
    } catch (error: any) {
      if (error?.code === 'access_denied' || error?.code === 'auth_violation') {
        return { success: false, error: 'Neturite teisių priimti šį sutikimą arba organizacija jau aktyvuota' }
      }
      throw error
    }
  }

  // Step 3: Check if consent already exists
  const { data: existingConsent, error: consentCheckError }: any = await supabase
    .from('member_consents')
    .select('id')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .eq('consent_type', consentType)
    .maybeSingle()

  if (consentCheckError && consentCheckError.code !== 'PGRST116') {
    if (consentCheckError?.code === '42501') {
      authViolation()
    }
    console.error('Error checking consent:', consentCheckError)
    operationFailed()
  }

  // Step 4: Insert or update consent
  if (existingConsent) {
    // Update existing consent
    const { error: updateError }: any = await supabase
      .from('member_consents')
      .update({
        agreed_at: new Date().toISOString(),
        version: '1.0', // TODO: Get actual version from consent management
      })
      .eq('id', existingConsent.id)

    if (updateError) {
      if (updateError?.code === '42501') {
        authViolation()
      }
      console.error('Error updating consent:', updateError)
      return { success: false, error: 'Nepavyko atnaujinti sutikimo' }
    }
  } else {
    // Insert new consent
    const { error: insertError }: any = await supabase
      .from('member_consents')
      .insert({
        org_id: orgId,
        user_id: user.id,
        consent_type: consentType,
        version: '1.0', // TODO: Get actual version
        agreed_at: new Date().toISOString(),
      })

    if (insertError) {
      if (insertError?.code === '42501') {
        authViolation()
      }
      if (insertError?.code === '42P01') {
        return { success: false, error: 'Sutikimų lentelė neegzistuoja' }
      }
      console.error('Error inserting consent:', insertError)
      return { success: false, error: 'Nepavyko išsaugoti sutikimo' }
    }
  }

  // Step 5: Soft audit logging
  const { error: auditError }: any = await supabase
    .from('audit_logs')
    .insert({
      org_id: orgId,
      user_id: user.id,
      action: 'CONSENT_ACCEPTED',
      target_table: 'member_consents',
      target_id: existingConsent?.id || null,
      old_value: null,
      new_value: { consent_type: consentType },
    })

  if (auditError) {
    // SOFT AUDIT MODE: Log incident but don't fail
    console.error('AUDIT INCIDENT: Failed to log CONSENT_ACCEPTED:', auditError)
  }

  // Step 6: Check if all consents accepted AND governance submitted, then send email to CORE
  try {
    const allConsentsAccepted = await hasAllRequiredConsents(orgId, user.id)
    
    if (allConsentsAccepted) {
      // Check if governance is also submitted
      const { data: governanceConfig }: any = await supabase
        .from('governance_configs')
        .select('id')
        .eq('org_id', orgId)
        .maybeSingle()

      if (governanceConfig) {
        // Both governance and consents complete - send email to CORE
        const { data: org }: any = await supabase
          .from('orgs')
          .select('name, slug')
          .eq('id', orgId)
          .single()

        const { data: profile }: any = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()

        if (org) {
          // Import and send email (fail silently)
          const { sendGovernanceSubmissionEmail } = await import('@/lib/email')
          sendGovernanceSubmissionEmail({
            orgName: org.name,
            orgSlug: org.slug,
            chairmanName: profile?.full_name || null,
            chairmanEmail: user.email || null,
          }).catch((error) => {
            console.error('EMAIL INCIDENT: Failed to send governance submission email:', error)
          })
        }
      }
    }
  } catch (error) {
    // Log but don't fail - email is optional
    console.error('Error checking governance or sending email:', error)
  }

  // Step 7: Revalidate
  revalidatePath('/dashboard', 'layout')

  return { success: true }
}

/**
 * Get required consents for user
 * 
 * @param orgId - Organization ID
 * @param userId - User ID
 * @returns Required consents and acceptance status
 */
export async function getRequiredConsents(orgId: string, userId: string): Promise<{
  required: ConsentType[]
  accepted: ConsentType[]
  missing: ConsentType[]
}> {
  const supabase = await createClient()

  // Get user role
  const { data: membership }: any = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .maybeSingle()

  const role = membership?.role || MEMBERSHIP_ROLE.MEMBER
  const required = role === MEMBERSHIP_ROLE.OWNER
    ? CHAIRMAN_REQUIRED_CONSENTS
    : MEMBER_REQUIRED_CONSENTS

  // Get accepted consents
  // CRITICAL: member_consents table uses user_id and org_id (not membership_id)
  const { data: consents, error: consentsError }: any = await supabase
    .from('member_consents')
    .select('consent_type')
    .eq('user_id', userId)
    .eq('org_id', orgId)

  if (consentsError) {
    // If table doesn't exist (PGRST205), return all as missing (user needs to accept)
    if (consentsError.code === 'PGRST205' || consentsError.code === '42P01') {
      console.warn('member_consents table does not exist, returning all consents as missing', {
        orgId,
        userId,
        errorCode: consentsError.code,
      })
      return {
        required,
        accepted: [],
        missing: required,
      }
    }
    
    // For other errors, log and return all as missing
    console.error('Error fetching consents:', consentsError)
    return {
      required,
      accepted: [],
      missing: required,
    }
  }

  const accepted = (consents || []).map((c: any) => c.consent_type as ConsentType)
  const missing = required.filter((c) => !accepted.includes(c))

  return {
    required,
    accepted,
    missing,
  }
}

/**
 * Check if user has all required consents
 * 
 * @param orgId - Organization ID
 * @param userId - User ID
 * @returns true if all required consents are accepted
 */
export async function hasAllRequiredConsents(orgId: string, userId: string): Promise<boolean> {
  const { missing } = await getRequiredConsents(orgId, userId)
  return missing.length === 0
}

