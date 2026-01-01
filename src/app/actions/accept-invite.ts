'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'
import { MEMBERSHIP_STATUS } from '@/app/domain/constants'
import { acceptConsent } from './consents'
import { MEMBER_REQUIRED_CONSENTS } from '@/app/domain/constants'
import { revalidatePath } from 'next/cache'

/**
 * Invite-based Member Onboarding (B3.1.2)
 * 
 * Flow:
 * - Validate invite token
 * - If membership exists → attach user
 * - If not → create membership
 * - Force consent completion
 * - Mark invite as ACCEPTED
 * 
 * No duplicate members allowed.
 */

/**
 * Accept an invite
 * 
 * @param inviteToken - Invite token
 * @returns Success status and orgId
 */
export async function acceptInvite(
  inviteToken: string
): Promise<{ success: boolean; orgId?: string; error?: string }> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Step 1: Validate invite token
  if (!inviteToken || inviteToken.trim().length === 0) {
    return { success: false, error: 'Pakvietimo tokenas yra privalomas' }
  }

  // Step 2: Fetch invite
  const { data: invite, error: inviteError }: any = await supabase
    .from('member_invites')
    .select('id, org_id, email, status, expires_at')
    .eq('token', inviteToken)
    .maybeSingle()

  if (inviteError) {
    if (inviteError?.code === '42501') {
      authViolation()
    }
    if (inviteError?.code === '42P01') {
      return { success: false, error: 'Pakvietimų lentelė neegzistuoja' }
    }
    console.error('Error fetching invite:', inviteError)
    operationFailed()
  }

  if (!invite) {
    return { success: false, error: 'Pakvietimas nerastas arba negalioja' }
  }

  // Step 3: Check if invite is expired
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { success: false, error: 'Pakvietimas pasibaigęs' }
  }

  // Step 4: Check if invite is already accepted
  if (invite.status === 'ACCEPTED') {
    return { success: false, error: 'Pakvietimas jau priimtas' }
  }

  // Step 5: Check if user email matches invite email
  if (invite.email && user.email && invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return { success: false, error: 'Pakvietimas skirtas kitam el. pašto adresui' }
  }

  // Step 6: Check if membership already exists
  const { data: existingMembership, error: membershipCheckError }: any = await supabase
    .from('memberships')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('org_id', invite.org_id)
    .maybeSingle()

  if (membershipCheckError && membershipCheckError.code !== 'PGRST116') {
    if (membershipCheckError?.code === '42501') {
      authViolation()
    }
    console.error('Error checking membership:', membershipCheckError)
    operationFailed()
  }

  let membershipId: string

  if (existingMembership) {
    // Attach user to existing membership
    membershipId = existingMembership.id

    // If membership is SUSPENDED, reactivate it
    // CRITICAL: Use member_status (not status) per schema fix
    if (existingMembership.member_status !== MEMBERSHIP_STATUS.ACTIVE) {
      // Type assertion needed due to Supabase TypeScript inference limitations
      const { error: updateError }: any = await (supabase
        .from('memberships') as any)
        .update({
          member_status: MEMBERSHIP_STATUS.ACTIVE,
          user_id: user.id,
        })
        .eq('id', membershipId)

      if (updateError) {
        if (updateError?.code === '42501') {
          authViolation()
        }
        console.error('Error updating membership:', updateError)
        return { success: false, error: 'Nepavyko atnaujinti narystės' }
      }
    }
  } else {
    // Create new membership
    // Type assertion needed due to Supabase TypeScript inference limitations
    const { data: newMembership, error: createError }: any = await (supabase
      .from('memberships') as any)
      .insert({
        org_id: invite.org_id,
        user_id: user.id,
        status: MEMBERSHIP_STATUS.ACTIVE,
        role: 'MEMBER',
      })
      .select('id')
      .single()

    if (createError) {
      if (createError?.code === '42501') {
        authViolation()
      }
      // Check for duplicate key error
      if (createError?.code === '23505') {
        return { success: false, error: 'Narystė jau egzistuoja' }
      }
      console.error('Error creating membership:', createError)
      return { success: false, error: 'Nepavyko sukurti narystės' }
    }

    if (!newMembership) {
      return { success: false, error: 'Nepavyko sukurti narystės' }
    }

    membershipId = newMembership.id
  }

  // Step 7: Force consent completion (accept all member consents)
  for (const consentType of MEMBER_REQUIRED_CONSENTS) {
    const consentResult = await acceptConsent(invite.org_id, consentType)
    if (!consentResult.success) {
      // Log but continue - consents can be completed later
      console.error(`Failed to accept consent ${consentType}:`, consentResult.error)
    }
  }

  // Step 8: Mark invite as ACCEPTED
  const { error: updateInviteError }: any = await supabase
    .from('member_invites')
    .update({
      status: 'ACCEPTED',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', invite.id)

  if (updateInviteError) {
    if (updateInviteError?.code === '42501') {
      authViolation()
    }
    // Log but don't fail - membership was created
    console.error('Error updating invite status:', updateInviteError)
  }

  // Step 9: Soft audit logging
  const { error: auditError }: any = await supabase
    .from('audit_logs')
    .insert({
      org_id: invite.org_id,
      user_id: user.id,
      action: 'INVITE_ACCEPTED',
      target_table: 'memberships',
      target_id: membershipId,
      old_value: null,
      new_value: { invite_id: invite.id },
    })

  if (auditError) {
    // SOFT AUDIT MODE: Log incident but don't fail
    console.error('AUDIT INCIDENT: Failed to log INVITE_ACCEPTED:', auditError)
  }

  // Step 10: Revalidate
  revalidatePath('/dashboard', 'layout')

  return {
    success: true,
    orgId: invite.org_id,
  }
}

