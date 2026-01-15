/**
 * MEMBER DASHBOARD DATA LOADER
 * 
 * Backend-only data loading for Member dashboard.
 * 
 * Rules:
 * - Read-only (no mutations)
 * - Simplified view (no quorum, no procedural complexity)
 * - Uses freeze mechanism
 * - NO sensitive data (other votes, quorum math)
 * - RLS enforced
 * 
 * @version 18.8.6
 * @see docs/DASHBOARD_ARCHITECTURE_v18.md
 */

import { createClient } from '@/lib/supabase/server'
import { isVotingFrozen } from '@/lib/governance/snapshot'
import { getActiveVotesForMember } from '@/app/actions/voting'

export interface MemberDashboardData {
  org: {
    id: string
    name: string
    slug: string
  }
  user: {
    id: string
    can_vote: boolean
    can_vote_reason?: string
  }
  active_votes: Array<{
    vote_id: string
    resolution_id: string
    resolution_title: string
    meeting_id: string | null
    meeting_title: string | null
    meeting_scheduled_at: string | null
    has_voted: boolean
    user_choice?: 'FOR' | 'AGAINST' | 'ABSTAIN'
    user_voted_at?: string
    freeze: {
      frozen: boolean
      freeze_at?: string
      time_remaining?: number // milliseconds
      warning: boolean // true if < 24h
    }
  }>
}

/**
 * Load Member Dashboard data
 * 
 * @param orgSlug - Organization slug
 * @param userId - User ID
 * @returns MemberDashboardData
 */
export async function loadMemberDashboard(
  orgSlug: string,
  userId: string
): Promise<MemberDashboardData | null> {
  const supabase = await createClient()

  // Get org
  const { data: org } = await supabase
    .from('orgs')
    .select('id, name, slug')
    .eq('slug', orgSlug)
    .single()

  if (!org) return null

  // Get membership
  const { data: membership } = await supabase
    .from('memberships')
    .select('id, member_status')
    .eq('org_id', org.id)
    .eq('user_id', userId)
    .eq('member_status', 'ACTIVE')
    .single()

  if (!membership) return null

  // Check can_vote
  const { data: canVoteResult } = await supabase.rpc('can_vote', {
    p_org_id: org.id,
    p_user_id: userId,
  })

  const canVoteData = canVoteResult?.[0] || canVoteResult
  const canVote = canVoteData?.allowed || false
  const canVoteReason = canVoteData?.reason

  // Get active votes
  const activeVotesRaw = await getActiveVotesForMember(org.id)

  // Enrich with freeze info
  const activeVotes = await Promise.all(
    activeVotesRaw.map(async (vote) => {
      let freezeInfo = {
        frozen: false,
        freeze_at: undefined as string | undefined,
        time_remaining: undefined as number | undefined,
        warning: false,
      }

      // Check freeze (if meeting exists)
      if (vote.meeting_id) {
        const freezeCheck = await isVotingFrozen(vote.meeting_id)
        const freezeAt = freezeCheck.freeze_at

        if (freezeAt) {
          const freezeDate = new Date(freezeAt)
          const now = new Date()
          const timeRemaining = freezeDate.getTime() - now.getTime()

          freezeInfo = {
            frozen: freezeCheck.frozen,
            freeze_at: freezeAt,
            time_remaining: timeRemaining > 0 ? timeRemaining : 0,
            warning: timeRemaining > 0 && timeRemaining < 24 * 60 * 60 * 1000, // < 24h
          }
        }
      }

      // Get user's ballot (if voted)
      let userChoice: 'FOR' | 'AGAINST' | 'ABSTAIN' | undefined
      let userVotedAt: string | undefined

      if (vote.has_voted) {
        const { data: ballot } = await supabase
          .from('vote_ballots')
          .select('choice, cast_at')
          .eq('vote_id', vote.id)
          .eq('membership_id', membership.id)
          .single()

        if (ballot) {
          userChoice = ballot.choice as 'FOR' | 'AGAINST' | 'ABSTAIN'
          userVotedAt = ballot.cast_at
        }
      }

      return {
        vote_id: vote.id,
        resolution_id: vote.resolution_id || '',
        resolution_title: vote.resolution_title,
        meeting_id: vote.meeting_id,
        meeting_title: vote.meeting_title,
        meeting_scheduled_at: vote.meeting_scheduled_at || null,
        has_voted: vote.has_voted,
        user_choice: userChoice,
        user_voted_at: userVotedAt,
        freeze: freezeInfo,
      }
    })
  )

  return {
    org,
    user: {
      id: userId,
      can_vote: canVote,
      can_vote_reason: canVoteReason,
    },
    active_votes: activeVotes,
  }
}

