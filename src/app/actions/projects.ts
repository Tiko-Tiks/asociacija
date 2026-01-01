'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'
import { revalidatePath } from 'next/cache'

// ==================================================
// TYPES
// ==================================================

export type ProjectStatus = 'PLANNING' | 'FUNDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
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

export interface PledgeMoneyResult {
  ok: boolean
  reason: string
  contribution_id?: string
}

export interface PledgeInKindResult {
  ok: boolean
  reason: string
  contribution_id?: string
}

export interface PledgeWorkResult {
  ok: boolean
  reason: string
  contribution_id?: string
}

export interface UpdateContributionStatusResult {
  ok: boolean
  reason: string
}

// ==================================================
// SERVER ACTIONS
// ==================================================

/**
 * List projects for an organization
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
    if (error.code === '42501') {
      authViolation()
    }
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
 * Get project by ID
 */
export async function getProject(projectId: string): Promise<Project | null> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase.from('projects').select('*').eq('id', projectId).maybeSingle()

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
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
 * Get project funding totals
 */
export async function getProjectFundingTotals(projectId: string): Promise<ProjectFundingTotals | null> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase
    .from('project_funding_totals')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
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

/**
 * List contributions for a project
 */
export async function listProjectContributions(projectId: string): Promise<ProjectContribution[]> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase
    .from('project_contributions')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error listing contributions:', error)
    operationFailed()
  }

  return (data || []).map((contrib: any) => ({
    id: contrib.id,
    project_id: contrib.project_id,
    org_id: contrib.org_id,
    membership_id: contrib.membership_id,
    kind: contrib.kind as ContributionKind,
    status: contrib.status as ContributionStatus,
    money_amount_eur: contrib.money_amount_eur ? parseFloat(contrib.money_amount_eur) : null,
    in_kind_items: contrib.in_kind_items,
    work_offer: contrib.work_offer,
    note: contrib.note,
    created_at: contrib.created_at,
    updated_at: contrib.updated_at,
  }))
}

/**
 * Pledge money
 */
export async function pledgeMoney(
  projectId: string,
  amountEur: number,
  note: string | null = null
): Promise<PledgeMoneyResult> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase.rpc('pledge_money', {
    p_project_id: projectId,
    p_amount_eur: amountEur,
    p_note: note,
  })

  if (error) {
    console.error('Error pledging money:', error)
    if (error.code === '42501') {
      authViolation()
    }
    return {
      ok: false,
      reason: 'OPERATION_FAILED',
    }
  }

  const result = data?.[0]
  if (!result) {
    return {
      ok: false,
      reason: 'OPERATION_FAILED',
    }
  }

  revalidatePath('/dashboard', 'layout')
  return {
    ok: result.ok,
    reason: result.reason,
    contribution_id: result.contribution_id,
  }
}

/**
 * Pledge in-kind items
 */
export async function pledgeInKind(
  projectId: string,
  items: any[],
  note: string | null = null
): Promise<PledgeInKindResult> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase.rpc('pledge_in_kind', {
    p_project_id: projectId,
    p_items: items,
    p_note: note,
  })

  if (error) {
    console.error('Error pledging in-kind:', error)
    if (error.code === '42501') {
      authViolation()
    }
    return {
      ok: false,
      reason: 'OPERATION_FAILED',
    }
  }

  const result = data?.[0]
  if (!result) {
    return {
      ok: false,
      reason: 'OPERATION_FAILED',
    }
  }

  revalidatePath('/dashboard', 'layout')
  return {
    ok: result.ok,
    reason: result.reason,
    contribution_id: result.contribution_id,
  }
}

/**
 * Pledge work
 */
export async function pledgeWork(
  projectId: string,
  work: { type: string; hours: number; available_dates?: string[]; notes?: string },
  note: string | null = null
): Promise<PledgeWorkResult> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase.rpc('pledge_work', {
    p_project_id: projectId,
    p_work: work,
    p_note: note,
  })

  if (error) {
    console.error('Error pledging work:', error)
    if (error.code === '42501') {
      authViolation()
    }
    return {
      ok: false,
      reason: 'OPERATION_FAILED',
    }
  }

  const result = data?.[0]
  if (!result) {
    return {
      ok: false,
      reason: 'OPERATION_FAILED',
    }
  }

  revalidatePath('/dashboard', 'layout')
  return {
    ok: result.ok,
    reason: result.reason,
    contribution_id: result.contribution_id,
  }
}

/**
 * Update contribution status (OWNER/BOARD only)
 */
export async function updateContributionStatus(
  contributionId: string,
  status: ContributionStatus
): Promise<UpdateContributionStatusResult> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase.rpc('update_contribution_status', {
    p_contribution_id: contributionId,
    p_status: status,
  })

  if (error) {
    console.error('Error updating contribution status:', error)
    if (error.code === '42501') {
      authViolation()
    }
    return {
      ok: false,
      reason: 'OPERATION_FAILED',
    }
  }

  const result = data?.[0]
  if (!result) {
    return {
      ok: false,
      reason: 'OPERATION_FAILED',
    }
  }

  revalidatePath('/dashboard', 'layout')
  return {
    ok: result.ok,
    reason: result.reason,
  }
}
