'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from './_guards'
import { MEMBERSHIP_ROLE } from '@/app/domain/constants'
import { revalidatePath } from 'next/cache'

export interface UpdateMemberProfileResult {
  success: boolean
  error?: string
}

/**
 * Server Action to update a member's profile (OWNER only).
 * 
 * Updates full_name in profiles table for a specific user.
 * Only OWNER of the organization can update member profiles.
 * 
 * NOTE: Uses admin client to bypass RLS, since profiles RLS only allows
 * users to update their own profile. OWNER authorization is verified first.
 * 
 * @param orgId - Organization ID (to verify OWNER role)
 * @param targetUserId - User ID of the member to update
 * @param first_name - Member's first name
 * @param last_name - Member's last name
 * @returns Update result with success status
 */
export async function updateMemberProfile(
  orgId: string,
  targetUserId: string,
  first_name: string,
  last_name: string
): Promise<UpdateMemberProfileResult> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Validate input
  if (!first_name || !first_name.trim()) {
    return {
      success: false,
      error: 'Vardas yra privalomas',
    }
  }

  if (!last_name || !last_name.trim()) {
    return {
      success: false,
      error: 'Pavardė yra privaloma',
    }
  }

  // Check if current user is OWNER of the organization
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .eq('status', 'ACTIVE')
    .maybeSingle()

  if (membershipError) {
    console.error('Error checking membership:', membershipError)
    return {
      success: false,
      error: 'Nepavyko patikrinti teisių',
    }
  }

  if (!membership || membership.role !== MEMBERSHIP_ROLE.OWNER) {
    return {
      success: false,
      error: 'Tik pirmininkas gali redaguoti narių duomenis',
    }
  }

  // Use admin client to bypass RLS for profile update
  // Authorization has already been verified above (OWNER check)
  const adminSupabase = createAdminClient()

  // Verify target user is a member of the organization
  const { data: targetMembership, error: targetError } = await adminSupabase
    .from('memberships')
    .select('id')
    .eq('org_id', orgId)
    .eq('user_id', targetUserId)
    .maybeSingle()

  if (targetError || !targetMembership) {
    console.error('Error checking target membership:', targetError)
    return {
      success: false,
      error: 'Narys nerastas šioje organizacijoje',
    }
  }

  // Build full_name from first_name + last_name
  const full_name = `${first_name.trim()} ${last_name.trim()}`

  // Update profile using admin client (bypasses RLS)
  const { error: updateError } = await adminSupabase
    .from('profiles')
    .update({
      full_name: full_name,
      updated_at: new Date().toISOString(),
    })
    .eq('id', targetUserId)

  if (updateError) {
    console.error('Error updating member profile:', updateError)
    return {
      success: false,
      error: 'Nepavyko atnaujinti nario profilio',
    }
  }

  // Revalidate the members page to show updated data
  revalidatePath(`/dashboard`)

  return {
    success: true,
  }
}

