'use server'

import { MEMBERSHIP_STATUS } from '@/app/domain/constants'
import { MembershipStatus, ProjectStatus, ProjectRole } from '@/app/domain/types'
import { authViolation, crossOrgViolation } from '@/app/domain/errors'

/**
 * Security guards for server actions.
 * Follows .cursorrules v17.2-OSMIUM-PLATINUM:
 * - Uses authenticated user client (no service_role)
 * - Enforces membership status = 'ACTIVE'
 * - Enforces cross-org validation
 */

/**
 * Internal error helper for cross-org violations.
 * Follows .cursorrules: Use stable error codes for deterministic error handling.
 */
function throwCrossOrgViolation(): never {
  crossOrgViolation()
}

/**
 * Requires user authentication via auth.uid().
 * 
 * @param supabase - Authenticated Supabase client
 * @returns The authenticated user
 * @throws Error('auth_violation') if user is not authenticated
 */
export async function requireAuth(supabase: any): Promise<{ id: string }> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    authViolation()
  }

  return user
}

/**
 * Loads and validates an active membership.
 * 
 * Validates:
 * - Membership exists
 * - Membership status = 'ACTIVE' (per .cursorrules 1.1)
 * - Membership belongs to the authenticated user (membership.user_id === user_id)
 * 
 * @param supabase - Authenticated Supabase client
 * @param membership_id - UUID of the membership
 * @param user_id - UUID of the authenticated user (from requireAuth)
 * @returns The membership object with org_id, status, user_id
 * @throws Error('cross_org_violation') if validation fails
 */
export async function loadActiveMembership(
  supabase: any,
  membership_id: string,
  user_id: string
): Promise<{ org_id: string; status: MembershipStatus; user_id: string }> {
  // Load membership by membership_id (SOURCE OF TRUTH)
  // DO NOT accept org_id from client parameters
  const { data: membership, error: membershipError }: any = await supabase
    .from('memberships')
    .select('org_id, status, user_id')
    .eq('id', membership_id)
    .single()

  if (membershipError || !membership) {
    throwCrossOrgViolation()
  }

  // Validate membership status = 'ACTIVE'
  // Suspended users are NOT members (per .cursorrules 1.1)
  if (membership.status !== MEMBERSHIP_STATUS.ACTIVE) {
    throwCrossOrgViolation()
  }

  // Validate that the authenticated user owns this membership
  if (membership.user_id !== user_id) {
    throwCrossOrgViolation()
  }

  return membership
}

/**
 * Loads and validates a project belongs to the same organization as membership.
 * 
 * Validates:
 * - Project exists
 * - Project belongs to the same org (project.org_id === expected_org_id)
 * 
 * @param supabase - Authenticated Supabase client
 * @param project_id - UUID of the project
 * @param expected_org_id - Expected org_id (from membership.org_id)
 * @param fields - Optional fields to select (default: 'id, org_id')
 * @returns The project object
 * @throws Error('cross_org_violation') if validation fails
 * @throws Error('auth_violation') if RLS violation (code 42501)
 */
export async function loadProjectForMembership(
  supabase: any,
  project_id: string,
  expected_org_id: string,
  fields: string = 'id, org_id'
): Promise<{ id: string; org_id: string; status?: ProjectStatus }> {
  // Load project by project_id and derive project.org_id from DB
  const { data: project, error: projectError }: any = await supabase
    .from('projects')
    .select(fields)
    .eq('id', project_id)
    .single()

  if (projectError || !project) {
    // Check if error is due to RLS violation
    if (projectError?.code === '42501') {
      authViolation()
    }
    throwCrossOrgViolation()
  }

  // Verify project.org_id === expected_org_id
  // Cross-org validation (per .cursorrules 1.3)
  if (project.org_id !== expected_org_id) {
    throwCrossOrgViolation()
  }

  return project
}

/**
 * Loads and validates a user's role for a project.
 * 
 * Validates:
 * - Project exists (via project table query)
 * - User has access to project (via project_members table)
 * - Role is returned
 * 
 * Note: Assumes project_members table with (project_id, user_id, role)
 * RLS on project_members should enforce org-level access.
 * 
 * @param supabase - Authenticated Supabase client
 * @param project_id - UUID of the project
 * @param user_id - UUID of the authenticated user (from requireAuth)
 * @returns The user's role for the project
 * @throws Error('cross_org_violation') if project not found or user has no access
 * @throws Error('auth_violation') if RLS violation (code 42501)
 */
export async function loadProjectRole(
  supabase: any,
  project_id: string,
  user_id: string
): Promise<ProjectRole> {
  // Step 1: Validate project exists and is accessible (RLS will enforce access)
  const { data: project, error: projectError }: any = await supabase
    .from('projects')
    .select('id')
    .eq('id', project_id)
    .single()

  if (projectError || !project) {
    // Check if error is due to RLS violation
    if (projectError?.code === '42501') {
      authViolation()
    }
    throwCrossOrgViolation()
  }

  // Step 2: Load user's role for this project
  // Assumes project_members table with (project_id, user_id, role)
  // RLS on project_members should enforce that user can only see their own entries
  // and that they're in the same org as the project
  const { data: projectMember, error: memberError }: any = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', project_id)
    .eq('user_id', user_id)
    .single()

  if (memberError || !projectMember) {
    // Check if error is due to RLS violation
    if (memberError?.code === '42501') {
      authViolation()
    }
    throwCrossOrgViolation()
  }

  return projectMember.role as ProjectRole
}

