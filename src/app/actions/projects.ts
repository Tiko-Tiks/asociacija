'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'
import { revalidatePath } from 'next/cache'

/**
 * ==================================================
 * LEGACY PROJECTS MODULE — v17–v18
 * ==================================================
 *
 * STATUS: READ-ONLY (v19.0 CANONICAL)
 *
 * v19.0 RULE:
 * PROJECT := APPROVED RESOLUTION + metadata.project exists
 *
 * - Projects are NOT entities
 * - Projects are NOT created by UI
 * - Projects are NOT mutable objects
 *
 * This file exists ONLY for backward compatibility.
 * ALL MUTATIONS ARE DISABLED.
 *
 * Authoritative docs:
 * - docs/PROJECTS_MODULE_v19.md
 * - docs/PROJECTS_REGISTRY_READONLY_v19.md
 *
 * ==================================================
 */

/**
 * Centralized hard stop for all legacy mutations.
 * This is intentional and non-recoverable.
 */
function legacyProjectsDisabled(functionName: string): never {
  console.warn(
    `[DEPRECATED v19.0] ${functionName}() is disabled. ` +
      `Projects are derived exclusively from APPROVED resolutions ` +
      `and live in resolutions.metadata.project.*`
  )

  throw new Error('LEGACY_PROJECTS_DISABLED')
}

// ==================================================
// LEGACY MUTATIONS — HARD DISABLED
// ==================================================

/**
 * @deprecated v19.0
 */
export async function createProject(
  membershipId: string,
  title: string,
  description?: string,
  budgetEur?: number
): Promise<never> {
  legacyProjectsDisabled('createProject')
}

/**
 * @deprecated v19.0
 */
export async function updateProjectName(
  projectId: string,
  membershipId: string,
  title: string
): Promise<never> {
  legacyProjectsDisabled('updateProjectName')
}

/**
 * @deprecated v19.0
 */
export async function archiveProject(
  projectId: string,
  membershipId: string
): Promise<never> {
  legacyProjectsDisabled('archiveProject')
}

/**
 * @deprecated v19.0
 */
export async function restoreProject(
  projectId: string,
  membershipId: string
): Promise<never> {
  legacyProjectsDisabled('restoreProject')
}

/**
 * @deprecated v19.0
 */
export async function deleteProject(
  projectId: string,
  membershipId: string
): Promise<never> {
  legacyProjectsDisabled('deleteProject')
}

// ==================================================
// TYPES — LEGACY (READ-ONLY COMPATIBILITY)
// ==================================================

export type ProjectStatus =
  | 'PLANNING'
  | 'FUNDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'

export type ContributionKind = 'MONEY' | 'IN_KIND' | 'WORK'
export type ContributionStatus = 'PLEDGED' | 'RECEIVED' | 'CANCELLED'

export interface Project {
  id: string
  org_id: string
  idea_id: string | null
  title: string
  description: string | null
  status: ProjectStatus
  budget_eur: number
  created_by: string | null
  created_at: string
  funding_opened_at: string
  completed_at: string | null
}

export interface ProjectContribution {
  id: string
  project_id: string
  org_id: string
  membership_id: string
  kind: ContributionKind
  status: ContributionStatus
  money_amount_eur: number | null
  in_kind_items: any | null
  work_offer: any | null
  note: string | null
  created_at: string
  updated_at: string
}

export interface ProjectFundingTotals {
  project_id: string
  org_id: string
  goal_budget_eur: number
  pledged_money_eur: number
  received_money_eur: number
  pledged_in_kind_count: number
  pledged_work_hours: number
  progress_ratio: number
}

// ==================================================
// LEGACY READ-ONLY ACCESSORS
// ==================================================

/**
 * LEGACY READ-ONLY
 * Lists projects from legacy table.
 * Will be replaced by Projects Registry (resolutions.metadata).
 */
export async function listProjects(orgId: string): Promise<Project[]> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) {
    if (error.code === '42501') authViolation()
    console.error('Error listing projects:', error)
    operationFailed()
  }

  return (data || []).map((project: any) => ({
    id: project.id,
    org_id: project.org_id,
    idea_id: project.idea_id,
    title: project.title,
    description: project.description,
    status: project.status as ProjectStatus,
    budget_eur: parseFloat(project.budget_eur) || 0,
    created_by: project.created_by,
    created_at: project.created_at,
    funding_opened_at: project.funding_opened_at,
    completed_at: project.completed_at,
  }))
}

/**
 * LEGACY READ-ONLY
 */
export async function getProject(projectId: string): Promise<Project | null> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle()

  if (error) {
    if (error.code === '42501') authViolation()
    console.error('Error fetching project:', error)
    return null
  }

  if (!data) return null

  return {
    id: data.id,
    org_id: data.org_id,
    idea_id: data.idea_id,
    title: data.title,
    description: data.description,
    status: data.status as ProjectStatus,
    budget_eur: parseFloat(data.budget_eur) || 0,
    created_by: data.created_by,
    created_at: data.created_at,
    funding_opened_at: data.funding_opened_at,
    completed_at: data.completed_at,
  }
}

/**
 * LEGACY READ-ONLY
 */
export async function getProjectFundingTotals(
  projectId: string
): Promise<ProjectFundingTotals | null> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase
    .from('project_funding_totals')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()

  if (error) {
    if (error.code === '42501') authViolation()
    console.error('Error fetching funding totals:', error)
    return null
  }

  if (!data) return null

  return {
    project_id: data.project_id,
    org_id: data.org_id,
    goal_budget_eur: parseFloat(data.goal_budget_eur) || 0,
    pledged_money_eur: parseFloat(data.pledged_money_eur) || 0,
    received_money_eur: parseFloat(data.received_money_eur) || 0,
    pledged_in_kind_count: data.pledged_in_kind_count || 0,
    pledged_work_hours: parseFloat(data.pledged_work_hours) || 0,
    progress_ratio: parseFloat(data.progress_ratio) || 0,
  }
}

