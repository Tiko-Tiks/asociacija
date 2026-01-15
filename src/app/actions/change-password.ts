'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'

/**
 * Change user password
 * 
 * Requires user to be authenticated.
 * 
 * @param currentPassword - Current password for verification
 * @param newPassword - New password
 * @returns Success or error
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  if (!user) {
    return { success: false, error: 'Neprisijungęs vartotojas' }
  }

  // Validate new password
  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: 'Slaptažodis turi būti bent 8 simbolių' }
  }

  // Verify current password by attempting to sign in
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  })

  if (verifyError) {
    return { success: false, error: 'Neteisingas dabartinis slaptažodis' }
  }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (updateError) {
    console.error('Error updating password:', updateError)
    return { success: false, error: 'Nepavyko pakeisti slaptažodžio' }
  }

  return { success: true }
}

/**
 * Set password for new user (first time setup)
 * 
 * Used when user wants to set their own password after account creation.
 * Does not require current password verification.
 * 
 * @param newPassword - New password
 * @returns Success or error
 */
export async function setPassword(
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  if (!user) {
    return { success: false, error: 'Neprisijungęs vartotojas' }
  }

  // Validate new password
  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: 'Slaptažodis turi būti bent 8 simbolių' }
  }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (updateError) {
    console.error('Error setting password:', updateError)
    return { success: false, error: 'Nepavyko nustatyti slaptažodžio' }
  }

  return { success: true }
}

