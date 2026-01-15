'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation } from '@/app/domain/errors'
import { revalidatePath } from 'next/cache'

/**
 * Close a vote and apply results (approve/reject resolution)
 * 
 * GA HARD MODE: Tai vienintelis būdas uždaryti GA balsavimą
 */
export async function closeVoteAndApplyResults(
  voteId: string
): Promise<{ success: boolean; error?: string; result?: 'APPROVED' | 'REJECTED' }> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Get vote with resolution
  const { data: vote, error: voteError } = await supabase
    .from('votes')
    .select(`
      id,
      status,
      kind,
      meeting_id,
      resolution_id,
      org_id
    `)
    .eq('id', voteId)
    .single()

  if (voteError || !vote) {
    console.error('[closeVoteAndApplyResults] Vote not found', { voteId, error: voteError })
    return { success: false, error: 'Balsavimas nerastas' }
  }

  // Check if already closed
  if (vote.status === 'CLOSED') {
    return { success: false, error: 'Balsavimas jau uždarytas' }
  }

  // Check if user is OWNER
  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('org_id', vote.org_id)
    .eq('user_id', user.id)
    .eq('member_status', 'ACTIVE')
    .single()

  if (!membership || membership.role !== 'OWNER') {
    return { success: false, error: 'Tik savininkas gali uždaryti balsavimą' }
  }

  // Get vote tallies (remote votes)
  const { data: remoteTallies } = await supabase
    .from('vote_tallies')
    .select('votes_for, votes_against, votes_abstain')
    .eq('vote_id', voteId)
    .maybeSingle()

  // Get live totals (if exists)
  const { data: liveTotals } = await supabase
    .from('vote_live_totals')
    .select('live_for_count, live_against_count, live_abstain_count')
    .eq('vote_id', voteId)
    .maybeSingle()

  // Calculate final totals
  const votesFor = (remoteTallies?.votes_for || 0) + (liveTotals?.live_for_count || 0)
  const votesAgainst = (remoteTallies?.votes_against || 0) + (liveTotals?.live_against_count || 0)
  const votesAbstain = (remoteTallies?.votes_abstain || 0) + (liveTotals?.live_abstain_count || 0)
  const totalVotes = votesFor + votesAgainst + votesAbstain

  console.log('[closeVoteAndApplyResults] Vote tallies', {
    voteId,
    votesFor,
    votesAgainst,
    votesAbstain,
    totalVotes,
  })

  // Determine result (simple majority: for > against)
  const result: 'APPROVED' | 'REJECTED' = votesFor > votesAgainst ? 'APPROVED' : 'REJECTED'

  // Close vote
  const { error: closeError } = await supabase
    .from('votes')
    .update({ status: 'CLOSED', closed_at: new Date().toISOString() })
    .eq('id', voteId)

  if (closeError) {
    console.error('[closeVoteAndApplyResults] Failed to close vote', closeError)
    return { success: false, error: 'Nepavyko uždaryti balsavimo' }
  }

  // Apply result to resolution (if exists)
  if (vote.resolution_id) {
    // Use RPC to bypass triggers safely
    const { error: resolveError } = await supabase.rpc('apply_resolution_result', {
      p_resolution_id: vote.resolution_id,
      p_result: result,
      p_adopted_by: user.id,
    })

    if (resolveError) {
      console.error('[closeVoteAndApplyResults] Failed to apply result', resolveError)
    }
  }

  revalidatePath('/dashboard', 'layout')

  return { success: true, result }
}

/**
 * Close all votes for a meeting and apply results
 * 
 * Convenience function for Chair
 */
export async function closeAllVotesForMeeting(
  meetingId: string
): Promise<{ success: boolean; closed: number; error?: string }> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Get all OPEN votes for meeting
  const { data: openVotes, error: fetchError } = await supabase
    .from('votes')
    .select('id')
    .eq('meeting_id', meetingId)
    .eq('status', 'OPEN')

  if (fetchError) {
    console.error('[closeAllVotesForMeeting] Failed to fetch votes', fetchError)
    return { success: false, closed: 0, error: 'Nepavyko gauti balsavimų' }
  }

  if (!openVotes || openVotes.length === 0) {
    return { success: true, closed: 0 }
  }

  let closed = 0
  const errors: string[] = []

  for (const vote of openVotes) {
    const result = await closeVoteAndApplyResults(vote.id)
    if (result.success) {
      closed++
    } else {
      errors.push(result.error || 'Unknown error')
    }
  }

  if (errors.length > 0) {
    console.error('[closeAllVotesForMeeting] Some votes failed to close', { errors })
  }

  revalidatePath('/dashboard', 'layout')

  return { 
    success: closed === openVotes.length, 
    closed,
    error: errors.length > 0 ? `${errors.length} balsavimų nepavyko uždaryti` : undefined
  }
}

