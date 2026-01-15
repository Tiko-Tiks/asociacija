/**
 * Governance Snapshot (v19.0)
 * 
 * Governance Layer v19.0: Snapshot saugomas meetings.metadata.governance_snapshot
 * 
 * KĄ DARO:
 * - Apskaičiuoja governance parametrus pagal current governance config
 * - Užfiksuoja quorum, early_voting_days, procedural item numbers
 * - Saugo snapshot į meetings.metadata.governance_snapshot
 * - freeze_at = scheduled_at (GA HARD MODE: nuotolinis balsavimas sustoja susirinkimo pradžioje)
 * 
 * @version 19.0
 * @see docs/VOTING_FLOW_SPECIFICATION.md
 */

import { createClient } from '@/lib/supabase/server'

export interface GovernanceSnapshot {
  early_voting_days: number
  meeting_notice_days: number
  quorum_percentage: number
  can_vote_rules: {
    max_debt?: number
    check_suspensions?: boolean
    check_arrears?: boolean
  }
  snapshot_at: string // ISO timestamp
  snapshot_source: 'PUBLISH' | 'MANUAL'
  freeze_at?: string // ISO timestamp - kada užšaldo nuotolinį balsavimą
  scheduled_at?: string // Meeting scheduled_at (reference)
  procedural_item_numbers?: number[] // Procedural agenda item numbers (1, 2, 3)
  captured_at: string // ISO timestamp when snapshot was captured
}

/**
 * Gauti governance snapshot organizacijai
 * 
 * @param orgId - Organization ID
 * @param meetingScheduledAt - Meeting scheduled_at (optional, reikalingas freeze_at skaičiavimui)
 * @returns Governance snapshot
 */
export async function getGovernanceSnapshot(
  orgId: string,
  meetingScheduledAt?: string
): Promise<GovernanceSnapshot> {
  const supabase = await createClient()
  
  // Get governance config
  const { data: config } = await supabase
    .from('governance_configs')
    .select('answers')
    .eq('org_id', orgId)
    .eq('status', 'ACTIVE')
    .single()
  
  const answers = config?.answers || {}
  
  // Extract key parameters
  const snapshot: GovernanceSnapshot = {
    early_voting_days: parseInt(answers.early_voting_days) || 0,
    meeting_notice_days: parseInt(answers.meeting_notice_days) || 14,
    quorum_percentage: parseInt(answers.quorum_percentage) || 50,
    can_vote_rules: {
      max_debt: answers.max_debt ? parseInt(answers.max_debt) : undefined,
      check_suspensions: answers.check_suspensions === 'true' || answers.check_suspensions === true,
      check_arrears: answers.check_arrears === 'true' || answers.check_arrears === true,
    },
    snapshot_at: new Date().toISOString(),
    snapshot_source: 'PUBLISH',
    captured_at: new Date().toISOString(),
  }
  
  // Calculate freeze_at if meeting scheduled_at provided
  if (meetingScheduledAt) {
    // Freeze = meeting scheduled_at (nuotolinis balsavimas sustoja susirinkimo pradžioje)
    snapshot.freeze_at = meetingScheduledAt
    snapshot.scheduled_at = meetingScheduledAt
  }
  
  return snapshot
}

/**
 * Išsaugoti snapshot į meeting metadata
 * 
 * Governance Layer v19.0: Snapshot saugomas meetings.metadata.governance_snapshot
 * Snapshot yra IMMUTABLE po meeting publikavimo (status = PUBLISHED).
 * 
 * @param meetingId - Meeting ID
 * @param snapshot - Governance snapshot
 * @returns void
 * @throws Error jei meeting jau PUBLISHED ir snapshot bandyti pakeisti
 */
export async function saveMeetingSnapshot(
  meetingId: string,
  snapshot: GovernanceSnapshot
): Promise<void> {
  const supabase = await createClient()
  
  // Get meeting status to check immutability
  const { data: meeting } = await supabase
    .from('meetings')
    .select('status, metadata')
    .eq('id', meetingId)
    .single()
  
  if (!meeting) {
    throw new Error(`Meeting ${meetingId} not found`)
  }
  
  const currentMetadata = (meeting.metadata as Record<string, any>) || {}
  const existingSnapshot = currentMetadata.governance_snapshot
  
  // Governance v19.0: Snapshot is IMMUTABLE after publication
  // If meeting is PUBLISHED and snapshot already exists, block modification
  if (meeting.status === 'PUBLISHED' && existingSnapshot) {
    console.error('[saveMeetingSnapshot] Cannot modify governance snapshot for PUBLISHED meeting:', {
      meeting_id: meetingId,
      status: meeting.status,
      existing_snapshot_captured_at: existingSnapshot.captured_at,
    })
    throw new Error('Governance snapshot is immutable for PUBLISHED meetings. Snapshot can only be set during publication.')
  }
  
  // Add captured_at timestamp if not already set
  const snapshotWithTimestamp: GovernanceSnapshot = {
    ...snapshot,
    captured_at: snapshot.captured_at || new Date().toISOString(),
  }
  
  const updatedMetadata = {
    ...currentMetadata,
    governance_snapshot: snapshotWithTimestamp,
  }
  
  // Store snapshot in meetings.metadata.governance_snapshot
  const { error } = await supabase
    .from('meetings')
    .update({ metadata: updatedMetadata })
    .eq('id', meetingId)
  
  if (error) {
    console.error('[saveMeetingSnapshot] Failed to save snapshot:', error)
    throw error
  }
  
  console.log('[saveMeetingSnapshot] Governance snapshot saved to metadata:', {
    meeting_id: meetingId,
    status: meeting.status,
    quorum_percentage: snapshot.quorum_percentage,
    early_voting_days: snapshot.early_voting_days,
    procedural_item_numbers: snapshot.procedural_item_numbers,
    captured_at: snapshotWithTimestamp.captured_at,
  })
}

/**
 * Gauti snapshot iš meeting (runtime-only)
 * 
 * NOTE: Governance snapshot v18.8 yra runtime-only.
 * Snapshot nėra persistinamas DB - jis apskaičiuojamas runtime
 * pagal meetings.scheduled_at ir current governance config.
 * 
 * @param meetingId - Meeting ID
 * @returns Governance snapshot arba null
 */
export async function getMeetingSnapshot(
  meetingId: string
): Promise<GovernanceSnapshot | null> {
  const supabase = await createClient()
  
  // Get meeting data (scheduled_at, org_id, published_at)
  const { data: meeting } = await supabase
    .from('meetings')
    .select('scheduled_at, org_id, published_at')
    .eq('id', meetingId)
    .single()
  
  if (!meeting || !meeting.org_id) {
    return null
  }
  
  // Runtime snapshot calculation:
  // - freeze_at = scheduled_at (GA HARD MODE logika)
  // - Other params from current governance config
  
  if (!meeting.scheduled_at) {
    // DRAFT meeting - no snapshot
    return null
  }
  
  // Calculate snapshot runtime (naudoja current governance)
  const snapshot = await getGovernanceSnapshot(meeting.org_id, meeting.scheduled_at)
  
  return snapshot
}

/**
 * Gauti early_voting_days iš current governance
 * 
 * NOTE: Governance snapshot v18.8 yra runtime-only.
 * Visada naudoja current governance config.
 * 
 * @param orgId - Organization ID
 * @param meetingId - Meeting ID (optional, ignoruojamas - naudoja current governance)
 * @returns Early voting days
 */
export async function getEarlyVotingDays(
  orgId: string,
  meetingId?: string
): Promise<number> {
  // Runtime snapshot: visada naudoja current governance config
  // (meetingId ignoruojamas - snapshot yra runtime-only)
  const snapshot = await getGovernanceSnapshot(orgId)
  return snapshot.early_voting_days
}

/**
 * Patikrinti ar nuotolinis balsavimas užšaldytas (freeze)
 * 
 * NOTE: Governance snapshot v18.8 yra runtime-only.
 * Freeze apskaičiuojamas runtime pagal meetings.scheduled_at.
 * GA HARD MODE: freeze_at = scheduled_at (nuotolinis balsavimas sustoja susirinkimo pradžioje).
 * 
 * @param meetingId - Meeting ID
 * @returns { frozen: boolean, freeze_at?: string, message?: string }
 */
export async function isVotingFrozen(
  meetingId: string
): Promise<{ frozen: boolean; freeze_at?: string; message?: string }> {
  const supabase = await createClient()
  
  // Get meeting scheduled_at (runtime calculation)
  const { data: meeting } = await supabase
    .from('meetings')
    .select('scheduled_at, status')
    .eq('id', meetingId)
    .single()
  
  if (!meeting || !meeting.scheduled_at) {
    // DRAFT meeting arba nėra scheduled_at - not frozen
    return { frozen: false }
  }
  
  // GA HARD MODE: freeze_at = scheduled_at (nuotolinis balsavimas sustoja susirinkimo pradžioje)
  const freezeAt = new Date(meeting.scheduled_at)
  const now = new Date()
  
  if (now >= freezeAt) {
    return {
      frozen: true,
      freeze_at: freezeAt.toISOString(),
      message: `Nuotolinis balsavimas užšaldytas nuo ${freezeAt.toISOString()}. Balsuoti galima tik gyvai susirinkime.`,
    }
  }
  
  return { frozen: false, freeze_at: freezeAt.toISOString() }
}

