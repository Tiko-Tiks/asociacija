/**
 * Voting Utilities
 * 
 * Reusable utilities for voting operations.
 * Consolidates duplicate voting logic.
 */

'use server'

import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Calculate vote opens_at timestamp based on early voting settings
 * 
 * Logic:
 * - If no meeting: opens immediately
 * - If meeting with early_voting_days > 0: opens X days before meeting
 * - If meeting with early_voting_days = 0: opens immediately
 * 
 * @param supabase - Supabase client
 * @param orgId - Organization ID
 * @param meetingId - Optional meeting ID
 * @returns ISO timestamp when vote opens
 */
export async function calculateVoteOpensAt(
  supabase: SupabaseClient,
  orgId: string,
  meetingId?: string | null
): Promise<string> {
  // If no meeting, open immediately
  if (!meetingId) {
    return new Date().toISOString()
  }

  try {
    // Fetch meeting and governance setting in parallel
    const [meetingResult, earlyVotingResult] = await Promise.all([
      supabase
        .from('meetings')
        .select('scheduled_at')
        .eq('id', meetingId)
        .single(),
      supabase.rpc('get_governance_int', {
        p_org_id: orgId,
        p_key: 'early_voting_days',
        p_default: 0,
      }),
    ])

    const meeting = meetingResult.data
    const earlyVotingDays = earlyVotingResult.data || 0

    if (!meeting) {
      throw new Error('Meeting not found')
    }

    // If early voting disabled, open immediately
    if (earlyVotingDays <= 0) {
      return new Date().toISOString()
    }

    // Calculate early voting start date
    const meetingDate = new Date(meeting.scheduled_at)
    meetingDate.setDate(meetingDate.getDate() - earlyVotingDays)
    
    return meetingDate.toISOString()
  } catch (error) {
    console.error('Error calculating vote opens_at:', error)
    // Fallback: open immediately
    return new Date().toISOString()
  }
}

/**
 * Check if vote is currently open
 * 
 * @param vote - Vote object with opens_at and closes_at
 * @returns true if vote is open
 */
export function isVoteOpen(vote: {
  opens_at: string | null
  closes_at: string | null
}): boolean {
  const now = new Date()
  
  if (vote.opens_at) {
    const opensAt = new Date(vote.opens_at)
    if (now < opensAt) {
      return false
    }
  }
  
  if (vote.closes_at) {
    const closesAt = new Date(vote.closes_at)
    if (now > closesAt) {
      return false
    }
  }
  
  return true
}

/**
 * Format vote outcome for display
 * 
 * @param votesFor - Votes for
 * @param votesAgainst - Votes against
 * @param votesAbstain - Votes abstain
 * @returns Formatted outcome string
 */
export function formatVoteOutcome(
  votesFor: number,
  votesAgainst: number,
  votesAbstain: number
): string {
  const total = votesFor + votesAgainst + votesAbstain
  
  if (total === 0) {
    return 'Balsų nėra'
  }
  
  const outcome = votesFor > votesAgainst ? 'PATVIRTINTA' : 'ATMESTA'
  
  return `${outcome} (${votesFor} už, ${votesAgainst} prieš, ${votesAbstain} susilaikė)`
}

/**
 * Determine vote result (APPROVED or REJECTED)
 * 
 * Simple majority rule: votes_for > votes_against
 * 
 * @param votesFor - Votes for
 * @param votesAgainst - Votes against
 * @returns 'APPROVED' or 'REJECTED'
 */
export function determineVoteResult(
  votesFor: number,
  votesAgainst: number
): 'APPROVED' | 'REJECTED' {
  return votesFor > votesAgainst ? 'APPROVED' : 'REJECTED'
}

