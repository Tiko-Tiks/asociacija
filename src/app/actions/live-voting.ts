'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'
import { revalidatePath } from 'next/cache'

// ==================================================
// TYPES
// ==================================================

export interface SetLiveTotalsResult {
  ok: boolean
  reason: string
  live_present_count: number
  live_for_count: number
}

// ==================================================
// SERVER ACTIONS
// ==================================================

/**
 * Set live voting totals for a GA vote
 * live_present_count is automatically derived from meeting_attendance
 */
export async function setVoteLiveTotals(
  voteId: string,
  liveAgainstCount: number,
  liveAbstainCount: number
): Promise<SetLiveTotalsResult> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase.rpc('set_vote_live_totals', {
    p_vote_id: voteId,
    p_live_against_count: liveAgainstCount,
    p_live_abstain_count: liveAbstainCount,
  })

  if (error) {
    console.error('Error setting live totals:', error)
    if (error.code === '42501') {
      authViolation()
    }
    return {
      ok: false,
      reason: 'OPERATION_FAILED',
      live_present_count: 0,
      live_for_count: 0,
    }
  }

  const result = data?.[0]
  if (!result) {
    return {
      ok: false,
      reason: 'OPERATION_FAILED',
      live_present_count: 0,
      live_for_count: 0,
    }
  }

  // Note: Removed aggressive revalidatePath to prevent page reset during live voting
  // Parent component handles refresh via state updates
  return {
    ok: result.ok,
    reason: result.reason,
    live_present_count: result.live_present_count || 0,
    live_for_count: result.live_for_count || 0,
  }
}

/**
 * Get live voting totals for a vote (if vote_live_totals table exists)
 */
export async function getVoteLiveTotals(voteId: string): Promise<{
  live_present_count: number
  live_for_count: number
  live_against_count: number
  live_abstain_count: number
} | null> {
  const supabase = await createClient()
  await requireAuth(supabase)

  // Try to fetch from vote_live_totals table (if it exists)
  const { data, error } = await supabase
    .from('vote_live_totals')
    .select('live_present_count, live_for_count, live_against_count, live_abstain_count')
    .eq('vote_id', voteId)
    .maybeSingle()

  if (error) {
    // If table doesn't exist or other error, return null
    if (error.code === '42P01' || error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching live totals:', error)
    return null
  }

  if (!data) {
    return null
  }

  return {
    live_present_count: data.live_present_count || 0,
    live_for_count: data.live_for_count || 0,
    live_against_count: data.live_against_count || 0,
    live_abstain_count: data.live_abstain_count || 0,
  }
}

/**
 * Get remote vote tallies from vote_tallies view
 */
export async function getVoteTallies(voteId: string): Promise<{
  votes_for: number
  votes_against: number
  votes_abstain: number
  votes_total: number
} | null> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase
    .from('vote_tallies')
    .select('votes_for, votes_against, votes_abstain, votes_total')
    .eq('vote_id', voteId)
    .maybeSingle()

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error fetching vote tallies:', error)
    return null
  }

  if (!data) {
    return null
  }

  return {
    votes_for: data.votes_for || 0,
    votes_against: data.votes_against || 0,
    votes_abstain: data.votes_abstain || 0,
    votes_total: data.votes_total || 0,
  }
}

