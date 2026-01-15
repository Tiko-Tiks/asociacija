/**
 * CHAIR DASHBOARD DATA LOADER
 * 
 * Backend-only data loading for Chair (Pirmininkas) dashboard.
 * 
 * Rules:
 * - Read-only (no mutations)
 * - Uses governance snapshot
 * - Uses validators (procedural sequence, completion)
 * - NO logical interpretation on UI side
 * - RLS enforced
 * 
 * @version 18.8.6
 * @see docs/DASHBOARD_ARCHITECTURE_v18.md
 */

import { createClient } from '@/lib/supabase/server'
import { getGAMode } from '@/lib/config/ga-mode'
import { validateGACompletion } from '@/lib/meetings/ga-completion'
import { isProceduralSequenceCompleted } from '@/lib/meetings/procedural-items'

export interface ChairDashboardData {
  org: {
    id: string
    name: string
    slug: string
  }
  user: {
    id: string
    role: 'OWNER' | 'BOARD'
    is_pirmininkas: boolean
  }
  ga_mode: 'TEST' | 'PRODUCTION'
  active_meeting: {
    id: string
    title: string
    scheduled_at: string
    status: string
    quorum: {
      total_members: number
      remote_voters: number
      live_attendees: number
      total_participants: number
      quorum_required: number
      quorum_met: boolean
      missing_count: number
    }
    procedural_sequence: {
      completed: boolean
      missing: string[]
    }
    completion_validation: {
      ready: boolean
      checks: {
        procedural_items_approved: boolean
        all_votes_closed: boolean
        quorum_met: boolean
        protocol_signed: boolean
      }
      missing: string[]
    }
    open_votes_count: number
  } | null
  agenda_items: Array<{
    id: string
    item_no: string
    title: string
    is_procedural: boolean
    resolution_id: string | null
    resolution_status: string | null
    vote_id: string | null
    vote_status: string | null
    locked: boolean
    lock_reason?: string
  }>
}

/**
 * Load Chair Dashboard data
 * 
 * @param orgSlug - Organization slug
 * @param userId - User ID
 * @returns ChairDashboardData
 */
export async function loadChairDashboard(
  orgSlug: string,
  userId: string
): Promise<ChairDashboardData | null> {
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
    .select('role, member_status')
    .eq('org_id', org.id)
    .eq('user_id', userId)
    .eq('member_status', 'ACTIVE')
    .single()

  if (!membership) return null

  const isOwner = membership.role === 'OWNER'

  // Check pirmininkas position
  const { data: position } = await supabase
    .from('positions')
    .select('title')
    .eq('org_id', org.id)
    .eq('user_id', userId)
    .eq('is_active', true)
    .ilike('title', '%PIRMININKAS%')
    .single()

  const isPirmininkas = !!position

  // Get GA MODE
  const gaMode = getGAMode()

  // Get active GA meeting (PUBLISHED only - COMPLETED meetings are archived)
  // NOTE: metadata stulpelio nėra schema (Code Freeze) - governance snapshot yra runtime-only
  // NOTE: protocol_pdf_url stulpelio nėra meetings table - Code Freeze
  const { data: activeMeeting } = await supabase
    .from('meetings')
    .select('id, title, scheduled_at, status, meeting_type')
    .eq('org_id', org.id)
    .eq('meeting_type', 'GA')
    .eq('status', 'PUBLISHED')
    .order('scheduled_at', { ascending: false })
    .limit(1)
    .maybeSingle()  // Use maybeSingle instead of single to handle 0 results

  let activeMeetingData = null

  if (activeMeeting) {
    // Calculate quorum (placeholder - real implementation needed)
    const { data: totalMembersData } = await supabase
      .from('memberships')
      .select('id', { count: 'exact' })
      .eq('org_id', org.id)
      .eq('member_status', 'ACTIVE')

    const totalMembers = totalMembersData?.length || 0

    // Get remote voters
    const { data: remoteVotersData } = await supabase
      .from('meeting_remote_voters')
      .select('membership_id', { count: 'exact' })
      .eq('meeting_id', activeMeeting.id)

    const remoteVoters = remoteVotersData?.length || 0

    // Get live attendees
    const { data: liveAttendeesData } = await supabase
      .from('meeting_attendance')
      .select('id', { count: 'exact' })
      .eq('meeting_id', activeMeeting.id)
      .eq('present', true)
      .eq('mode', 'IN_PERSON')

    const liveAttendees = liveAttendeesData?.length || 0

    const totalParticipants = remoteVoters + liveAttendees
    const quorumRequired = Math.ceil(totalMembers * 0.5) // 50% from snapshot
    const quorumMet = totalParticipants >= quorumRequired

    // Check procedural sequence
    const proceduralSequence = await isProceduralSequenceCompleted(activeMeeting.id)

    // Check completion validation
    const completionValidation = await validateGACompletion(activeMeeting.id)

    // Get open votes count
    const { count: openVotesCount } = await supabase
      .from('votes')
      .select('id', { count: 'exact', head: true })
      .eq('meeting_id', activeMeeting.id)
      .eq('kind', 'GA')
      .eq('status', 'OPEN')

    activeMeetingData = {
      id: activeMeeting.id,
      title: activeMeeting.title,
      scheduled_at: activeMeeting.scheduled_at,
      status: activeMeeting.status,
      quorum: {
        total_members: totalMembers,
        remote_voters: remoteVoters,
        live_attendees: liveAttendees,
        total_participants: totalParticipants,
        quorum_required: quorumRequired,
        quorum_met: quorumMet,
        missing_count: quorumMet ? 0 : quorumRequired - totalParticipants,
      },
      procedural_sequence: proceduralSequence,
      completion_validation: completionValidation,
      open_votes_count: openVotesCount || 0,
    }
  }

  // Get agenda items (if active meeting)
  let agendaItems: ChairDashboardData['agenda_items'] = []

  if (activeMeeting) {
    // NOTE: metadata stulpelio nėra meeting_agenda_items table (Code Freeze)
    const { data: items } = await supabase
      .from('meeting_agenda_items')
      .select(`
        id,
        item_no,
        title,
        resolution_id,
        resolutions (
          status
        )
      `)
      .eq('meeting_id', activeMeeting.id)
      .order('item_no', { ascending: true })

    if (items) {
      // Get votes for resolutions
      const resolutionIds = items.filter((i) => i.resolution_id).map((i) => i.resolution_id!)

      const { data: votes } = await supabase
        .from('votes')
        .select('id, resolution_id, status')
        .eq('meeting_id', activeMeeting.id)
        .eq('kind', 'GA')
        .in('resolution_id', resolutionIds)

      agendaItems = items.map((item) => {
        // item_no is INTEGER in DB, compare as number
        const itemNo = typeof item.item_no === 'number' ? item.item_no : parseInt(String(item.item_no), 10)
        const isProcedural = itemNo >= 1 && itemNo <= 3
        const resolution = (item as any).resolutions
        const vote = votes?.find((v) => v.resolution_id === item.resolution_id)

        // Determine if locked (procedural sequence)
        let locked = false
        let lockReason: string | undefined

        if (!isProcedural && activeMeetingData) {
          if (!activeMeetingData.procedural_sequence.completed) {
            locked = true
            lockReason = `Užrakinta, kol neužbaigti: ${activeMeetingData.procedural_sequence.missing.join(', ')}`
          }
        }

        return {
          id: item.id,
          item_no: String(item.item_no), // Convert to string for interface
          title: item.title,
          is_procedural: isProcedural,
          resolution_id: item.resolution_id,
          resolution_status: resolution?.status || null,
          vote_id: vote?.id || null,
          vote_status: vote?.status || null,
          locked,
          lock_reason: lockReason,
        }
      })
    }
  }

  return {
    org,
    user: {
      id: userId,
      role: isOwner ? 'OWNER' : 'BOARD',
      is_pirmininkas: isPirmininkas,
    },
    ga_mode: gaMode,
    active_meeting: activeMeetingData,
    agenda_items: agendaItems,
  }
}

