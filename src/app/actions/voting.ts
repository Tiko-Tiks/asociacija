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

  // Calculate opens_at based on early voting setting
  let opensAt: string | null = null
  
  if (input.meeting_id) {
    // Get meeting scheduled_at
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('scheduled_at')
      .eq('id', input.meeting_id)
      .single()
    
    if (meetingError || !meeting) {
      console.error('Error fetching meeting:', meetingError)
      return { success: false, error: 'Susirinkimas nerastas' }
    }
    
    // ==================================================
    // GA HARD MODE: Naudoti governance snapshot
    // ==================================================
    // Gauti early_voting_days iš meeting snapshot (jei publikuotas)
    // arba iš dabartinio governance (jei dar DRAFT)
    // ==================================================
    const { getEarlyVotingDays } = await import('@/lib/governance/snapshot')
    const earlyVotingDays = await getEarlyVotingDays(resolution.org_id, input.meeting_id)
    
    // Calculate opens_at: meeting.scheduled_at - early_voting_days
    // If early_voting_days = 0, opens_at = NOW() (immediately)
    const meetingDate = new Date(meeting.scheduled_at)
    if (earlyVotingDays > 0) {
      meetingDate.setDate(meetingDate.getDate() - earlyVotingDays)
      opensAt = meetingDate.toISOString()
    } else {
      // If 0 days, open immediately
      opensAt = new Date().toISOString()
    }
  } else {
    // For OPINION votes, open immediately
    opensAt = new Date().toISOString()
  }

  // Insert vote
  const { data: vote, error: insertError } = await supabase
    .from('votes')
    .insert({
      org_id: resolution.org_id,
      resolution_id: input.resolution_id,
      kind: input.kind,
      meeting_id: input.meeting_id || null,
      opens_at: opensAt,
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
 * Check if user can cast vote (RPC) - LOW LEVEL
 * 
 * RPC: can_cast_vote(p_vote_id uuid, p_user_id uuid, p_channel vote_channel)
 * Returns: { allowed boolean, reason text, details jsonb }
 * 
 * @deprecated Use canCastVoteWithSnapshot for GA HARD MODE support
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
 * Check if user can cast vote WITH GA HARD MODE snapshot support
 * 
 * GA MODE aware:
 * - Tikrina freeze naudojant governance snapshot
 * - Validuoja channel restrictions
 * - Naudoja snapshot reikšmes, ne live governance
 * 
 * @param voteId - Vote ID
 * @param channel - Vote channel
 * @returns CanCastVoteResult
 */
export async function canCastVoteWithSnapshot(
  voteId: string,
  channel: 'IN_PERSON' | 'WRITTEN' | 'REMOTE' = 'IN_PERSON'
): Promise<CanCastVoteResult> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Get vote info including status
  const { data: vote } = await supabase
    .from('votes')
    .select('kind, meeting_id, org_id, status')
    .eq('id', voteId)
    .single()

  if (!vote) {
    return {
      allowed: false,
      reason: 'VOTE_NOT_FOUND',
      details: {},
    }
  }
  
  // Check if vote is CLOSED first (before other checks)
  if (vote.status === 'CLOSED') {
    return {
      allowed: false,
      reason: 'VOTE_CLOSED',
      details: { vote_status: vote.status },
    }
  }

  // ==================================================
  // GA HARD MODE PRE-VALIDATION (Snapshot-based)
  // ==================================================
  if (vote.kind === 'GA') {
    // 1. Channel validation (snapshot-aware)
    if (channel !== 'REMOTE' && channel !== 'WRITTEN') {
      return {
        allowed: false,
        reason: 'GA_CHANNEL_NOT_ALLOWED',
        details: {
          message: 'GA balsavimai leidžia tik REMOTE arba WRITTEN kanalus.',
          allowed_channels: ['REMOTE', 'WRITTEN'],
          ga_hard_mode: true,
        },
      }
    }

    // 2. Freeze validation (snapshot-based)
    if (vote.meeting_id && (channel === 'REMOTE' || channel === 'WRITTEN')) {
      const { isVotingFrozen } = await import('@/lib/governance/snapshot')
      const freezeCheck = await isVotingFrozen(vote.meeting_id)

      if (freezeCheck.frozen) {
        return {
          allowed: false,
          reason: 'GA_VOTING_FROZEN',
          details: {
            message: freezeCheck.message,
            freeze_at: freezeCheck.freeze_at,
            ga_hard_mode: true,
          },
        }
      }
    }
  }

  // ==================================================
  // Standard RPC validation
  // ==================================================
  const { data, error } = await supabase.rpc('can_cast_vote', {
    p_vote_id: voteId,
    p_user_id: user.id,
    p_channel: channel,
  })

  if (error) {
    console.error('Error calling can_cast_vote:', error)
    return {
      allowed: false,
      reason: error.message || 'UNKNOWN_ERROR',
      details: { error_code: error.code || 'UNKNOWN_ERROR' },
    }
  }

  return (data?.[0] || data) as CanCastVoteResult
}

/**
 * Cast a vote (RPC) - LOW LEVEL
 * 
 * RPC: cast_vote(p_vote_id uuid, p_choice vote_choice, p_channel vote_channel)
 * Returns: { ok boolean, reason text }
 * Note: p_user_id is handled inside RPC via auth.uid()
 * 
 * @deprecated Use castVoteWithValidation for GA HARD MODE support
 */
export async function castVote(
  input: CastVoteInput
): Promise<CastVoteResult> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

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
 * Cast a vote WITH GA HARD MODE validation
 * 
 * TRIPLE ENFORCEMENT:
 * 1. Client-side snapshot-based validation (this function)
 * 2. RPC can_cast_vote preflight (in cast_vote RPC)
 * 3. RPC cast_vote HARD BLOCK (in cast_vote RPC)
 * 
 * Net apeinant layers 1-2, layer 3 (HARD BLOCK) sustabdo.
 * 
 * @param input - CastVoteInput
 * @returns CastVoteResult
 */
export async function castVoteWithValidation(
  input: CastVoteInput
): Promise<CastVoteResult> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  const channel = input.channel || 'IN_PERSON'

  // Get vote info for GA validation
  const { data: vote } = await supabase
    .from('votes')
    .select('kind, meeting_id, status, org_id')
    .eq('id', input.vote_id)
    .single()

  if (!vote) {
    return {
      ok: false,
      reason: 'VOTE_NOT_FOUND',
    }
  }

  // ==================================================
  // GA HARD MODE CLIENT-SIDE VALIDATION (Layer 1)
  // ==================================================
  if (vote.kind === 'GA') {
    // 1. Channel validation
    if (channel !== 'REMOTE' && channel !== 'WRITTEN') {
      console.error('[castVoteWithValidation] GA HARD MODE BLOCK: Invalid channel', {
        vote_id: input.vote_id,
        channel,
        allowed: ['REMOTE', 'WRITTEN'],
      })
      
      return {
        ok: false,
        reason: 'GA_CHANNEL_BLOCKED',
      }
    }

    // 2. Freeze validation (snapshot-based)
    if (vote.meeting_id && (channel === 'REMOTE' || channel === 'WRITTEN')) {
      const { isVotingFrozen } = await import('@/lib/governance/snapshot')
      const freezeCheck = await isVotingFrozen(vote.meeting_id)

      if (freezeCheck.frozen) {
        console.error('[castVoteWithValidation] GA HARD MODE BLOCK: Voting frozen', {
          vote_id: input.vote_id,
          meeting_id: vote.meeting_id,
          freeze_at: freezeCheck.freeze_at,
        })
        
        return {
          ok: false,
          reason: 'GA_VOTING_FROZEN',
        }
      }
    }

    // 3. Vote status validation
    if (vote.status !== 'OPEN') {
      console.error('[castVoteWithValidation] GA HARD MODE BLOCK: Vote not open', {
        vote_id: input.vote_id,
        status: vote.status,
      })
      
      return {
        ok: false,
        reason: 'VOTE_CLOSED',
      }
    }
  }

  // ==================================================
  // Call RPC (Layers 2 & 3 will validate in SQL)
  // ==================================================
  const { data, error } = await supabase.rpc('cast_vote', {
    p_vote_id: input.vote_id,
    p_choice: input.choice,
    p_channel: channel,
  })

  if (error) {
    console.error('Error calling cast_vote:', error)
    return {
      ok: false,
      reason: error.message || 'UNKNOWN_ERROR',
    }
  }

  return (data?.[0] || data) as CastVoteResult
}

/**
 * Close a vote (RPC)
 * 
 * RPC: close_vote(p_vote_id uuid)
 * Returns: { ok boolean, reason text, votes_for int, votes_against int, votes_abstain int }
 */
/**
 * Close vote (RPC) - LOW LEVEL
 * 
 * @deprecated Use closeVoteWithValidation for GA procedural sequence support
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
 * Close vote WITH GA procedural sequence validation
 * 
 * GA HARD MODE:
 * - Esminiai klausimai (4+) negali būti uždaromi,
 *   kol nepatvirtinti procedūriniai (1-3)
 * 
 * @param voteId - Vote ID
 * @returns CloseVoteResult
 */
export async function closeVoteWithValidation(
  voteId: string
): Promise<CloseVoteResult> {
  const supabase = await createClient()
  await requireAuth(supabase)

  // Get vote info
  const { data: vote } = await supabase
    .from('votes')
    .select('kind, meeting_id, resolution_id')
    .eq('id', voteId)
    .single()

  if (!vote) {
    return {
      ok: false,
      reason: 'VOTE_NOT_FOUND',
      votes_for: null,
      votes_against: null,
      votes_abstain: null,
    }
  }

  // ==================================================
  // GA PROCEDŪRINĖ EIGA VALIDATION
  // ==================================================
  if (vote.kind === 'GA' && vote.meeting_id) {
    // Get agenda item for this vote
    const { data: agendaItem } = await supabase
      .from('meeting_agenda_items')
      .select('item_no, title')
      .eq('meeting_id', vote.meeting_id)
      .eq('resolution_id', vote.resolution_id)
      .single()

    if (agendaItem?.item_no) {
      const { canApplyVoteOutcome } = await import('@/lib/meetings/procedural-items')
      const sequenceCheck = await canApplyVoteOutcome(vote.meeting_id, agendaItem.item_no)

      if (!sequenceCheck.allowed) {
        console.error('[closeVote] GA PROCEDURAL SEQUENCE BLOCK', {
          vote_id: voteId,
          item_no: agendaItem.item_no,
          reason: sequenceCheck.reason,
        })

        return {
          ok: false,
          reason: 'GA_PROCEDURE_NOT_COMPLETED',
          votes_for: null,
          votes_against: null,
          votes_abstain: null,
        }
      }

      console.log('[closeVote] GA procedural sequence validated', {
        vote_id: voteId,
        item_no: agendaItem.item_no,
      })
    }
  }

  // ==================================================
  // Standard close_vote RPC
  // ==================================================
  const { data, error } = await supabase.rpc('close_vote', {
    p_vote_id: voteId,
  })

  if (error) {
    console.error('Error calling close_vote:', error)
    return {
      ok: false,
      reason: error.message || 'UNKNOWN_ERROR',
      votes_for: null,
      votes_against: null,
      votes_abstain: null,
    }
  }

  return (data?.[0] || data) as CloseVoteResult
}

/**
 * Apply vote outcome (RPC) - LOW LEVEL
 * 
 * RPC: apply_vote_outcome(p_vote_id uuid)
 * Returns: { ok boolean, reason text, out_vote_id uuid, resolution_id uuid, 
 *            outcome text, votes_for int, votes_against int, votes_abstain int, updated_rows int }
 * 
 * @deprecated Use applyVoteOutcomeWithMode instead for GA HARD MODE support
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
 * Apply vote outcome WITH GA HARD MODE support
 * 
 * GA MODE aware:
 * - TEST: Skaičiuoja rezultatus, bet NEKEIČIA resolutions.status
 * - PRODUCTION: Reikalauja kvorumo ir PDF, taiko rezultatus
 * 
 * @param voteId - Vote ID
 * @param options - { meetingId?, force? }
 * @returns ApplyVoteOutcomeResult + ga_mode info
 */
export async function applyVoteOutcomeWithMode(
  voteId: string,
  options?: { meetingId?: string; force?: boolean }
): Promise<ApplyVoteOutcomeResult & { ga_mode?: string; test_only?: boolean }> {
  const supabase = await createClient()
  await requireAuth(supabase)

  // Get vote info
  const { data: vote } = await supabase
    .from('votes')
    .select('kind, meeting_id, org_id')
    .eq('id', voteId)
    .single()

  if (!vote) {
    return {
      ok: false,
      reason: 'VOTE_NOT_FOUND',
      out_vote_id: null,
      resolution_id: null,
      outcome: null,
      votes_for: null,
      votes_against: null,
      votes_abstain: null,
      updated_rows: 0,
    }
  }

  // ==================================================
  // GA HARD MODE ENFORCEMENT
  // ==================================================
  if (vote.kind === 'GA') {
    const { getGAMode, canCompleteGA } = await import('@/lib/config/ga-mode')
    const mode = getGAMode()

    console.log(`[applyVoteOutcome] GA_MODE: ${mode}`)

    // Get vote's agenda item info for procedural sequence check
    const meetingId = vote.meeting_id || options?.meetingId
    
    if (meetingId) {
      // ==================================================
      // PROCEDŪRINĖ EIGA ENFORCEMENT
      // ==================================================
      // Esminiai klausimai (4+) negali būti taikomi,
      // kol nepatvirtinti procedūriniai (1-3)
      // ==================================================
      const { data: agendaItem } = await supabase
        .from('meeting_agenda_items')
        .select('item_no, title')
        .eq('meeting_id', meetingId)
        .eq('resolution_id', vote.resolution_id)
        .single()

      if (agendaItem?.item_no) {
        const { canApplyVoteOutcome } = await import('@/lib/meetings/procedural-items')
        const sequenceCheck = await canApplyVoteOutcome(meetingId, agendaItem.item_no)

        if (!sequenceCheck.allowed) {
          console.error('[applyVoteOutcome] GA PROCEDURAL SEQUENCE BLOCK', {
            vote_id: voteId,
            item_no: agendaItem.item_no,
            reason: sequenceCheck.reason,
          })

          return {
            ok: false,
            reason: 'GA_PROCEDURE_NOT_COMPLETED',
            out_vote_id: null,
            resolution_id: null,
            outcome: null,
            votes_for: null,
            votes_against: null,
            votes_abstain: null,
            updated_rows: 0,
            ga_mode: mode,
          }
        }

        console.log('[applyVoteOutcome] GA procedural sequence validated', {
          vote_id: voteId,
          item_no: agendaItem.item_no,
        })
      }
    }

    // Get quorum info
    let hasQuorum = false
    let hasSignedPDF = false

    if (meetingId) {
      // Check quorum
      // NOTE: metadata stulpelio nėra schema (Code Freeze) - governance snapshot yra runtime-only
      const { data: meeting } = await supabase
        .from('meetings')
        .select('protocol_pdf_url')
        .eq('id', meetingId)
        .single()

      // TODO: Implement proper quorum calculation
      // For now, assume quorum met if we have meeting
      hasQuorum = !!meeting
      hasSignedPDF = !!meeting?.protocol_pdf_url
    }

    // Validate if can complete GA
    const validation = canCompleteGA(hasQuorum, hasSignedPDF)

    if (mode === 'TEST') {
      // TEST režimas: Skaičiuoti rezultatus, bet NEKEISTI resolutions.status
      console.log('[applyVoteOutcome] TEST MODE: Calculating results without legal consequences')

      // Call RPC to get results, but don't apply them
      const { data, error } = await supabase.rpc('apply_vote_outcome', {
        p_vote_id: voteId,
      })

      if (error) {
        console.error('Error calling apply_vote_outcome:', error)
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
          ga_mode: 'TEST',
          test_only: true,
        }
      }

      const result = (data?.[0] || data) as ApplyVoteOutcomeResult

      // Return results with TEST flag
      return {
        ...result,
        ga_mode: 'TEST',
        test_only: true,
      }
    }

    // PRODUCTION režimas
    if (!validation.allowed && !options?.force) {
      console.error('[applyVoteOutcome] PRODUCTION MODE: Validation failed:', validation.reason)
      return {
        ok: false,
        reason: validation.reason || 'PRODUCTION_REQUIREMENTS_NOT_MET',
        out_vote_id: null,
        resolution_id: null,
        outcome: null,
        votes_for: null,
        votes_against: null,
        votes_abstain: null,
        updated_rows: 0,
        ga_mode: 'PRODUCTION',
      }
    }

    console.log('[applyVoteOutcome] PRODUCTION MODE: Validation passed, applying results')
  }

  // ==================================================
  // Standard flow (OPINION or validated GA PRODUCTION)
  // ==================================================
  const { data, error } = await supabase.rpc('apply_vote_outcome', {
    p_vote_id: voteId,
  })

  if (error) {
    console.error('Error calling apply_vote_outcome:', error)
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

  const result = (data?.[0] || data) as ApplyVoteOutcomeResult
  
  return {
    ...result,
    ga_mode: vote.kind === 'GA' ? 'PRODUCTION' : undefined,
  }
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

/**
 * Get active votes for a member (OPEN status, user can vote)
 */
export async function getActiveVotesForMember(
  orgId: string
): Promise<Array<Vote & { resolution_title: string; meeting_title: string | null; has_voted: boolean }>> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Get membership_id
  const { data: membership } = await supabase
    .from('memberships')
    .select('id')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .eq('member_status', 'ACTIVE')
    .single()

  if (!membership) {
    return []
  }

  // Get active votes (OPEN status) with resolution and meeting info
  const { data: votes, error } = await supabase
    .from('votes')
    .select(`
      *,
      resolutions!votes_resolution_id_fkey(title),
      meetings!votes_meeting_id_fkey(title)
    `)
    .eq('org_id', orgId)
    .eq('status', 'OPEN')
    .order('opens_at', { ascending: false })

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error fetching active votes:', error)
    return []
  }

  // Get user's ballots to check if they've voted
  const voteIds = (votes || []).map(v => v.id)
  let votedVoteIds = new Set<string>()
  
  if (voteIds.length > 0) {
    const { data: ballots } = await supabase
      .from('vote_ballots')
      .select('vote_id')
      .eq('membership_id', membership.id)
      .in('vote_id', voteIds)

    votedVoteIds = new Set((ballots || []).map(b => b.vote_id))
  }

  // Format response
  return (votes || []).map(vote => ({
    ...vote,
    resolution_title: (vote.resolutions as any)?.title || 'N/A',
    meeting_title: (vote.meetings as any)?.title || null,
    has_voted: votedVoteIds.has(vote.id),
  })) as Array<Vote & { resolution_title: string; meeting_title: string | null; has_voted: boolean }>
}

/**
 * Get count of pending (not yet voted) items for a meeting
 * Used by ActiveVotesAlert to determine if user still needs to vote
 */
export async function getPendingVotesCount(meetingId: string): Promise<number> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Get user's membership
  const { data: meeting } = await supabase
    .from('meetings')
    .select('org_id')
    .eq('id', meetingId)
    .single()

  if (!meeting) return 0

  const { data: membership } = await supabase
    .from('memberships')
    .select('id')
    .eq('org_id', meeting.org_id)
    .eq('user_id', user.id)
    .eq('member_status', 'ACTIVE')
    .single()

  if (!membership) return 0

  // Get all OPEN votes for this meeting
  const { data: votes } = await supabase
    .from('votes')
    .select('id')
    .eq('meeting_id', meetingId)
    .eq('status', 'OPEN')

  if (!votes || votes.length === 0) return 0

  // Get user's ballots for these votes
  const voteIds = votes.map(v => v.id)
  const { data: ballots } = await supabase
    .from('vote_ballots')
    .select('vote_id')
    .eq('membership_id', membership.id)
    .in('vote_id', voteIds)

  const votedCount = ballots?.length || 0
  return votes.length - votedCount
}

