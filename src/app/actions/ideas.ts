'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'
import { revalidatePath } from 'next/cache'

// ==================================================
// TYPES
// ==================================================

export type IdeaStatus = 'DRAFT' | 'OPEN' | 'PASSED' | 'FAILED' | 'NOT_COMPLETED' | 'ARCHIVED'
export type IdeaVoteChoice = 'FOR' | 'AGAINST'
export type IdeaVoteStatus = 'OPEN' | 'CLOSED'

export interface Idea {
  id: string
  org_id: string
  title: string
  summary: string | null
  details: string | null
  status: IdeaStatus
  public_visible: boolean
  created_by: string | null
  created_at: string
  opened_at: string | null
  closed_at: string | null
  passed_at: string | null
}

export interface IdeaVote {
  id: string
  idea_id: string
  org_id: string
  status: IdeaVoteStatus
  opens_at: string
  closes_at: string
  duration_days: number
  closed_at: string | null
  created_by: string | null
  created_at: string
}

export interface IdeaBallot {
  id: string
  idea_vote_id: string
  membership_id: string
  choice: IdeaVoteChoice
  cast_at: string
}

export interface IdeaVoteTally {
  idea_id: string
  vote_id: string
  org_id: string
  vote_status: IdeaVoteStatus
  closes_at: string
  votes_for: number
  votes_against: number
  votes_total: number
  total_active_members: number
  effective_status: IdeaVoteStatus
}

export interface CreateIdeaResult {
  ok: boolean
  reason: string
  idea_id?: string
}

export interface OpenIdeaForVotingResult {
  ok: boolean
  reason: string
  vote_id?: string
  closes_at?: string
}

export interface CanCastIdeaVoteResult {
  allowed: boolean
  reason: string
  details?: Record<string, any>
}

export interface CastIdeaVoteResult {
  ok: boolean
  reason: string
}

export interface CloseIdeaVoteResult {
  ok: boolean
  reason: string
  votes_for: number
  votes_against: number
  votes_total: number
  total_active_members: number
  participation_required: number
}

export interface EvaluateIdeaVoteResult {
  ok: boolean
  reason: string
  idea_id?: string
  outcome?: string
  project_id?: string | null
}

// ==================================================
// SERVER ACTIONS
// ==================================================

/**
 * Create a new idea
 */
export async function createIdea(
  orgId: string,
  title: string,
  summary: string | null,
  details: string | null,
  publicVisible: boolean = true
): Promise<CreateIdeaResult> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase.rpc('create_idea', {
    p_org_id: orgId,
    p_title: title,
    p_summary: summary,
    p_details: details,
    p_public_visible: publicVisible,
  })

  if (error) {
    console.error('Error creating idea:', error)
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
    idea_id: result.idea_id,
  }
}

/**
 * Open idea for voting
 */
export async function openIdeaForVoting(ideaId: string): Promise<OpenIdeaForVotingResult> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase.rpc('open_idea_for_voting', {
    p_idea_id: ideaId,
  })

  if (error) {
    console.error('Error opening idea for voting:', error)
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
    vote_id: result.vote_id,
    closes_at: result.closes_at,
  }
}

/**
 * Check if user can cast a vote
 */
export async function canCastIdeaVote(
  voteId: string,
  userId: string
): Promise<CanCastIdeaVoteResult> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase.rpc('can_cast_idea_vote', {
    p_vote_id: voteId,
    p_user_id: userId,
  })

  if (error) {
    console.error('Error checking vote eligibility:', error)
    return {
      allowed: false,
      reason: 'OPERATION_FAILED',
    }
  }

  const result = data?.[0]
  if (!result) {
    return {
      allowed: false,
      reason: 'OPERATION_FAILED',
    }
  }

  return {
    allowed: result.allowed,
    reason: result.reason,
    details: result.details || {},
  }
}

/**
 * Cast a vote
 */
export async function castIdeaVote(
  voteId: string,
  choice: IdeaVoteChoice
): Promise<CastIdeaVoteResult> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase.rpc('cast_idea_vote', {
    p_vote_id: voteId,
    p_choice: choice,
  })

  if (error) {
    console.error('Error casting vote:', error)
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

/**
 * Close idea vote
 */
export async function closeIdeaVote(voteId: string): Promise<CloseIdeaVoteResult> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase.rpc('close_idea_vote', {
    p_vote_id: voteId,
  })

  if (error) {
    console.error('Error closing vote:', error)
    if (error.code === '42501') {
      authViolation()
    }
    return {
      ok: false,
      reason: 'OPERATION_FAILED',
      votes_for: 0,
      votes_against: 0,
      votes_total: 0,
      total_active_members: 0,
      participation_required: 0,
    }
  }

  const result = data?.[0]
  if (!result) {
    return {
      ok: false,
      reason: 'OPERATION_FAILED',
      votes_for: 0,
      votes_against: 0,
      votes_total: 0,
      total_active_members: 0,
      participation_required: 0,
    }
  }

  revalidatePath('/dashboard', 'layout')
  return {
    ok: result.ok,
    reason: result.reason,
    votes_for: result.votes_for || 0,
    votes_against: result.votes_against || 0,
    votes_total: result.votes_total || 0,
    total_active_members: result.total_active_members || 0,
    participation_required: result.participation_required || 0,
  }
}

/**
 * Evaluate idea vote and transition
 */
export async function evaluateIdeaVoteAndTransition(
  voteId: string,
  createProject: boolean = false,
  budgetEur: number = 0
): Promise<EvaluateIdeaVoteResult> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase.rpc('evaluate_idea_vote_and_transition', {
    p_vote_id: voteId,
    p_create_project: createProject,
    p_budget_eur: budgetEur,
  })

  if (error) {
    console.error('Error evaluating vote:', error)
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
    idea_id: result.idea_id,
    outcome: result.outcome,
    project_id: result.project_id,
  }
}

/**
 * List ideas for an organization
 */
export async function listIdeas(orgId: string, includeDraft: boolean = false): Promise<Idea[]> {
  const supabase = await createClient()
  await requireAuth(supabase)

  let query = supabase
    .from('ideas')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (!includeDraft) {
    query = query.neq('status', 'DRAFT')
  }

  const { data, error } = await query

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error listing ideas:', error)
    operationFailed()
  }

  return (data || []).map((idea: any) => ({
    id: idea.id,
    org_id: idea.org_id,
    title: idea.title,
    summary: idea.summary,
    details: idea.details,
    status: idea.status as IdeaStatus,
    public_visible: idea.public_visible,
    created_by: idea.created_by,
    created_at: idea.created_at,
    opened_at: idea.opened_at,
    closed_at: idea.closed_at,
    passed_at: idea.passed_at,
  }))
}

/**
 * Get idea by ID
 */
export async function getIdea(ideaId: string): Promise<Idea | null> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase.from('ideas').select('*').eq('id', ideaId).maybeSingle()

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error fetching idea:', error)
    return null
  }

  if (!data) return null

  return {
    id: data.id,
    org_id: data.org_id,
    title: data.title,
    summary: data.summary,
    details: data.details,
    status: data.status as IdeaStatus,
    public_visible: data.public_visible,
    created_by: data.created_by,
    created_at: data.created_at,
    opened_at: data.opened_at,
    closed_at: data.closed_at,
    passed_at: data.passed_at,
  }
}

/**
 * Get idea vote tally
 */
export async function getIdeaVoteTally(ideaId: string): Promise<IdeaVoteTally | null> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase
    .from('idea_vote_tally')
    .select('*')
    .eq('idea_id', ideaId)
    .maybeSingle()

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error fetching vote tally:', error)
    return null
  }

  if (!data) return null

  return {
    idea_id: data.idea_id,
    vote_id: data.vote_id,
    org_id: data.org_id,
    vote_status: data.vote_status as IdeaVoteStatus,
    closes_at: data.closes_at,
    votes_for: data.votes_for || 0,
    votes_against: data.votes_against || 0,
    votes_total: data.votes_total || 0,
    total_active_members: data.total_active_members || 0,
    effective_status: data.effective_status as IdeaVoteStatus,
  }
}

/**
 * Get user's vote for an idea (if exists)
 */
export async function getUserIdeaVote(voteId: string, userId: string): Promise<IdeaVoteChoice | null> {
  const supabase = await createClient()
  await requireAuth(supabase)

  // Get user's membership
  const { data: membership } = await supabase
    .from('memberships')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'ACTIVE')
    .limit(1)
    .maybeSingle()

  if (!membership) return null

  // Get vote
  const { data: ballot } = await supabase
    .from('idea_ballots')
    .select('choice')
    .eq('idea_vote_id', voteId)
    .eq('membership_id', membership.id)
    .maybeSingle()

  return ballot?.choice as IdeaVoteChoice | null
}

