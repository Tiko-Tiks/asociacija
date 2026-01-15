'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'
import { MEMBERSHIP_STATUS } from '@/app/domain/constants'
import { MembershipStatus } from '@/app/domain/types'

/**
 * Server Action to list organization members.
 * 
 * Follows .cursorrules v17.2-OSMIUM-PLATINUM:
 * - Uses authenticated user client (no service_role)
 * - RLS enforces user can only see members of their own org
 * - Privacy: OWNER can see full_name, first_name, last_name, email; others see only full_name
 * 
 * @param membership_id - UUID of the current user's membership (for org context)
 * @param isOwner - Whether the current user is OWNER (allows access to email and full name details)
 * @returns Array of members with id, full_name, first_name, last_name, email (if owner), role, status, created_at
 * @throws Error('auth_violation') if authentication/authorization fails
 * @throws Error('operation_failed') if query fails
 */
export async function listOrganizationMembers(
  membership_id: string,
  isOwner: boolean = false
): Promise<
  Array<{
    id: string
    user_id: string
    full_name: string | null
    first_name: string | null
    last_name: string | null
    email: string | null
    role: string
    status: MembershipStatus
    member_status: string
    created_at: string
    metadata?: any
  }>
> {
  // Get authenticated Supabase client (respects RLS, uses auth.uid())
  const supabase = await createClient()

  // Step 1: Authenticate user via auth.uid()
  const user = await requireAuth(supabase)

  // Step 2: Get user's membership to derive org_id
  // RLS will enforce user can only see their own membership
  // NOTE: v19.0 schema - use member_status (not status)
  const { data: currentMembership, error: membershipError }: any = await supabase
    .from('memberships')
    .select('org_id, member_status')
    .eq('id', membership_id)
    .eq('user_id', user.id)
    .in('member_status', [MEMBERSHIP_STATUS.ACTIVE, MEMBERSHIP_STATUS.PENDING])
    .single()

  if (membershipError || !currentMembership) {
    // Check if error is due to RLS violation
    if (membershipError?.code === '42501') {
      authViolation()
    }
    console.error('MEMBERS FETCH ERROR (current membership query):', membershipError)
    operationFailed()
  }

  // Step 3: Query all memberships for this org
  // RLS on memberships will enforce user can only see members of their org
  // NOTE: v19.0 schema - metadata column does NOT exist in memberships table
  const { data: memberships, error: membershipsError }: any = await supabase
    .from('memberships')
    .select('id, user_id, role, member_status, joined_at')
    .eq('org_id', currentMembership.org_id)
    .order('joined_at', { ascending: false })

  if (membershipsError) {
    // Check if error is due to RLS violation
    if (membershipsError?.code === '42501') {
      authViolation()
    }
    console.error('MEMBERS FETCH ERROR (memberships query):', membershipsError)
    operationFailed()
  }

  if (!memberships || memberships.length === 0) {
    return []
  }

  // Step 4: Query profiles for all user_ids
  // OWNER can see full_name and email; others see only full_name
  const userIds = memberships.map((m: any) => m.user_id)
  // NOTE: profiles.email yra prieinamas per RLS, jei OWNER
  const profilesSelect = isOwner ? 'id, full_name, email' : 'id, full_name'
  const { data: profiles, error: profilesError }: any = await supabase
    .from('profiles')
    .select(profilesSelect)
    .in('id', userIds)

  if (profilesError) {
    // Check if error is due to RLS violation
    if (profilesError?.code === '42501') {
      authViolation()
    }
    console.error('MEMBERS FETCH ERROR (profiles query):', profilesError)
    operationFailed()
  }

  // Step 6: Combine memberships with profiles and split full_name
  // NOTE: email gali būti gaunamas iš profiles lentelės, jei OWNER (per RLS)
  const profilesMap = new Map(
    (profiles || []).map((p: any) => {
      // Split full_name into first_name and last_name
      let first_name: string | null = null
      let last_name: string | null = null
      if (p.full_name) {
        const parts = p.full_name.trim().split(/\s+/)
        if (parts.length >= 2) {
          first_name = parts[0]
          last_name = parts.slice(1).join(' ')
        } else if (parts.length === 1) {
          first_name = parts[0]
          last_name = ''
        }
      }
      
      return [
        p.id, 
        {
          full_name: p.full_name || null,
          first_name: first_name,
          last_name: last_name,
          // OWNER gali matyti email iš profiles lentelės (per RLS)
          email: isOwner ? (p.email || null) : null,
        }
      ]
    })
  )

  const result = memberships.map((membership: any) => {
    const profile = profilesMap.get(membership.user_id) || {
      full_name: null,
      first_name: null,
      last_name: null,
      email: null,
    }
    
    const memberData = {
      id: membership.id,
      user_id: membership.user_id, // Include user_id for positions lookup
      full_name: profile.full_name,
      // NOTE: first_name ir last_name visada grąžinami (išskleidžiami iš full_name)
      // Tai leidžia komponentui rodyti vardą/pavardę net jei full_name yra null
      // OWNER gali matyti išskleidžiamus duomenis, bet visi gali matyti full_name
      first_name: profile.first_name, // Visada grąžinamas (ne tik OWNER)
      last_name: profile.last_name, // Visada grąžinamas (ne tik OWNER)
      // OWNER gali matyti email iš profiles lentelės (per RLS)
      email: profile.email || null,
      role: membership.role || '',
      status: membership.member_status as MembershipStatus, // Use member_status as status (v19.0 schema)
      member_status: membership.member_status || 'PENDING',
      created_at: membership.joined_at, // Using joined_at from DB, but keeping created_at name for API compatibility
      metadata: null, // NOTE: v19.0 schema - metadata column does NOT exist in memberships table
    }
    
    return memberData
  })
  
  return result
}

