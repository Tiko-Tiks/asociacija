'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  requireAuth,
  loadActiveMembership,
  loadProjectForMembership,
  loadProjectRole,
} from './_guards'
import { ProjectRole } from '@/app/domain/types'
import { authViolation, crossOrgViolation, operationFailed } from '@/app/domain/errors'
import {
  canEditProject,
  canDeleteProject,
} from '@/app/domain/permissions'

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
 * - Requires OWNER or EDITOR role to add members
 * 
 * @param project_id - UUID of the project
 * @param membership_id - UUID of the membership (must be ACTIVE and match project org)
 * @param user_id - UUID of the user to add to the project
 * @param role - Role to assign (OWNER, EDITOR, or VIEWER)
 * @returns The created project_member id
 * @throws Error('cross_org_violation') if validation fails
 * @throws Error('auth_violation') if authentication/authorization fails
 * @throws Error('operation_failed') if insert fails
 */
export async function addProjectMember(
  project_id: string,
  membership_id: string,
  user_id: string,
  role: ProjectRole
): Promise<{ id: string }> {
  // Get authenticated Supabase client (respects RLS, uses auth.uid())
  const supabase = await createClient()

  // Step 1: Authenticate user via auth.uid()
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

  // Step 4: Load current user's role and check permission to edit
  const currentUserRole = await loadProjectRole(supabase, project_id, user.id)
  if (!canEditProject(currentUserRole)) {
    throwCrossOrgViolation()
  }

  // Step 5: Insert project member
  const { data: projectMember, error: insertError }: any = await (supabase
    .from('project_members') as any)
    .insert({
      project_id: project_id,
      user_id: user_id,
      role: role,
    })
    .select('id')
    .single()

  if (insertError || !projectMember) {
    // Check if error is due to RLS violation
    if (insertError?.code === '42501') {
      authViolation()
    }
    operationFailed()
  }

  // Revalidate relevant paths (optional, for cache invalidation)
  revalidatePath(`/projects/${project_id}`)

  return { id: projectMember.id }
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
 * 
 * @param project_id - UUID of the project
 * @param membership_id - UUID of the membership (must be ACTIVE and match project org)
 * @param user_id - UUID of the user to remove from the project
 * @returns The deleted project_member id
 * @throws Error('cross_org_violation') if validation fails
 * @throws Error('auth_violation') if authentication/authorization fails
 * @throws Error('operation_failed') if delete fails
 */
export async function removeProjectMember(
  project_id: string,
  membership_id: string,
  user_id: string
): Promise<{ id: string }> {
  // Get authenticated Supabase client (respects RLS, uses auth.uid())
  const supabase = await createClient()

  // Step 1: Authenticate user via auth.uid()
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

  // Step 4: Load current user's role and check permission to delete (OWNER only)
  const currentUserRole = await loadProjectRole(supabase, project_id, user.id)
  if (!canDeleteProject(currentUserRole)) {
    throwCrossOrgViolation()
  }

  // Step 5: Delete project member
  const { data: deletedMember, error: deleteError }: any = await (supabase
    .from('project_members') as any)
    .delete()
    .eq('project_id', project_id)
    .eq('user_id', user_id)
    .select('id')
    .single()

  if (deleteError || !deletedMember) {
    // Check if error is due to RLS violation
    if (deleteError?.code === '42501') {
      authViolation()
    }
    operationFailed()
  }

  // Revalidate relevant paths (optional, for cache invalidation)
  revalidatePath(`/projects/${project_id}`)

  return { id: deletedMember.id }
}

/**
 * Server Action to update a project member's role.
 * 
 * Follows .cursorrules v17.2-OSMIUM-PLATINUM:
 * - Uses authenticated user client (no service_role)
 * - Derives org_id from DB (source of truth)
 * - Validates membership status = 'ACTIVE'
 * - Enforces cross-org validation
 * - Requires OWNER role to update member roles
 * 
 * @param project_id - UUID of the project
 * @param membership_id - UUID of the membership (must be ACTIVE and match project org)
 * @param user_id - UUID of the user whose role to update
 * @param role - New role to assign (OWNER, EDITOR, or VIEWER)
 * @returns The updated project_member id
 * @throws Error('cross_org_violation') if validation fails
 * @throws Error('auth_violation') if authentication/authorization fails
 * @throws Error('operation_failed') if update fails
 */
export async function updateProjectMemberRole(
  project_id: string,
  membership_id: string,
  user_id: string,
  role: ProjectRole
): Promise<{ id: string }> {
  // Get authenticated Supabase client (respects RLS, uses auth.uid())
  const supabase = await createClient()

  // Step 1: Authenticate user via auth.uid()
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

  // Step 4: Load current user's role and check permission to delete (OWNER only)
  const currentUserRole = await loadProjectRole(supabase, project_id, user.id)
  if (!canDeleteProject(currentUserRole)) {
    throwCrossOrgViolation()
  }

  // Step 5: Update project member role
  const { data: updatedMember, error: updateError }: any = await (supabase
    .from('project_members') as any)
    .update({ role: role })
    .eq('project_id', project_id)
    .eq('user_id', user_id)
    .select('id')
    .single()

  if (updateError || !updatedMember) {
    // Check if error is due to RLS violation
    if (updateError?.code === '42501') {
      authViolation()
    }
    operationFailed()
  }

  // Revalidate relevant paths (optional, for cache invalidation)
  revalidatePath(`/projects/${project_id}`)

  return { id: updatedMember.id }
}

/**
 * Server Action to list project members.
 * 
 * Follows .cursorrules v17.2-OSMIUM-PLATINUM:
 * - Uses authenticated user client (no service_role)
 * - RLS enforces access control
 * - No select('*') - selects only necessary fields
 * 
 * @param project_id - UUID of the project
 * @returns List of project members (id, user_id, role)
 * @throws Error('auth_violation') if authentication/authorization fails
 * @throws Error('cross_org_violation') if query fails
 */
export async function listProjectMembers(
  project_id: string
): Promise<Array<{ id: string; user_id: string; role: string }>> {
  // Get authenticated Supabase client (respects RLS, uses auth.uid())
  const supabase = await createClient()

  // Step 1: Authenticate user via auth.uid()
  const user = await requireAuth(supabase)

  // Step 2: Query project members
  // RLS policies will enforce that user can only see members of projects they have access to
  const { data, error }: any = await supabase
    .from('project_members')
    .select('id, user_id, role')
    .eq('project_id', project_id)

  if (error) {
    // Check if error is due to RLS violation
    if (error.code === '42501') {
      authViolation()
    }
    throwCrossOrgViolation()
  }

  return data ?? []
}

