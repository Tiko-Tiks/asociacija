'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation } from '@/app/domain/errors'
import type { Meeting, AgendaItem, AgendaAttachment } from './meetings'

/**
 * Get published meetings for organization
 * Returns meetings with PUBLISHED status and their agenda items
 */
export async function getPublishedMeetings(orgId: string): Promise<Array<{
  meeting: Meeting
  agendaItems: AgendaItem[]
  agendaCount: number
}>> {
  const supabase = await createClient()
  await requireAuth(supabase)

  // Get published meetings (newest first)
  const { data: meetings, error: meetingsError } = await supabase
    .from('meetings')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'PUBLISHED')
    .order('scheduled_at', { ascending: false })

  if (meetingsError) {
    if (meetingsError.code === '42501') {
      authViolation()
    }
    console.error('Error fetching published meetings:', meetingsError)
    return []
  }

  if (!meetings || meetings.length === 0) {
    return []
  }

  // Get agenda items for each meeting
  const meetingsWithAgenda = await Promise.all(
    meetings.map(async (meeting) => {
      const { data: items, error: itemsError } = await supabase
        .from('meeting_agenda_items')
        .select('*')
        .eq('meeting_id', meeting.id)
        .order('item_no', { ascending: true })

      if (itemsError) {
        console.error(`[getPublishedMeetings] Error fetching agenda for meeting ${meeting.id}:`, itemsError)
      }

      console.log(`[getPublishedMeetings] Meeting ${meeting.id} has ${items?.length || 0} agenda items`)

      return {
        meeting: meeting as Meeting,
        agendaItems: (items || []) as AgendaItem[],
        agendaCount: items?.length || 0,
      }
    })
  )

  console.log('[getPublishedMeetings] Total meetings with agenda:', meetingsWithAgenda.length)
  return meetingsWithAgenda
}

/**
 * Get single published meeting with full details
 */
export async function getPublishedMeeting(meetingId: string): Promise<{
  meeting: Meeting | null
  agendaItems: AgendaItem[]
  attachments: Record<string, AgendaAttachment[]>
} | null> {
  const supabase = await createClient()
  await requireAuth(supabase)

  // Get meeting - allow PUBLISHED and COMPLETED (for viewing after completion)
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', meetingId)
    .in('status', ['PUBLISHED', 'COMPLETED'])
    .single()

  if (meetingError || !meeting) {
    return null
  }

  // Get agenda items
  const { data: items } = await supabase
    .from('meeting_agenda_items')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('item_no', { ascending: true })

  // Get attachments for each agenda item
  const attachments: Record<string, AgendaAttachment[]> = {}
  
  // First, let's check total attachments for this meeting (debug)
  const { data: allMeetingAttachments, error: allAttsError } = await supabase
    .from('meeting_agenda_attachments')
    .select(`
      *,
      meeting_agenda_items!inner(meeting_id, item_no)
    `)
    .eq('meeting_agenda_items.meeting_id', meetingId)
  
  console.log('[getPublishedMeeting] All attachments for meeting:', {
    meetingId,
    totalAttachments: allMeetingAttachments?.length || 0,
    error: allAttsError?.message,
    attachments: allMeetingAttachments,
  })
  
  if (items) {
    for (const item of items) {
      const { data: atts, error: attsError } = await supabase
        .from('meeting_agenda_attachments')
        .select('*')
        .eq('agenda_item_id', item.id)
        .order('uploaded_at', { ascending: true })

      if (attsError) {
        console.error(`[getPublishedMeeting] Error fetching attachments for agenda item ${item.id}:`, attsError)
      }

      attachments[item.id] = (atts || []) as AgendaAttachment[]
      
      // Debug logging for each item
      console.log(`[getPublishedMeeting] Item #${item.item_no} (${item.id}):`, {
        attachmentsFound: atts?.length || 0,
        error: attsError?.message,
      })
    }
  }
  
  const itemsWithAttachments = Object.entries(attachments).filter(([_, atts]) => atts.length > 0).length
  console.log('[getPublishedMeeting] Summary:', {
    totalItems: items?.length || 0,
    itemsWithAttachments,
  })

  return {
    meeting: meeting as Meeting,
    agendaItems: (items || []) as AgendaItem[],
    attachments,
  }
}

