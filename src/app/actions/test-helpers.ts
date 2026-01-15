'use server'

/**
 * TEST HELPERS
 * 
 * Utilities for managing test data during development.
 * 
 * GOVERNANCE COMPLIANCE:
 * - Users are NEVER deleted (Constitution Rule #5)
 * - Instead, we mark them as LEFT
 * - Audit trail is preserved
 * 
 * USAGE:
 * - Only use in development/staging
 * - Mark test users clearly (email prefix, name)
 * - Clean up after testing using markTestUsersAsLeft()
 */

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { MEMBERSHIP_STATUS, MEMBERSHIP_ROLE } from '@/app/domain/constants'

/**
 * Mark test users as LEFT status (soft delete).
 * 
 * Filters users by:
 * - Email starts with 'test.'
 * - First name = 'Test'
 * 
 * SAFE: Does not delete, only changes status to LEFT
 * 
 * @param org_id - Organization ID to clean
 * @returns Count of users marked as LEFT
 */
export async function markTestUsersAsLeft(
  org_id: string
): Promise<{ success: boolean; count: number; error?: string }> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Verify user is OWNER
  const { data: membership, error: membershipError }: any = await supabase
    .from('memberships')
    .select('id, role')
    .eq('user_id', user.id)
    .eq('org_id', org_id)
    .eq('status', MEMBERSHIP_STATUS.ACTIVE)
    .maybeSingle()

  if (membershipError || !membership || membership.role !== MEMBERSHIP_ROLE.OWNER) {
    return { 
      success: false, 
      count: 0, 
      error: 'Tik OWNER gali valyti test users' 
    }
  }

  // Find test users in this org
  // Users table join memberships
  const { data: testMemberships, error: fetchError }: any = await supabase
    .from('memberships')
    .select(`
      id,
      user_id,
      member_status,
      users!inner (
        id,
        email,
        first_name
      )
    `)
    .eq('org_id', org_id)
    .neq('member_status', MEMBERSHIP_STATUS.LEFT)
    .or('email.ilike.test.%,first_name.eq.Test', { foreignTable: 'users' })

  if (fetchError) {
    console.error('Error fetching test users:', fetchError)
    return { success: false, count: 0, error: 'Klaida gaunant test users' }
  }

  if (!testMemberships || testMemberships.length === 0) {
    return { success: true, count: 0 }
  }

  // Update each membership to LEFT
  let updated = 0
  for (const membership of testMemberships) {
    const { error: updateError } = await supabase
      .from('memberships')
      .update({
        member_status: MEMBERSHIP_STATUS.LEFT,
        status_reason: 'Test user cleanup - marked as LEFT',
      })
      .eq('id', membership.id)
      .eq('org_id', org_id)

    if (!updateError) {
      updated++

      // Log audit trail
      await supabase.from('audit_logs').insert({
        org_id: org_id,
        user_id: user.id,
        action: 'TEST_USER_CLEANUP',
        target_table: 'memberships',
        target_id: membership.id,
        old_value: { member_status: membership.member_status },
        new_value: { member_status: MEMBERSHIP_STATUS.LEFT },
      })
    }
  }

  return { success: true, count: updated }
}

/**
 * List test users in organization.
 * 
 * Helps identify test users before cleanup.
 * 
 * @param org_id - Organization ID
 * @returns Array of test user memberships
 */
export async function listTestUsers(org_id: string): Promise<{
  success: boolean
  users: Array<{
    membership_id: string
    user_id: string
    email: string
    first_name: string
    last_name: string
    member_status: string
  }>
  error?: string
}> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Verify user is OWNER
  const { data: membership, error: membershipError }: any = await supabase
    .from('memberships')
    .select('id, role')
    .eq('user_id', user.id)
    .eq('org_id', org_id)
    .eq('status', MEMBERSHIP_STATUS.ACTIVE)
    .maybeSingle()

  if (membershipError || !membership || membership.role !== MEMBERSHIP_ROLE.OWNER) {
    return { 
      success: false, 
      users: [], 
      error: 'Tik OWNER gali matyti test users' 
    }
  }

  // Find test users
  const { data: testMemberships, error: fetchError }: any = await supabase
    .from('memberships')
    .select(`
      id,
      user_id,
      member_status,
      users!inner (
        id,
        email,
        first_name,
        last_name
      )
    `)
    .eq('org_id', org_id)
    .or('email.ilike.test.%,first_name.eq.Test', { foreignTable: 'users' })
    .order('created_at', { ascending: false })

  if (fetchError) {
    console.error('Error fetching test users:', fetchError)
    return { success: false, users: [], error: 'Klaida gaunant test users' }
  }

  const users = (testMemberships || []).map((m: any) => ({
    membership_id: m.id,
    user_id: m.user_id,
    email: m.users.email,
    first_name: m.users.first_name,
    last_name: m.users.last_name,
    member_status: m.member_status,
  }))

  return { success: true, users }
}

/**
 * Create test user helper.
 * 
 * Utility for quickly creating test users during development.
 * 
 * CONVENTION: All test users should have:
 * - Email starting with 'test.'
 * - First name = 'Test'
 * - Clear last name (e.g. 'User #1', 'Voter #2')
 * 
 * @param email - Email (should start with 'test.')
 * @param firstName - First name (recommend 'Test')
 * @param lastName - Last name
 * @returns User creation result
 */
export async function createTestUser(
  email: string,
  firstName: string,
  lastName: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  const supabase = await createClient()
  await requireAuth(supabase)

  // Warn if not following convention
  if (!email.startsWith('test.')) {
    console.warn('⚠️ Test user email should start with "test." for easy cleanup')
  }

  if (firstName !== 'Test') {
    console.warn('⚠️ Test user first_name should be "Test" for easy cleanup')
  }

  // Check if user already exists
  const { data: existing, error: checkError }: any = await supabase
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle()

  if (checkError) {
    console.error('Error checking existing user:', checkError)
    return { success: false, error: 'Klaida tikrinant user' }
  }

  if (existing) {
    return { 
      success: false, 
      error: 'User su tokiu email jau egzistuoja',
      userId: existing.id 
    }
  }

  // Create user
  const { data: newUser, error: createError }: any = await supabase
    .from('users')
    .insert({
      email: email.toLowerCase(),
      first_name: firstName,
      last_name: lastName,
    })
    .select('id')
    .single()

  if (createError) {
    console.error('Error creating test user:', createError)
    return { success: false, error: 'Nepavyko sukurti user' }
  }

  return { success: true, userId: newUser.id }
}

/**
 * Get test statistics for organization.
 * 
 * Shows how many test users exist and their statuses.
 * 
 * @param org_id - Organization ID
 * @returns Test user statistics
 */
export async function getTestUserStats(org_id: string): Promise<{
  success: boolean
  stats: {
    total: number
    active: number
    left: number
    suspended: number
    pending: number
  }
  error?: string
}> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data: testMemberships, error }: any = await supabase
    .from('memberships')
    .select(`
      member_status,
      users!inner (
        email,
        first_name
      )
    `)
    .eq('org_id', org_id)
    .or('email.ilike.test.%,first_name.eq.Test', { foreignTable: 'users' })

  if (error) {
    return { 
      success: false, 
      stats: { total: 0, active: 0, left: 0, suspended: 0, pending: 0 },
      error: 'Klaida gaunant statistiką' 
    }
  }

  const stats = {
    total: testMemberships?.length || 0,
    active: 0,
    left: 0,
    suspended: 0,
    pending: 0,
  }

  testMemberships?.forEach((m: any) => {
    if (m.member_status === MEMBERSHIP_STATUS.ACTIVE) stats.active++
    else if (m.member_status === MEMBERSHIP_STATUS.LEFT) stats.left++
    else if (m.member_status === MEMBERSHIP_STATUS.SUSPENDED) stats.suspended++
    else if (m.member_status === MEMBERSHIP_STATUS.PENDING) stats.pending++
  })

  return { success: true, stats }
}

