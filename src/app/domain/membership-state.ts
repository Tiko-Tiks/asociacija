/**
 * Membership State Resolver
 * 
 * Implements Section 7.3 of .cursorrules: Single Source of Truth
 * 
 * This is the ONLY place where membership state should be resolved.
 * All landing page routing decisions must use this resolver.
 * 
 * Rules:
 * - Empty result due to RLS = NO_MEMBERSHIP, NOT an error
 * - Multiple memberships: ACTIVE takes precedence over SUSPENDED
 * - Do NOT leak internal IDs or role details
 */

export type MembershipState =
  | 'UNAUTHENTICATED'
  | 'AUTHENTICATED_NO_MEMBERSHIP'
  | 'MEMBERSHIP_SUSPENDED'
  | 'MEMBERSHIP_ACTIVE'

