/**
 * Voting Module TypeScript Types
 * Based on DB schema: votes, vote_ballots, vote_tallies
 */

// ENUM types matching PostgreSQL ENUMs
export type VoteKind = 'GA' | 'OPINION'
export type VoteChoice = 'FOR' | 'AGAINST' | 'ABSTAIN'
export type VoteChannel = 'IN_PERSON' | 'WRITTEN' | 'REMOTE'

// Vote status
export type VoteStatus = 'OPEN' | 'CLOSED'

// Vote record
export interface Vote {
  id: string
  org_id: string
  resolution_id: string
  kind: VoteKind
  meeting_id: string | null
  opens_at: string
  closes_at: string | null
  status: VoteStatus
  created_by: string | null
  created_at: string
  closed_at: string | null
}

// Vote ballot record
export interface VoteBallot {
  id: string
  vote_id: string
  membership_id: string
  choice: VoteChoice
  channel: VoteChannel
  cast_at: string
}

// Vote tally (from view)
export interface VoteTally {
  vote_id: string
  org_id: string
  resolution_id: string
  kind: VoteKind
  meeting_id: string | null
  status: VoteStatus
  votes_for: number
  votes_against: number
  votes_abstain: number
  votes_total: number
  unique_voters: number
}

// RPC function return types (matching exact RPC signatures)

/**
 * can_cast_vote RPC return type
 * Returns: { allowed boolean, reason text, details jsonb }
 */
export interface CanCastVoteResult {
  allowed: boolean
  reason: string
  details: Record<string, any> // jsonb - can contain any structure
}

/**
 * cast_vote RPC return type
 * Returns: { ok boolean, reason text }
 */
export interface CastVoteResult {
  ok: boolean
  reason: string
}

/**
 * close_vote RPC return type
 * Returns: { ok boolean, reason text, votes_for int, votes_against int, votes_abstain int }
 */
export interface CloseVoteResult {
  ok: boolean
  reason: string
  votes_for: number | null
  votes_against: number | null
  votes_abstain: number | null
}

/**
 * apply_vote_outcome RPC return type
 * Returns: { ok boolean, reason text, out_vote_id uuid, resolution_id uuid, 
 *            outcome text, votes_for int, votes_against int, votes_abstain int, updated_rows int }
 */
export interface ApplyVoteOutcomeResult {
  ok: boolean
  reason: string
  out_vote_id: string | null
  resolution_id: string | null
  outcome: string | null // text - can be 'APPROVED', 'RECOMMENDED', etc.
  votes_for: number | null
  votes_against: number | null
  votes_abstain: number | null
  updated_rows: number
}

// Create vote input
export interface CreateVoteInput {
  resolution_id: string
  kind: VoteKind
  meeting_id?: string | null // Required for GA, null for OPINION
}

// Cast vote input
export interface CastVoteInput {
  vote_id: string
  choice: VoteChoice
  channel?: VoteChannel // Default: 'IN_PERSON'
}

