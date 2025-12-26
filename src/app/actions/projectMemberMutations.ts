'use server'

import { createClient } from '@/lib/supabase/server'
import { ERROR_CODE } from '@/app/domain/constants'
import {
  requireAuth,
  loadActiveMembership,
  loadProjectForMembership,
  loadProjectRole,
} from './_guards'
import { canEditProject, canDeleteProject } from '@/app/domain/permissions'
import { authViolation, crossOrgViolation, operationFailed } from '@/app/domain/errors'

/**
 * Internal error helper for cross-org violations.
 * Follows .cursorrules: Use stable error codes for deterministic error handling.
 */
function throwCrossOrgViolation(): never {
  crossOrgViolation()
}

/**
 * Server Action to add a member to a project.
 * 
 * Follows .cursorrules v17.2-OSMIUM-PLATINUM:
 * - Uses authenticated user client (no service_role)
 * - Derives org_id from DB (source of truth)
 * - Validates membership status = 'ACTIVE'
 * - Enforces cross-org validation
 * - Requires EDITOR or OWNER role to add members
 * - RLS enforces access control
 * 
 * @param project_id - UUID of the project
 * @param membership_id - UUID of the membership (must be ACTIVE and match project org)
 * @param user_id - UUID of the user to add to the project
 * @param role - Role to assign (VIEWER or EDITOR)
 * @throws Error('cross_org_violation') if validation or permission check fails
 * @throws Error('auth_violation') if authentication/authorization fails
 * @throws Error('operation_failed') if insert fails
 */
export async function addProjectMember(
  project_id: string,
  membership_id: string,
  user_id: string,
  role: 'VIEWER' | 'EDITOR'
): Promise<void> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Step 2: Load and validate active membership (SOURCE OF TRUTH)
  // DO NOT accept org_id from client parameters
  const membership = await loadActiveMembership(supabase, membership_id, user.id)

  // Step 3: Load and validate project belongs to same org
  const project = await loadProjectForMembership(
    supabase,
    project_id,
    membership.org_id
  )

  // Step 4: Load user's role and check permission to edit
  const ownerRole = await loadProjectRole(supabase, project_id, user.id)
  if (!canEditProject(ownerRole)) {
    throwCrossOrgViolation()
  }

  // Step 5: Insert project member
  const { error }: any = await (supabase
    .from('project_members') as any)
    .insert({ project_id, user_id, role })

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    operationFailed()
  }
}

/**
 * Server Action to update a project member's role.
 * 
 * Follows .cursorrules v17.2-OSMIUM-PLATINUM:
 * - Uses authenticated user client (no service_role)
 * - Derives org_id from DB (source of truth)
 * - Validates membership status = 'ACTIVE'
 * - Enforces cross-org validation
 * - Requires EDITOR or OWNER role to update member roles
 * - RLS enforces access control
 * 
 * @param project_id - UUID of the project
 * @param membership_id - UUID of the membership (must be ACTIVE and match project org)
 * @param user_id - UUID of the user whose role to update
 * @param role - New role to assign (VIEWER or EDITOR)
 * @throws Error('cross_org_violation') if validation or permission check fails
 * @throws Error('auth_violation') if authentication/authorization fails
 * @throws Error('operation_failed') if update fails
 */
export async function updateProjectMemberRole(
  project_id: string,
  membership_id: string,
  user_id: string,
  role: 'VIEWER' | 'EDITOR'
): Promise<void> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Step 2: Load and validate active membership (SOURCE OF TRUTH)
  // DO NOT accept org_id from client parameters
  const membership = await loadActiveMembership(supabase, membership_id, user.id)

  // Step 3: Load and validate project belongs to same org
  const project = await loadProjectForMembership(
    supabase,
    project_id,
    membership.org_id
  )

  // Step 4: Load user's role and check permission to edit
  const ownerRole = await loadProjectRole(supabase, project_id, user.id)
  if (!canEditProject(ownerRole)) {
    throwCrossOrgViolation()
  }

  // Step 5: Update project member role
  const { error }: any = await (supabase
    .from('project_members') as any)
    .update({ role })
    .eq('project_id', project_id)
    .eq('user_id', user_id)

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    operationFailed()
  }
}

/**
 * Server Action to remove a member from a project.
 * 
 * Follows .cursorrules v17.2-OSMIUM-PLATINUM:
 * - Uses authenticated user client (no service_role)
 * - Derives org_id from DB (source of truth)
 * - Validates membership status = 'ACTIVE'
 * - Enforces cross-org validation
 * - Requires OWNER role to remove members
 * - RLS enforces access control
 * 
 * @param project_id - UUID of the project
 * @param membership_id - UUID of the membership (must be ACTIVE and match project org)
 * @param user_id - UUID of the user to remove from the project
 * @throws Error('cross_org_violation') if validation or permission check fails
 * @throws Error('auth_violation') if authentication/authorization fails
 * @throws Error('operation_failed') if delete fails
 */
export async function removeProjectMember(
  project_id: string,
  membership_id: string,
  user_id: string
): Promise<void> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Step 2: Load and validate active membership (SOURCE OF TRUTH)
  // DO NOT accept org_id from client parameters
  const membership = await loadActiveMembership(supabase, membership_id, user.id)

  // Step 3: Load and validate project belongs to same org
  const project = await loadProjectForMembership(
    supabase,
    project_id,
    membership.org_id
  )

  // Step 4: Load user's role and check permission to delete
  const ownerRole = await loadProjectRole(supabase, project_id, user.id)
  if (!canDeleteProject(ownerRole)) {
    throwCrossOrgViolation()
  }

  // Step 5: Delete project member
  const { error }: any = await (supabase
    .from('project_members') as any)
    .delete()
    .eq('project_id', project_id)
    .eq('user_id', user_id)

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    operationFailed()
  }
}

