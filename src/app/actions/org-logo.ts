'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/app/actions/_guards'
import { MEMBERSHIP_ROLE } from '@/app/domain/constants'

/**
 * Upload organization logo/avatar
 * 
 * Only OWNER can upload logo for their organization.
 * 
 * @param orgId - Organization ID
 * @param logoUrl - Logo URL (from Supabase Storage or external URL)
 * @returns Success or error
 */
export async function updateOrgLogo(orgId: string, logoUrl: string) {
  const supabase = await createClient()
  await requireAuth(supabase)

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Neprisijungęs vartotojas' }
  }

  // Verify user is OWNER of this organization
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select('role, member_status')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .eq('member_status', 'ACTIVE')
    .single()

  if (membershipError || !membership) {
    return { success: false, error: 'Nėra prieigos prie šios organizacijos' }
  }

  if (membership.role !== MEMBERSHIP_ROLE.OWNER) {
    return { success: false, error: 'Tik savininkas gali keisti logotipą' }
  }

  // Update organization logo
  const { error: updateError } = await supabase
    .from('orgs')
    .update({ logo_url: logoUrl })
    .eq('id', orgId)

  if (updateError) {
    console.error('Error updating org logo:', updateError)
    return { success: false, error: 'Nepavyko atnaujinti logotipo' }
  }

  // Log audit
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    org_id: orgId,
    action: 'UPDATE_ORG_LOGO',
    old_value: null,
    new_value: { logo_url: logoUrl },
  }).catch((err) => {
    console.error('AUDIT_LOG_FAILED: Failed to log logo update', err)
  })

  return { success: true }
}

/**
 * Get organization logo URL
 * 
 * @param orgId - Organization ID
 * @returns Logo URL or null
 */
export async function getOrgLogo(orgId: string): Promise<string | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('orgs')
    .select('logo_url')
    .eq('id', orgId)
    .single()

  if (error || !data) {
    return null
  }

  return data.logo_url || null
}

