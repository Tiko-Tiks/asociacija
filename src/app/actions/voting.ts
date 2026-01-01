'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'
import { requireOrgActive } from '@/app/domain/guards/orgActivation'
import type {
  Vote,
  VoteTally,
  CanCastVoteResult,
  CastVoteResult,
  CloseVoteResult,
  ApplyVoteOutcomeResult,
  CreateVoteInput,
  CastVoteInput,
} from '@/lib/types/voting'

/**
 * Get vote by ID
 */
export async function getVote(voteId: string): Promise<Vote | null> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase
    .from('votes')
    .select('*')
    .eq('id', voteId)
    .single()

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching vote:', error)
    operationFailed()
  }

  return data as Vote
}

/**
 * Get vote tally (from view)
 */
export async function getVoteTally(voteId: string): Promise<VoteTally | null> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase
    .from('vote_tallies')
    .select('*')
    .eq('vote_id', voteId)
    .single()

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching vote tally:', error)
    operationFailed()
  }

  return data as VoteTally
}

/**
 * Get votes for a resolution
 */
export async function getVotesForResolution(
  resolutionId: string
): Promise<Vote[]> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase
    .from('votes')
    .select('*')
    .eq('resolution_id', resolutionId)
    .order('created_at', { ascending: false })

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error fetching votes:', error)
    operationFailed()
  }

  return (data || []) as Vote[]
}

/**
 * Create a new vote
 */
export async function createVote(
  input: CreateVoteInput
): Promise<{ success: boolean; voteId?: string; error?: string }> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Get resolution to get org_id
  const { data: resolution, error: resolutionError } = await supabase
    .from('resolutions')
    .select('org_id')
    .eq('id', input.resolution_id)
    .single()

  if (resolutionError) {
    if (resolutionError.code === '42501') {
      authViolation()
    }
    console.error('Error fetching resolution:', resolutionError)
    return { success: false, error: 'Rezoliucija nerasta' }
  }

  // Check org activation
  try {
    await requireOrgActive(resolution.org_id)
  } catch (error: any) {
    if (error?.code === 'access_denied' || error?.code === 'auth_violation') {
      return { success: false, error: 'Organizacija nėra aktyvi' }
    }
    throw error
  }

  // Validate: GA requires meeting_id
  if (input.kind === 'GA' && !input.meeting_id) {
    return { success: false, error: 'GA tipo balsavimui reikalingas meeting_id' }
  }

  // Insert vote
  const { data: vote, error: insertError } = await supabase
    .from('votes')
    .insert({
      org_id: resolution.org_id,
      resolution_id: input.resolution_id,
      kind: input.kind,
      meeting_id: input.meeting_id || null,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (insertError) {
    // Surface exact RLS error
    if (insertError.code === '42501') {
      // RLS blocked - user doesn't have permission
      return { 
        success: false, 
        error: `RLS klaida: Neturite teisės sukurti balsavimą. Reikalinga OWNER arba BOARD rolė. (${insertError.message || insertError.code})` 
      }
    }
    if (insertError.code === '23505') {
      // Unique constraint violation - open vote already exists
      return { success: false, error: 'Jau egzistuoja aktyvus balsavimas šiai rezoliucijai' }
    }
    console.error('Error creating vote:', insertError)
    // Surface exact error message and code
    return { 
      success: false, 
      error: `${insertError.message || 'Nepavyko sukurti balsavimo'} (${insertError.code || 'UNKNOWN'})` 
    }
  }

  return { success: true, voteId: vote.id }
}

/**
 * Check if user can cast vote (RPC)
 * 
 * RPC: can_cast_vote(p_vote_id uuid, p_user_id uuid, p_channel vote_channel)
 * Returns: { allowed boolean, reason text, details jsonb }
 */
export async function canCastVote(
  voteId: string,
  channel: 'IN_PERSON' | 'WRITTEN' | 'REMOTE' = 'IN_PERSON'
): Promise<CanCastVoteResult> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  const { data, error } = await supabase.rpc('can_cast_vote', {
    p_vote_id: voteId,
    p_user_id: user.id,
    p_channel: channel, // Always pass explicitly
  })

  if (error) {
    console.error('Error calling can_cast_vote:', error)
    // Return structured error from RPC if available, otherwise generic
    return {
      allowed: false,
      reason: error.message || 'UNKNOWN_ERROR',
      details: { error_code: error.code || 'UNKNOWN_ERROR' },
    }
  }

  // Supabase RPC returns an array of rows - always return first row
  return (data?.[0] || data) as CanCastVoteResult
}

/**
 * Cast a vote (RPC)
 * 
 * RPC: cast_vote(p_vote_id uuid, p_choice vote_choice, p_channel vote_channel)
 * Returns: { ok boolean, reason text }
 * Note: p_user_id is handled inside RPC via auth.uid()
 */
export async function castVote(
  input: CastVoteInput
): Promise<CastVoteResult> {
  const supabase = await createClient()
  await requireAuth(supabase)

  // Always pass p_channel explicitly (don't rely on default)
  const channel = input.channel || 'IN_PERSON'

  const { data, error } = await supabase.rpc('cast_vote', {
    p_vote_id: input.vote_id,
    p_choice: input.choice,
    p_channel: channel,
  })

  if (error) {
    console.error('Error calling cast_vote:', error)
    // Return structured error from RPC
    return {
      ok: false,
      reason: error.message || 'UNKNOWN_ERROR',
    }
  }

  // Supabase RPC returns an array of rows - always return first row
  return (data?.[0] || data) as CastVoteResult
}

/**
 * Close a vote (RPC)
 * 
 * RPC: close_vote(p_vote_id uuid)
 * Returns: { ok boolean, reason text, votes_for int, votes_against int, votes_abstain int }
 */
export async function closeVote(voteId: string): Promise<CloseVoteResult> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase.rpc('close_vote', {
    p_vote_id: voteId,
  })

  if (error) {
    console.error('Error calling close_vote:', error)
    // Return structured error from RPC
    return {
      ok: false,
      reason: error.message || 'UNKNOWN_ERROR',
      votes_for: null,
      votes_against: null,
      votes_abstain: null,
    }
  }

  // Supabase RPC returns an array of rows - always return first row
  return (data?.[0] || data) as CloseVoteResult
}

/**
 * Apply vote outcome (RPC)
 * 
 * RPC: apply_vote_outcome(p_vote_id uuid)
 * Returns: { ok boolean, reason text, out_vote_id uuid, resolution_id uuid, 
 *            outcome text, votes_for int, votes_against int, votes_abstain int, updated_rows int }
 */
export async function applyVoteOutcome(
  voteId: string
): Promise<ApplyVoteOutcomeResult> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase.rpc('apply_vote_outcome', {
    p_vote_id: voteId,
  })

  if (error) {
    console.error('Error calling apply_vote_outcome:', error)
    // Return structured error from RPC
    return {
      ok: false,
      reason: error.message || 'UNKNOWN_ERROR',
      out_vote_id: null,
      resolution_id: null,
      outcome: null,
      votes_for: null,
      votes_against: null,
      votes_abstain: null,
      updated_rows: 0,
    }
  }

  // Supabase RPC returns an array of rows - always return first row
  return (data?.[0] || data) as ApplyVoteOutcomeResult
}

/**
 * Get user's ballot for a vote
 */
export async function getUserBallot(
  voteId: string
): Promise<{ choice: string; channel: string } | null> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Get vote to get org_id
  const { data: vote } = await supabase
    .from('votes')
    .select('org_id')
    .eq('id', voteId)
    .single()

  if (!vote) return null

  // Get membership_id
  const { data: membership } = await supabase
    .from('memberships')
    .select('id')
    .eq('org_id', vote.org_id)
    .eq('user_id', user.id)
    .eq('member_status', 'ACTIVE')
    .single()

  if (!membership) return null

  // Get ballot
  const { data: ballot } = await supabase
    .from('vote_ballots')
    .select('choice, channel')
    .eq('vote_id', voteId)
    .eq('membership_id', membership.id)
    .single()

  return ballot || null
}

