'use server'

import { MEMBERSHIP_STATUS, PROJECT_ROLE } from '@/app/domain/constants'
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
export async function requireAuth(supabase: any): Promise<{ id: string; email?: string }> {
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
 * - Membership member_status = 'ACTIVE' (per .cursorrules 1.1)
 * - Membership belongs to the authenticated user (membership.user_id === user_id)
 * 
 * CRITICAL: Uses member_status (not status) per schema fix.
 * 
 * @param supabase - Authenticated Supabase client
 * @param membership_id - UUID of the membership
 * @param user_id - UUID of the authenticated user (from requireAuth)
 * @returns The membership object with org_id, member_status, user_id
 * @throws Error('cross_org_violation') if validation fails
 */
export async function loadActiveMembership(
  supabase: any,
  membership_id: string,
  user_id: string
): Promise<{ org_id: string; member_status: MembershipStatus; user_id: string }> {
  // Load membership by membership_id (SOURCE OF TRUTH)
  // DO NOT accept org_id from client parameters
  // CRITICAL: Use member_status (not status) per schema fix
  const { data: membership, error: membershipError }: any = await supabase
    .from('memberships')
    .select('org_id, member_status, user_id')
    .eq('id', membership_id)
    .single()

  if (membershipError || !membership) {
    throwCrossOrgViolation()
  }

  // Validate membership member_status = 'ACTIVE'
  // CRITICAL: Use member_status (not status) per schema fix
  // Suspended users are NOT members (per .cursorrules 1.1)
  if (membership.member_status !== MEMBERSHIP_STATUS.ACTIVE) {
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
 * CRITICAL: Derives org context from PROJECT, not UI context.
 * For pilot: Returns role directly from memberships.role (no project_members dependency).
 * 
 * Validates:
 * - Project exists and extracts project.org_id (SOURCE OF TRUTH)
 * - User has ACTIVE membership in project.org_id
 * - Returns role from memberships.role
 * 
 * @param supabase - Authenticated Supabase client
 * @param project_id - UUID of the project
 * @param user_id - UUID of the authenticated user (from requireAuth)
 * @returns The user's role from memberships.role
 * @throws Error('cross_org_violation') if project not found or no ACTIVE membership
 * @throws Error('auth_violation') if RLS violation (code 42501)
 */
export async function loadProjectRole(
  supabase: any,
  project_id: string,
  user_id: string
): Promise<ProjectRole> {
  // Step 1: Fetch project by projectId → extract project.org_id (SOURCE OF TRUTH)
  const { data: project, error: projectError }: any = await supabase
    .from('projects')
    .select('id, org_id')
    .eq('id', project_id)
    .single()

  if (projectError || !project) {
    if (projectError?.code === '42501') {
      authViolation()
    }
    throwCrossOrgViolation()
  }

  // Step 2: Fetch ACTIVE membership with role where:
  //   user_id = auth.uid()
  //   org_id = project.org_id
  //   status = 'ACTIVE'
  const { data: membership, error: membershipError }: any = await supabase
    .from('memberships')
    .select('id, role')
    .eq('user_id', user_id)
    .eq('org_id', project.org_id)
    .eq('status', MEMBERSHIP_STATUS.ACTIVE)
    .maybeSingle()

  if (membershipError) {
    if (membershipError?.code === '42501') {
      authViolation()
    }
    throwCrossOrgViolation()
  }

  // Step 3: If NO membership → throw cross_org_violation
  if (!membership) {
    throwCrossOrgViolation()
  }

  // Step 4: Return role from memberships.role
  return membership.role as ProjectRole
}

