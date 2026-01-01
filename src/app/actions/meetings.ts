'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'
import { revalidatePath } from 'next/cache'

// ==================================================
// TYPES
// ==================================================

export interface Meeting {
  id: string
  org_id: string
  title: string
  scheduled_at: string
  location: string | null
  meeting_type: string
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED'
  published_at: string | null
  notice_days: number | null
  notice_sent_at: string | null
  agenda_version: number
  quorum_met: boolean | null
  created_by: string | null
  created_at: string
}

export interface AgendaItem {
  id: string
  meeting_id: string
  item_no: number
  title: string
  summary: string | null
  details: string | null
  resolution_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string | null
}

export interface AgendaAttachment {
  id: string
  agenda_item_id: string
  storage_bucket: string
  storage_path: string
  file_name: string
  mime_type: string | null
  size_bytes: number | null
  uploaded_by: string | null
  uploaded_at: string
}

export interface CanScheduleMeetingResult {
  allowed: boolean
  reason: string
  earliest_allowed: string
  notice_days: number
  details: Record<string, any>
}

// ==================================================
// SCHEDULING
// ==================================================

/**
 * Check if a meeting can be scheduled at the given time
 */
export async function canScheduleMeeting(
  orgId: string,
  scheduledAt: string
): Promise<CanScheduleMeetingResult> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error }: any = await supabase.rpc('can_schedule_meeting', {
    p_org_id: orgId,
    p_scheduled_at: scheduledAt,
  })

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error checking schedule:', error)
    operationFailed()
  }

  return data?.[0] || {
    allowed: false,
    reason: 'UNKNOWN_ERROR',
    earliest_allowed: new Date().toISOString(),
    notice_days: 14,
    details: {},
  }
}

/**
 * Create a GA meeting (DRAFT status)
 */
export async function createMeetingGA(
  orgId: string,
  title: string,
  scheduledAt: string,
  location?: string
): Promise<{
  success: boolean
  meetingId?: string
  error?: string
  earliestAllowed?: string
  noticeDays?: number
  complianceError?: boolean
  missingKeys?: string[]
}> {
  const supabase = await createClient()
  await requireAuth(supabase)

  // Check compliance before critical action
  const { checkActionAllowed } = await import('./governance-compliance')
  const complianceCheck = await checkActionAllowed(orgId, 'create_meeting')
  if (!complianceCheck.allowed) {
    return {
      success: false,
      error: complianceCheck.reason === 'INVALID_COMPLIANCE'
        ? 'Trūksta privalomų nustatymų. Prašome papildyti duomenis.'
        : 'Nepavyko patikrinti nustatymų',
      complianceError: true,
      missingKeys: complianceCheck.missing_keys,
    }
  }

  const { data, error }: any = await supabase.rpc('create_meeting_ga', {
    p_org_id: orgId,
    p_title: title,
    p_scheduled_at: scheduledAt,
    p_location: location || null,
  })

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error creating meeting:', error)
    return {
      success: false,
      error: error.message || 'Failed to create meeting',
    }
  }

  const result = data?.[0]
  if (!result?.ok) {
    return {
      success: false,
      error: result?.reason || 'Failed to create meeting',
      earliestAllowed: result?.earliest_allowed,
      noticeDays: result?.notice_days,
    }
  }

  revalidatePath(`/dashboard/[slug]/meetings`, 'page')
  return {
    success: true,
    meetingId: result.meeting_id,
    earliestAllowed: result.earliest_allowed,
    noticeDays: result.notice_days,
  }
}

/**
 * Update meeting schedule (only DRAFT meetings)
 */
export async function updateMeetingSchedule(
  meetingId: string,
  scheduledAt: string,
  location?: string
): Promise<{
  success: boolean
  error?: string
  earliestAllowed?: string
  noticeDays?: number
}> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error }: any = await supabase.rpc('update_meeting_schedule', {
    p_meeting_id: meetingId,
    p_scheduled_at: scheduledAt,
    p_location: location || null,
  })

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error updating meeting schedule:', error)
    return {
      success: false,
      error: error.message || 'Failed to update meeting schedule',
    }
  }

  const result = data?.[0]
  if (!result?.ok) {
    return {
      success: false,
      error: result?.reason || 'Failed to update meeting schedule',
      earliestAllowed: result?.earliest_allowed,
      noticeDays: result?.notice_days,
    }
  }

  revalidatePath(`/dashboard/[slug]/meetings`, 'page')
  return {
    success: true,
    earliestAllowed: result.earliest_allowed,
    noticeDays: result.notice_days,
  }
}

// ==================================================
// AGENDA ITEMS
// ==================================================

/**
 * Add agenda item to a meeting
 */
export async function addAgendaItem(
  meetingId: string,
  itemNo: number,
  title: string,
  summary?: string,
  details?: string,
  resolutionId?: string
): Promise<{
  success: boolean
  agendaItemId?: string
  error?: string
}> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error }: any = await supabase.rpc('add_agenda_item', {
    p_meeting_id: meetingId,
    p_item_no: itemNo,
    p_title: title,
    p_summary: summary || null,
    p_details: details || null,
    p_resolution_id: resolutionId || null,
  })

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error adding agenda item:', error)
    return {
      success: false,
      error: error.message || 'Failed to add agenda item',
    }
  }

  const result = data?.[0]
  if (!result?.ok) {
    return {
      success: false,
      error: result?.reason || 'Failed to add agenda item',
    }
  }

  revalidatePath(`/dashboard/[slug]/meetings`, 'page')
  return {
    success: true,
    agendaItemId: result.agenda_item_id,
  }
}

/**
 * Update agenda item
 */
export async function updateAgendaItem(
  agendaItemId: string,
  updates: {
    itemNo?: number
    title?: string
    summary?: string
    details?: string
    resolutionId?: string | null
  }
): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error }: any = await supabase.rpc('update_agenda_item', {
    p_agenda_item_id: agendaItemId,
    p_item_no: updates.itemNo || null,
    p_title: updates.title || null,
    p_summary: updates.summary || null,
    p_details: updates.details || null,
    p_resolution_id: updates.resolutionId || null,
  })

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error updating agenda item:', error)
    return {
      success: false,
      error: error.message || 'Failed to update agenda item',
    }
  }

  const result = data?.[0]
  if (!result?.ok) {
    return {
      success: false,
      error: result?.reason || 'Failed to update agenda item',
    }
  }

  revalidatePath(`/dashboard/[slug]/meetings`, 'page')
  return {
    success: true,
  }
}

/**
 * Delete agenda item
 */
export async function deleteAgendaItem(agendaItemId: string): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error }: any = await supabase.rpc('delete_agenda_item', {
    p_agenda_item_id: agendaItemId,
  })

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error deleting agenda item:', error)
    return {
      success: false,
      error: error.message || 'Failed to delete agenda item',
    }
  }

  const result = data?.[0]
  if (!result?.ok) {
    return {
      success: false,
      error: result?.reason || 'Failed to delete agenda item',
    }
  }

  revalidatePath(`/dashboard/[slug]/meetings`, 'page')
  return {
    success: true,
  }
}

/**
 * Get agenda items for a meeting
 */
export async function getAgendaItems(meetingId: string): Promise<AgendaItem[]> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error }: any = await supabase
    .from('meeting_agenda_items')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('item_no', { ascending: true })

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error fetching agenda items:', error)
    operationFailed()
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    meeting_id: item.meeting_id,
    item_no: item.item_no,
    title: item.title,
    summary: item.summary,
    details: item.details,
    resolution_id: item.resolution_id,
    created_by: item.created_by,
    created_at: item.created_at,
    updated_at: item.updated_at,
  }))
}

// ==================================================
// ATTACHMENTS
// ==================================================

/**
 * Attach file metadata to agenda item
 * Note: File upload to Supabase Storage should be done client-side first
 */
export async function attachAgendaFileMetadata(
  agendaItemId: string,
  storagePath: string,
  fileName: string,
  mimeType?: string,
  sizeBytes?: number
): Promise<{
  success: boolean
  attachmentId?: string
  error?: string
}> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error }: any = await supabase.rpc('attach_agenda_file_metadata', {
    p_agenda_item_id: agendaItemId,
    p_storage_path: storagePath,
    p_file_name: fileName,
    p_mime_type: mimeType || null,
    p_size_bytes: sizeBytes || null,
  })

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error attaching file metadata:', error)
    return {
      success: false,
      error: error.message || 'Failed to attach file metadata',
    }
  }

  const result = data?.[0]
  if (!result?.ok) {
    return {
      success: false,
      error: result?.reason || 'Failed to attach file metadata',
    }
  }

  revalidatePath(`/dashboard/[slug]/meetings`, 'page')
  return {
    success: true,
    attachmentId: result.attachment_id,
  }
}

/**
 * Get attachments for an agenda item
 */
export async function getAgendaAttachments(
  agendaItemId: string
): Promise<AgendaAttachment[]> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error }: any = await supabase
    .from('meeting_agenda_attachments')
    .select('*')
    .eq('agenda_item_id', agendaItemId)
    .order('uploaded_at', { ascending: false })

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error fetching attachments:', error)
    operationFailed()
  }

  return (data || []).map((att: any) => ({
    id: att.id,
    agenda_item_id: att.agenda_item_id,
    storage_bucket: att.storage_bucket,
    storage_path: att.storage_path,
    file_name: att.file_name,
    mime_type: att.mime_type,
    size_bytes: att.size_bytes,
    uploaded_by: att.uploaded_by,
    uploaded_at: att.uploaded_at,
  }))
}

/**
 * Get signed URL for agenda attachment download
 */
export async function getAgendaAttachmentSignedUrl(
  attachmentId: string
): Promise<{
  success: boolean
  url?: string
  error?: string
}> {
  const supabase = await createClient()
  await requireAuth(supabase)

  // Get attachment metadata
  const { data: attachment, error: attError }: any = await supabase
    .from('meeting_agenda_attachments')
    .select('storage_bucket, storage_path')
    .eq('id', attachmentId)
    .single()

  if (attError) {
    if (attError.code === '42501') {
      authViolation()
    }
    console.error('Error fetching attachment:', attError)
    return {
      success: false,
      error: 'Attachment not found',
    }
  }

  // Generate signed URL (valid for 1 hour)
  const { data: signedUrl, error: urlError } = await supabase.storage
    .from(attachment.storage_bucket)
    .createSignedUrl(attachment.storage_path, 3600)

  if (urlError) {
    console.error('Error generating signed URL:', urlError)
    return {
      success: false,
      error: 'Failed to generate download URL',
    }
  }

  return {
    success: true,
    url: signedUrl.signedUrl,
  }
}

// ==================================================
// PUBLISH
// ==================================================

/**
 * Publish a meeting (DRAFT -> PUBLISHED)
 */
export async function publishMeeting(meetingId: string): Promise<{
  success: boolean
  publishedAt?: string
  noticeDays?: number
  error?: string
  complianceError?: boolean
  missingKeys?: string[]
}> {
  const supabase = await createClient()
  await requireAuth(supabase)

  // Get org_id from meeting
  const { data: meeting } = await supabase
    .from('meetings')
    .select('org_id')
    .eq('id', meetingId)
    .single()

  if (meeting?.org_id) {
    // Check compliance before critical action
    const { checkActionAllowed } = await import('./governance-compliance')
    const complianceCheck = await checkActionAllowed(meeting.org_id, 'publish_meeting')
    if (!complianceCheck.allowed) {
      return {
        success: false,
        error: complianceCheck.reason === 'INVALID_COMPLIANCE'
          ? 'Trūksta privalomų nustatymų. Prašome papildyti duomenis.'
          : 'Nepavyko patikrinti nustatymų',
        complianceError: true,
        missingKeys: complianceCheck.missing_keys,
      }
    }
  }

  const { data, error }: any = await supabase.rpc('publish_meeting', {
    p_meeting_id: meetingId,
  })

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error publishing meeting:', error)
    return {
      success: false,
      error: error.message || 'Failed to publish meeting',
    }
  }

  const result = data?.[0]
  if (!result?.ok) {
    return {
      success: false,
      error: result?.reason || 'Failed to publish meeting',
    }
  }

  revalidatePath(`/dashboard/[slug]/meetings`, 'page')
  return {
    success: true,
    publishedAt: result.published_at,
    noticeDays: result.notice_days,
  }
}

// ==================================================
// LIST MEETINGS
// ==================================================

/**
 * List meetings for an organization
 */
export async function listMeetings(
  orgId: string,
  includeDraft: boolean = false
): Promise<Meeting[]> {
  const supabase = await createClient()
  await requireAuth(supabase)

  let query = supabase
    .from('meetings')
    .select('*')
    .eq('org_id', orgId)
    .order('scheduled_at', { ascending: false })

  // Filter by status based on user role
  if (!includeDraft) {
    query = query.eq('status', 'PUBLISHED')
  } else {
    // If includeDraft=true, user must be OWNER/BOARD (enforced by RLS)
    query = query.in('status', ['DRAFT', 'PUBLISHED'])
  }

  const { data, error }: any = await query

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error fetching meetings:', error)
    operationFailed()
  }

  return (data || []).map((m: any) => ({
    id: m.id,
    org_id: m.org_id,
    title: m.title,
    scheduled_at: m.scheduled_at,
    location: m.location,
    meeting_type: m.meeting_type || 'GA',
    status: m.status || 'DRAFT',
    published_at: m.published_at,
    notice_days: m.notice_days,
    notice_sent_at: m.notice_sent_at,
    agenda_version: m.agenda_version || 1,
    quorum_met: m.quorum_met,
    created_by: m.created_by,
    created_at: m.created_at,
  }))
}

/**
 * Get a single meeting by ID
 */
export async function getMeeting(meetingId: string): Promise<Meeting | null> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error }: any = await supabase
    .from('meetings')
    .select('*')
    .eq('id', meetingId)
    .single()

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching meeting:', error)
    operationFailed()
  }

  if (!data) return null

  return {
    id: data.id,
    org_id: data.org_id,
    title: data.title,
    scheduled_at: data.scheduled_at,
    location: data.location,
    meeting_type: data.meeting_type || 'GA',
    status: data.status || 'DRAFT',
    published_at: data.published_at,
    notice_days: data.notice_days,
    notice_sent_at: data.notice_sent_at,
    agenda_version: data.agenda_version || 1,
    quorum_met: data.quorum_met,
    created_by: data.created_by,
    created_at: data.created_at,
  }
}

