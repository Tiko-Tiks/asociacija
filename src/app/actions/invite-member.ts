'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'crypto'

/**
 * Create a member invite
 * 
 * @param orgId - Organization ID
 * @param email - Email address to invite
 * @returns Success status and invite token
 */
export async function inviteMember(
  orgId: string,
  email: string
): Promise<{
  success: boolean
  inviteToken?: string
  inviteUrl?: string
  error?: string
}> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Validate email
  if (!email || !email.trim() || !email.includes('@')) {
    return { success: false, error: 'Neteisingas el. pašto adresas' }
  }

  // Check if user is OWNER
  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .eq('member_status', 'ACTIVE')
    .single()

  if (!membership || membership.role !== 'OWNER') {
    return { success: false, error: 'Tik OWNER gali kviesti naujus narius' }
  }

  // Check if user with this email already has membership
  // v17.0: Cannot use service_role, so check via profiles and memberships
  // Note: This is limited - we can only check existing memberships
  // Cannot verify if email exists in auth.users without service_role
  const normalizedEmail = email.toLowerCase().trim()
  
  // Try to find membership by checking if any user with this email pattern exists
  // This is a workaround - ideally should use RPC function
  const { data: existingMemberships } = await supabase
    .from('memberships')
    .select('id, user_id')
    .eq('org_id', orgId)

  // Check if any of these memberships belong to a user we can identify
  // Note: Without service_role, we cannot directly check auth.users
  // This is a limitation - invite might be sent to non-existent user
  // TODO: Implement RPC function to check user existence

  // Generate invite token
  const token = randomBytes(32).toString('hex')
  
  // Set expiration to 30 days from now
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  // Create invite
  const { data: invite, error: inviteError }: any = await supabase
    .from('member_invites')
    .insert({
      org_id: orgId,
      email: email.toLowerCase().trim(),
      token,
      status: 'PENDING',
      expires_at: expiresAt.toISOString(),
      created_by: user.id,
    })
    .select('id')
    .single()

  if (inviteError) {
    if (inviteError.code === '42501') {
      authViolation()
    }
    if (inviteError.code === '42P01') {
      return { success: false, error: 'Pakvietimų lentelė neegzistuoja. Reikia sukurti member_invites lentelę.' }
    }
    console.error('Error creating invite:', inviteError)
    return { success: false, error: 'Nepavyko sukurti kvietimo' }
  }

  // Generate invite URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const inviteUrl = `${baseUrl}/accept-invite?token=${token}`

  // Soft audit logging
  const { error: auditError }: any = await supabase
    .from('audit_logs')
    .insert({
      org_id: orgId,
      user_id: user.id,
      action: 'MEMBER_INVITE_CREATED',
      target_table: 'member_invites',
      target_id: invite.id,
      old_value: null,
      new_value: { email: email.toLowerCase().trim() },
    })

  if (auditError) {
    console.error('AUDIT INCIDENT: Failed to log MEMBER_INVITE_CREATED:', auditError)
  }

  revalidatePath(`/dashboard/[slug]/members`, 'page')

  return {
    success: true,
    inviteToken: token,
    inviteUrl,
  }
}

