'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { MEMBERSHIP_ROLE, MEMBERSHIP_STATUS } from '@/app/domain/constants'

/**
 * Seed System Core Community ("Branduolys")
 * 
 * Creates the official platform organization if it doesn't exist.
 * This is the central HQ organization managed by Super Admins.
 */
export async function seedSystemCore(): Promise<{
  success: boolean
  message: string
  orgId?: string
  error?: string
}> {
  const supabase = createAdminClient()

  try {
    // Step 1: Check if branduolys org already exists
    const { data: existingOrg, error: checkError } = await supabase
      .from('orgs')
      .select('id, name, slug')
      .in('slug', ['branduolys', 'platform'])
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is fine
      console.error('Error checking for existing branduolys org:', checkError)
      return {
        success: false,
        message: 'Failed to check for existing organization',
        error: checkError.message,
      }
    }

    if (existingOrg) {
      return {
        success: true,
        message: 'Branduolys organization already exists',
        orgId: existingOrg.id,
      }
    }

    // Step 2: Find super admin user (admin@pastas.email)
    const { data: superAdminUser, error: userError } = await supabase.auth.admin.listUsers()
    
    if (userError) {
      console.error('Error fetching users:', userError)
      return {
        success: false,
        message: 'Failed to find super admin user',
        error: userError.message,
      }
    }

    const superAdmin = superAdminUser.users.find(
      (u) => u.email === 'admin@pastas.email'
    )

    if (!superAdmin) {
      return {
        success: false,
        message: 'Super admin user (admin@pastas.email) not found',
        error: 'Super admin user must exist before seeding system core',
      }
    }

    // Step 3: Create branduolys organization
    const { data: newOrg, error: createError } = await supabase
      .from('orgs')
      .insert({
        name: 'Lietuvos Branduolys',
        slug: 'branduolys',
        status: 'ACTIVE',
        // Note: description column may not exist, so we don't include it
      })
      .select('id')
      .single()

    if (createError) {
      console.error('Error creating branduolys org:', createError)
      return {
        success: false,
        message: 'Failed to create branduolys organization',
        error: createError.message,
      }
    }

    if (!newOrg) {
      return {
        success: false,
        message: 'Failed to create organization (no data returned)',
      }
    }

    // Step 4: Create membership for super admin as OWNER
    const { error: membershipError } = await supabase
      .from('memberships')
      .insert({
        org_id: newOrg.id,
        user_id: superAdmin.id,
        role: MEMBERSHIP_ROLE.OWNER,
        member_status: MEMBERSHIP_STATUS.ACTIVE,
        joined_at: new Date().toISOString(),
      })

    if (membershipError) {
      console.error('Error creating super admin membership:', membershipError)
      // Try to clean up the org if membership creation fails
      await supabase.from('orgs').delete().eq('id', newOrg.id)
      return {
        success: false,
        message: 'Failed to create super admin membership',
        error: membershipError.message,
      }
    }

    return {
      success: true,
      message: 'Branduolys organization created successfully',
      orgId: newOrg.id,
    }
  } catch (error) {
    console.error('Unexpected error seeding system core:', error)
    return {
      success: false,
      message: 'Unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

