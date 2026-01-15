/**
 * Membership Guards
 * 
 * Centralized membership validation and authorization guards.
 * Consolidates duplicate membership checking logic across the codebase.
 */

'use server'

import { SupabaseClient } from '@supabase/supabase-js'
import { MEMBERSHIP_STATUS, MEMBERSHIP_ROLE } from '@/app/domain/constants'
import { Membership, MembershipRole } from '@/app/domain/types'
import { authViolation, accessDenied, operationFailed } from '@/app/domain/errors'

/**
 * Require active membership with optional role check
 * 
 * This is a consolidated guard that:
 * 1. Verifies user has a membership in the org
 * 2. Checks membership is ACTIVE (member_status)
 * 3. Optionally validates user has required role
 * 
 * Usage:
 * ```typescript
 * // Any active member
 * const membership = await requireActiveMembership(supabase, user.id, orgId)
 * 
 * // Only OWNER
 * const membership = await requireActiveMembership(supabase, user.id, orgId, 'OWNER')
 * 
 * // OWNER or ADMIN
 * const membership = await requireActiveMembership(supabase, user.id, orgId, ['OWNER', 'ADMIN'])
 * ```
 * 
 * @param supabase - Supabase client (must be authenticated)
 * @param userId - User ID (from auth.uid())
 * @param orgId - Organization ID
 * @param requiredRole - Optional role(s) required
 * @returns Membership object
 * @throws authViolation - RLS blocked
 * @throws accessDenied - No membership or wrong role
 * @throws operationFailed - Database error
 */
export async function requireActiveMembership(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  requiredRole?: MembershipRole | MembershipRole[]
): Promise<Membership> {
  // Query membership
  const { data: membership, error } = await supabase
    .from('memberships')
    .select('id, user_id, org_id, role, member_status, status, joined_at, left_at')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .eq('member_status', MEMBERSHIP_STATUS.ACTIVE)
    .maybeSingle()

  // Handle errors
  if (error) {
    if (error?.code === '42501') {
      authViolation()
    }
    console.error('Error fetching membership:', error)
    operationFailed('Failed to fetch membership')
  }

  // Check membership exists
  if (!membership) {
    console.error('No active membership found:', {
      userId,
      orgId,
      requiredRole,
    })
    accessDenied('No active membership in this organization')
  }

  // Validate member_status (should be ACTIVE due to query, but double-check)
  if (membership.member_status !== MEMBERSHIP_STATUS.ACTIVE) {
    console.error('Membership is not active:', {
      membershipId: membership.id,
      memberStatus: membership.member_status,
    })
    accessDenied('Membership is not active')
  }

  // Check role if required
  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    
    if (!allowedRoles.includes(membership.role as MembershipRole)) {
      console.error('User does not have required role:', {
        membershipId: membership.id,
        userRole: membership.role,
        requiredRole: allowedRoles,
      })
      accessDenied(`Required role: ${allowedRoles.join(' or ')}`)
    }
  }

  return membership as Membership
}

/**
 * Check if user has active membership (non-throwing version)
 * 
 * Useful for UI to conditionally show elements.
 * Returns null instead of throwing errors.
 * 
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param orgId - Organization ID
 * @param requiredRole - Optional role(s) required
 * @returns Membership or null
 */
export async function checkActiveMembership(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  requiredRole?: MembershipRole | MembershipRole[]
): Promise<Membership | null> {
  try {
    return await requireActiveMembership(supabase, userId, orgId, requiredRole)
  } catch (error: any) {
    // Return null for access errors (expected)
    if (
      error?.code === 'access_denied' ||
      error?.code === 'auth_violation'
    ) {
      return null
    }
    // Re-throw unexpected errors
    throw error
  }
}

/**
 * Get membership without throwing (returns null if not found)
 * 
 * Use when membership is optional.
 * 
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param orgId - Organization ID
 * @returns Membership or null
 */
export async function getMembership(
  supabase: SupabaseClient,
  userId: string,
  orgId: string
): Promise<Membership | null> {
  try {
    const { data: membership, error } = await supabase
      .from('memberships')
      .select('id, user_id, org_id, role, member_status, status, joined_at, left_at')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching membership:', error)
      return null
    }

    return membership as Membership | null
  } catch (error) {
    console.error('Exception fetching membership:', error)
    return null
  }
}

/**
 * Check if user is OWNER of organization
 * 
 * Shorthand for requireActiveMembership with OWNER role.
 * 
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param orgId - Organization ID
 * @returns true if user is OWNER
 */
export async function isOwner(
  supabase: SupabaseClient,
  userId: string,
  orgId: string
): Promise<boolean> {
  try {
    await requireActiveMembership(supabase, userId, orgId, MEMBERSHIP_ROLE.OWNER)
    return true
  } catch {
    return false
  }
}

/**
 * Require OWNER role
 * 
 * Shorthand for requireActiveMembership with OWNER role.
 * Throws if user is not an active OWNER.
 * 
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param orgId - Organization ID
 * @returns Membership
 */
export async function requireOwner(
  supabase: SupabaseClient,
  userId: string,
  orgId: string
): Promise<Membership> {
  return requireActiveMembership(supabase, userId, orgId, MEMBERSHIP_ROLE.OWNER)
}

