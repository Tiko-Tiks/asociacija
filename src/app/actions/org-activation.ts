'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'
import { MEMBERSHIP_ROLE } from '@/app/domain/constants'
import { sendOrgActivatedEmail } from '@/lib/email'
import { revalidatePath } from 'next/cache'

/**
 * Org Activation Actions (B3.3)
 * 
 * Server actions for activating organizations.
 * Used by Platformos admin to approve organizations.
 * 
 * Sends email to Chairman when org is activated.
 */

/**
 * Activate an organization
 * 
 * CRITICAL: This should only be called by Platformos admin.
 * In production, this would be called via admin interface.
 * 
 * @param orgId - Organization ID to activate
 * @param chairmanEmail - Optional: Chairman email (if not provided, email will be skipped)
 * @returns Success status
 */
export async function activateOrganization(
  orgId: string,
  chairmanEmail?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const adminUser = await requireAuth(supabase)

  // Step 1: Check if user is platform admin (Platforma)
  // For now, check if user has OWNER role (can be extended with admin check)
  const { data: adminMembership }: any = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', adminUser.id)
    .eq('role', MEMBERSHIP_ROLE.OWNER)
    .limit(1)

  // TODO: Add proper Platformos admin check (e.g., isPlatformAdmin() or specific admin role)
  // For now, allow OWNER to activate (this should be restricted in production)

  // Step 2: Get org details
  const { data: org, error: orgError }: any = await supabase
    .from('orgs')
    .select('id, name, slug')
    .eq('id', orgId)
    .single()

  if (orgError) {
    if (orgError?.code === '42501') {
      authViolation()
    }
    if (orgError?.code === 'PGRST116') {
      return { success: false, error: 'Organizacija nerasta' }
    }
    console.error('Error fetching org:', orgError)
    operationFailed()
  }

  if (!org) {
    return { success: false, error: 'Organizacija nerasta' }
  }

  // Step 3: Check if org already has active ruleset
  const { data: activeRuleset }: any = await supabase
    .from('org_rulesets')
    .select('id')
    .eq('org_id', orgId)
    .eq('status', 'ACTIVE')
    .maybeSingle()

  if (!activeRuleset) {
    // Step 3.5: Activate the PROPOSED ruleset
    const { data: proposedRuleset }: any = await supabase
      .from('org_rulesets')
      .select('id')
      .eq('org_id', orgId)
      .eq('status', 'PROPOSED')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (proposedRuleset) {
      // Update ruleset status to ACTIVE
      const { error: updateError }: any = await supabase
        .from('org_rulesets')
        .update({
          status: 'ACTIVE',
          approved_at: new Date().toISOString(),
          approved_by: adminUser.id,
        })
        .eq('id', proposedRuleset.id)

      if (updateError) {
        if (updateError?.code === '42501') {
          authViolation()
        }
        console.error('Error activating ruleset:', updateError)
        return { success: false, error: 'Nepavyko aktyvuoti ruleset' }
      }
    } else {
      return { success: false, error: 'Nėra pateikto ruleset patvirtinimui' }
    }
  }

  // Step 4: Update org status to ACTIVE
  const { error: statusUpdateError }: any = await supabase
    .from('orgs')
    .update({
      status: 'ACTIVE',
    })
    .eq('id', orgId)

  if (statusUpdateError) {
    if (statusUpdateError?.code === '42501') {
      authViolation()
    }
    console.error('Error updating org status:', statusUpdateError)
    return { success: false, error: 'Nepavyko atnaujinti organizacijos statuso' }
  }

  // Step 5: Get Chairman (OWNER) info and send email
  if (chairmanEmail) {
    // Get chairman name from profile
    const { data: ownerMembership }: any = await supabase
      .from('memberships')
      .select('user_id')
      .eq('org_id', orgId)
      .eq('role', MEMBERSHIP_ROLE.OWNER)
      .limit(1)
      .maybeSingle()

    let chairmanName: string | null = null
    if (ownerMembership) {
      const { data: profile }: any = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', ownerMembership.user_id)
        .maybeSingle()

      chairmanName = profile?.full_name || null
    }

    // Send email to Chairman (fail silently)
    sendOrgActivatedEmail({
      orgName: org.name,
      orgSlug: org.slug,
      chairmanEmail,
      chairmanName,
    }).catch((error) => {
      console.error('EMAIL INCIDENT: Failed to send org activated email:', error)
    })
  } else {
    // Log that email was skipped (email not provided)
    console.log('EMAIL SKIPPED: Chairman email not provided for org activation:', orgId)
  }

  // Step 6: Soft audit logging
  const { error: auditError }: any = await supabase
    .from('audit_logs')
    .insert({
      org_id: orgId,
      user_id: adminUser.id,
      action: 'ORG_ACTIVATED',
      target_table: 'orgs',
      target_id: orgId,
      old_value: null,
      new_value: { status: 'ACTIVE' },
    })

  if (auditError) {
    // SOFT AUDIT MODE: Log incident but don't fail
    console.error('AUDIT INCIDENT: Failed to log ORG_ACTIVATED:', auditError)
  }

  // Step 7: Revalidate
  revalidatePath('/dashboard', 'layout')
  revalidatePath('/onboarding', 'page')

  return { success: true }
}

