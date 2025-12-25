'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  requireAuth,
  loadActiveMembership,
  loadProjectForMembership,
  loadProjectRole,
} from './_guards'
import { MEMBERSHIP_STATUS, PROJECT_STATUS } from '@/app/domain/constants'
import { MembershipStatus, ProjectStatus } from '@/app/domain/types'
import { authViolation, crossOrgViolation, operationFailed } from '@/app/domain/errors'
import {
  canEditProject,
  canDeleteProject,
  canArchiveProject,
} from '@/app/domain/permissions'

/**
 * Internal error helper for cross-org violations.
 * Follows .cursorrules: Use stable error codes for deterministic error handling.
 */
function throwCrossOrgViolation(): never {
  crossOrgViolation()
}

/**
 * Server Action to create a project.
 * 
 * Follows .cursorrules v17.2-OSMIUM-PLATINUM:
 * - Uses authenticated user client (no service_role)
 * - Derives org_id from DB (source of truth)
 * - Validates membership status = 'ACTIVE'
 * - Enforces cross-org validation
 * 
 * @param membership_id - UUID of the membership (must be ACTIVE)
 * @param name - Name of the project
 * @returns The created project id
 * @throws Error('cross_org_violation') if membership validation fails
 * @throws Error if membership not found or not active
 */
export async function createProject(
  membership_id: string,
  name: string
): Promise<{ id: string }> {
  // Get authenticated Supabase client (respects RLS, uses auth.uid())
  const supabase = await createClient()

  // Step 1: Authenticate user via auth.uid()
  const user = await requireAuth(supabase)

  // Step 2: Load and validate active membership (SOURCE OF TRUTH)
  // DO NOT accept org_id from client parameters
  const membership = await loadActiveMembership(supabase, membership_id, user.id)

  // Step 3: Insert project with org_id derived from DB (not from client)
  // RLS policies will be enforced by Supabase
  const initialStatus: ProjectStatus = PROJECT_STATUS.DRAFT
  const { data: project, error: insertError }: any = await (supabase
    .from('projects') as any)
    .insert({
      org_id: membership.org_id, // Derived from DB, NOT from client
      membership_id: membership_id,
      name: name.trim(),
      status: initialStatus, // Assuming default status
    })
    .select('id')
    .single()

  if (insertError || !project) {
    // Check if error is due to RLS violation
    if (insertError?.code === '42501') {
      authViolation()
    }
    operationFailed()
  }

  // Revalidate relevant paths (optional, for cache invalidation)
  revalidatePath('/dashboard/projects')

  return { id: project.id }
}

/**
 * Server Action to list projects for the current user.
 * 
 * Follows .cursorrules v17.2-OSMIUM-PLATINUM:
 * - Uses authenticated user client (no service_role)
 * - Derives org scope from memberships table (source of truth)
 * - Only returns projects from orgs where user has ACTIVE membership
 * - No select('*') - selects only necessary fields
 * 
 * @returns List of projects the user is allowed to see
 * @throws Error if user is not authenticated
 */
export async function listProjects(): Promise<
  Array<{ id: string; name: string; org_id: string }>
> {
  // Get authenticated Supabase client (respects RLS, uses auth.uid())
  const supabase = await createClient()

  // Step 1: Authenticate user via auth.uid()
  const user = await requireAuth(supabase)

  // Step 2: Derive accessible org_ids from memberships table (SOURCE OF TRUTH)
  // DO NOT accept org_id from client parameters
  // Only get orgs where user has ACTIVE membership
  const { data: memberships, error: membershipsError }: any = await supabase
    .from('memberships')
    .select('org_id') // Only select org_id, not select('*')
    .eq('user_id', user.id)
    .eq('status', MEMBERSHIP_STATUS.ACTIVE) // Only ACTIVE memberships (per .cursorrules 1.1)

  if (membershipsError) {
    operationFailed()
  }

  // If user has no active memberships, return empty array
  if (!memberships || memberships.length === 0) {
    return []
  }

  // Extract unique org_ids from memberships
  const orgIds = [...new Set(memberships.map((m: any) => m.org_id))]

  // Step 3: Query projects from accessible orgs
  // RLS policies will enforce additional security
  // Select only necessary fields: id, name, org_id (NOT select('*'))
  const { data: projects, error: projectsError }: any = await supabase
    .from('projects')
    .select('id, name, org_id') // Explicit field selection, not select('*')
    .in('org_id', orgIds)
    .order('created_at', { ascending: false })

  if (projectsError) {
    // Check if error is due to RLS violation
    if (projectsError.code === '42501') {
      authViolation()
    }
    operationFailed()
  }

  return projects || []
}

/**
 * Server Action to update a project name.
 * 
 * Follows .cursorrules v17.2-OSMIUM-PLATINUM:
 * - Uses authenticated user client (no service_role)
 * - Derives org_id from DB (source of truth)
 * - Validates membership status = 'ACTIVE'
 * - Enforces cross-org validation
 * 
 * @param project_id - UUID of the project to update
 * @param membership_id - UUID of the membership (must be ACTIVE and match project org)
 * @param name - New name for the project
 * @returns The updated project id
 * @throws Error('cross_org_violation') if validation fails
 * @throws Error('auth_violation') if authentication/authorization fails
 * @throws Error('operation_failed') if update fails
 */
export async function updateProjectName(
  project_id: string,
  membership_id: string,
  name: string
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

  // Step 4: Load user's role and check permission to edit
  const role = await loadProjectRole(supabase, project_id, user.id)
  if (!canEditProject(role)) {
    throwCrossOrgViolation()
  }

  // Update only the project name (trimmed)
  // Do not update org_id, membership_id, or status
  const { data: updatedProject, error: updateError }: any = await (supabase
    .from('projects') as any)
    .update({ name: name.trim() })
    .eq('id', project_id)
    .select('id')
    .single()

  if (updateError || !updatedProject) {
    // Check if error is due to RLS violation
    if (updateError?.code === '42501') {
      authViolation()
    }
    operationFailed()
  }

  // Revalidate relevant paths (optional, for cache invalidation)
  revalidatePath('/dashboard/projects')

  return { id: updatedProject.id }
}

/**
 * Server Action to delete a project.
 * 
 * Follows .cursorrules v17.2-OSMIUM-PLATINUM:
 * - Uses authenticated user client (no service_role)
 * - Derives org_id from DB (source of truth)
 * - Validates membership status = 'ACTIVE'
 * - Enforces cross-org validation
 * 
 * @param project_id - UUID of the project to delete
 * @param membership_id - UUID of the membership (must be ACTIVE and match project org)
 * @returns The deleted project id
 * @throws Error('cross_org_violation') if validation fails
 * @throws Error('auth_violation') if authentication/authorization fails
 * @throws Error('operation_failed') if delete fails
 */
export async function deleteProject(
  project_id: string,
  membership_id: string
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

  // Step 4: Load user's role and check permission to delete
  const role = await loadProjectRole(supabase, project_id, user.id)
  if (!canDeleteProject(role)) {
    throwCrossOrgViolation()
  }

  // Delete the project by project_id only
  // Do not delete related records - assume DB triggers handle cascading or audit
  const { data: deletedProject, error: deleteError }: any = await supabase
    .from('projects')
    .delete()
    .eq('id', project_id)
    .select('id')
    .single()

  if (deleteError || !deletedProject) {
    // Check if error is due to RLS violation
    if (deleteError?.code === '42501') {
      authViolation()
    }
    operationFailed()
  }

  // Revalidate relevant paths (optional, for cache invalidation)
  revalidatePath('/dashboard/projects')

  return { id: deletedProject.id }
}

/**
 * Server Action to archive a project.
 * 
 * Follows .cursorrules v17.2-OSMIUM-PLATINUM:
 * - Uses authenticated user client (no service_role)
 * - Derives org_id from DB (source of truth)
 * - Validates membership status = 'ACTIVE'
 * - Enforces cross-org validation
 * 
 * @param project_id - UUID of the project to archive
 * @param membership_id - UUID of the membership (must be ACTIVE and match project org)
 * @returns The archived project id
 * @throws Error('cross_org_violation') if validation fails
 * @throws Error('auth_violation') if authentication/authorization fails
 * @throws Error('operation_failed') if archive fails
 */
export async function archiveProject(
  project_id: string,
  membership_id: string
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

  // Step 4: Load user's role and check permission to archive
  const role = await loadProjectRole(supabase, project_id, user.id)
  if (!canArchiveProject(role)) {
    throwCrossOrgViolation()
  }

  // Update only the project status to 'ARCHIVED'
  // Do not update org_id or membership_id
  const archivedStatus: ProjectStatus = PROJECT_STATUS.ARCHIVED
  const { data: archivedProject, error: updateError }: any = await (supabase
    .from('projects') as any)
    .update({ status: archivedStatus })
    .eq('id', project_id)
    .select('id')
    .single()

  if (updateError || !archivedProject) {
    // Check if error is due to RLS violation
    if (updateError?.code === '42501') {
      authViolation()
    }
    operationFailed()
  }

  // Revalidate relevant paths (optional, for cache invalidation)
  revalidatePath('/dashboard/projects')

  return { id: archivedProject.id }
}

/**
 * Server Action to restore an archived project.
 * 
 * Follows .cursorrules v17.2-OSMIUM-PLATINUM:
 * - Uses authenticated user client (no service_role)
 * - Derives org_id from DB (source of truth)
 * - Validates membership status = 'ACTIVE'
 * - Enforces cross-org validation
 * - Validates project status = 'ARCHIVED' before restore
 * 
 * @param project_id - UUID of the project to restore
 * @param membership_id - UUID of the membership (must be ACTIVE and match project org)
 * @returns The restored project id
 * @throws Error('cross_org_violation') if validation fails
 * @throws Error('auth_violation') if authentication/authorization fails
 * @throws Error('operation_failed') if project is not archived or update fails
 */
export async function restoreProject(
  project_id: string,
  membership_id: string
): Promise<{ id: string }> {
  // Get authenticated Supabase client (respects RLS, uses auth.uid())
  const supabase = await createClient()

  // Step 1: Authenticate user via auth.uid()
  const user = await requireAuth(supabase)

  // Step 2: Load and validate active membership (SOURCE OF TRUTH)
  // DO NOT accept org_id from client parameters
  const membership = await loadActiveMembership(supabase, membership_id, user.id)

  // Step 3: Load and validate project belongs to same org (with status field)
  const project = await loadProjectForMembership(
    supabase,
    project_id,
    membership.org_id,
    'id, org_id, status'
  )

  // Step 4: Validate project status is ARCHIVED (can only restore archived projects)
  const expectedArchivedStatus: ProjectStatus = PROJECT_STATUS.ARCHIVED
  if (project.status !== expectedArchivedStatus) {
    operationFailed()
  }

  // Step 5: Load user's role and check permission to archive (restore requires same permission as archive)
  const role = await loadProjectRole(supabase, project_id, user.id)
  if (!canArchiveProject(role)) {
    throwCrossOrgViolation()
  }

  // Step 6: Restore project by updating status to 'ACTIVE'
  // Do not update org_id or membership_id
  const activeStatus: ProjectStatus = PROJECT_STATUS.ACTIVE
  const { data: restored, error: updateError }: any = await (supabase
    .from('projects') as any)
    .update({ status: activeStatus })
    .eq('id', project_id)
    .select('id')
    .single()

  if (updateError || !restored) {
    // Check if error is due to RLS violation
    if (updateError?.code === '42501') {
      authViolation()
    }
    operationFailed()
  }

  // Revalidate relevant paths (optional, for cache invalidation)
  revalidatePath('/dashboard/projects')

  return { id: restored.id }
}

