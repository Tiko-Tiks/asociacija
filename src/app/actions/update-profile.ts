'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'

export interface UpdateProfileResult {
  success: boolean
  error?: string
}

/**
 * Server Action to update user profile.
 * 
 * Updates first_name, last_name, and full_name in profiles table.
 * 
 * @param first_name - User's first name
 * @param last_name - User's last name
 * @returns Update result with success status
 * @throws Error('auth_violation') if authentication fails
 * @throws Error('operation_failed') if update fails
 */
export async function updateProfile(
  first_name: string,
  last_name: string
): Promise<UpdateProfileResult> {
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

  // Build full_name from first_name + last_name
  const full_name = `${first_name.trim()} ${last_name.trim()}`

  // Update profile (only full_name, as first_name and last_name columns don't exist)
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      full_name: full_name,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (updateError) {
    if (updateError.code === '42501') {
      authViolation()
    }
    console.error('Error updating profile:', updateError)
    return {
      success: false,
      error: 'Nepavyko atnaujinti profilio',
    }
  }

  return {
    success: true,
  }
}

