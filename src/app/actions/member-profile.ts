'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth, loadActiveMembership } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'
import { MEMBERSHIP_STATUS } from '@/app/domain/constants'

/**
 * Server Action to get current user's member profile.
 * 
 * Returns profile information for the authenticated user in the specified organization.
 * 
 * @param membership_id - UUID of the current user's membership (for org context)
 * @returns Member profile data including personal info, membership status, and positions
 * @throws Error('auth_violation') if authentication/authorization fails
 * @throws Error('operation_failed') if query fails
 */
export async function getMemberProfile(
  membership_id: string
): Promise<{
  full_name: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  role: string
  member_status: string
  joined_at: string | null
  positions: string[]
} | null> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  
  // Get user's membership
  const membership = await loadActiveMembership(supabase, membership_id, user.id)

  // Get profile information
  const { data: profile, error: profileError }: any = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', user.id)
    .single()

  if (profileError) {
    if (profileError?.code === '42501') {
      authViolation()
    }
    console.error('Error fetching profile:', profileError)
    operationFailed()
  }

  // Split full_name into first_name and last_name
  // Simple heuristic: split by first space
  let first_name: string | null = null
  let last_name: string | null = null
  if (profile?.full_name) {
    const parts = profile.full_name.trim().split(/\s+/)
    if (parts.length >= 2) {
      first_name = parts[0]
      last_name = parts.slice(1).join(' ')
    } else if (parts.length === 1) {
      first_name = parts[0]
      last_name = ''
    }
  }

  // Get active positions for this user in this org
  const { data: positions, error: positionsError }: any = await supabase
    .from('positions')
    .select('title')
    .eq('org_id', membership.org_id)
    .eq('user_id', user.id)
    .eq('is_active', true)

  if (positionsError) {
    if (positionsError?.code === '42501') {
      authViolation()
    }
    // Don't fail if positions query fails, just continue without positions
    console.error('Error fetching positions:', positionsError)
  }

  return {
    full_name: profile?.full_name || null,
    first_name: first_name,
    last_name: last_name,
    email: user.email || null,
    role: membership.role || 'MEMBER',
    member_status: membership.member_status || 'PENDING',
    joined_at: membership.joined_at || null,
    positions: (positions || []).map((p: any) => p.title),
  }
}

