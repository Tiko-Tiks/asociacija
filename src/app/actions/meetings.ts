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

  // ==================================================
  // GA PROCEDŪRINIAI KLAUSIMAI (AUTOMATINIAI)
  // ==================================================
  // Automatiškai sukurti privalomus procedūrinius klausimus:
  // 1. Darbotvarkės tvirtinimas
  // 2. Pirmininko rinkimas
  // 3. Sekretoriaus rinkimas
  // ==================================================
  const meetingId = result.meeting_id

  try {
    const { createProceduralAgendaItems } = await import('@/lib/meetings/procedural-items')
    const proceduralResult = await createProceduralAgendaItems(meetingId, orgId)

    if (proceduralResult.success) {
      console.log('[createMeetingGA] Procedural items created', {
        meeting_id: meetingId,
        created: proceduralResult.created,
      })
    } else {
      console.error('[createMeetingGA] Failed to create procedural items', {
        meeting_id: meetingId,
        error: proceduralResult.error,
      })
      // Log error but don't fail the meeting creation
      // User can manually add items if auto-generation fails
    }
  } catch (error) {
    console.error('[createMeetingGA] Error creating procedural items', error)
    // Log error but don't fail the meeting creation
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
    // Translate error message
    const { translateErrorWithContext } = await import('@/lib/error-translations')
    const errorMessage = translateErrorWithContext(result?.reason, result?.details)
    
    return {
      success: false,
      error: errorMessage || 'Nepavyko atnaujinti susirinkimo grafiko',
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

  // ==================================================
  // PROCEDŪRINIŲ KLAUSIMŲ APSAUGA
  // ==================================================
  // Patikrinti ar tai ne procedūrinis klausimas (1, 2, 3)
  // Jei taip → HARD ERROR (neleidžiama ištrinti)
  // NOTE: metadata stulpelio nėra schema - procedūriniai klausimai identifikuojami tik pagal item_no
  // ==================================================
  const { data: agendaItem } = await supabase
    .from('meeting_agenda_items')
    .select('item_no, title')
    .eq('id', agendaItemId)
    .single()

  if (agendaItem) {
    const { canDeleteAgendaItem } = await import('@/lib/meetings/procedural-items')
    const deleteCheck = canDeleteAgendaItem(agendaItem)

    if (!deleteCheck.deletable) {
      console.error('[deleteAgendaItem] Procedural item deletion blocked', {
        agenda_item_id: agendaItemId,
        item_no: agendaItem.item_no,
        reason: deleteCheck.reason,
      })

      return {
        success: false,
        error: deleteCheck.reason || 'Šis klausimas negali būti ištrintas',
      }
    }
  }

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
  const user = await requireAuth(supabase)

  console.log('[getAgendaItems] Fetching agenda items for meeting:', meetingId, 'user:', user.id)
  
  // First, check if meeting exists and get its status
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select('id, status, org_id')
    .eq('id', meetingId)
    .single()

  if (meetingError) {
    console.error('[getAgendaItems] Error fetching meeting:', meetingError)
    if (meetingError.code === '42501') {
      authViolation()
    }
    if (meetingError.code === 'PGRST116') {
      console.warn('[getAgendaItems] Meeting not found:', meetingId)
      return []
    }
    operationFailed()
  }

  console.log('[getAgendaItems] Meeting found:', {
    id: meeting?.id,
    status: meeting?.status,
    org_id: meeting?.org_id,
  })
  
  const { data, error }: any = await supabase
    .from('meeting_agenda_items')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('item_no', { ascending: true })

  if (error) {
    if (error.code === '42501') {
      console.error('[getAgendaItems] RLS violation - cannot read agenda items:', {
        meetingId,
        meetingStatus: meeting?.status,
        error: error.message,
        code: error.code,
      })
      authViolation()
    }
    console.error('[getAgendaItems] Error fetching agenda items:', {
      meetingId,
      error: error.message,
      code: error.code,
      details: error,
    })
    operationFailed()
  }

  console.log('[getAgendaItems] Raw data from DB:', {
    count: data?.length || 0,
    meetingId,
    meetingStatus: meeting?.status,
    items: data,
  })

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
    const { checkActionAllowed, validateOrgCompliance } = await import('./governance-compliance')
    
    // DEBUG: Get detailed validation info
    const validation = await validateOrgCompliance(meeting.org_id)
    console.log('[publishMeeting] Governance validation result:', {
      org_id: meeting.org_id,
      validation: validation ? {
        ok: validation.ok,
        status: validation.status,
        schema_version_no: validation.schema_version_no,
        missing_required: validation.missing_required,
        invalid_types: validation.invalid_types,
        inactive_answered: validation.inactive_answered,
        details: validation.details,
      } : null,
    })
    
    const complianceCheck = await checkActionAllowed(meeting.org_id, 'publish_meeting')
    if (!complianceCheck.allowed) {
      console.error('[publishMeeting] Compliance check failed:', {
        org_id: meeting.org_id,
        reason: complianceCheck.reason,
        missing_keys: complianceCheck.missing_keys,
        status: complianceCheck.status,
        validation_details: validation,
      })
      
      return {
        success: false,
        error: complianceCheck.reason === 'INVALID_COMPLIANCE'
          ? 'Trūksta privalomų nustatymų. Prašome papildyti duomenis.'
          : 'Nepavyko patikrinti nustatymų',
        complianceError: true,
        missingKeys: complianceCheck.missing_keys,
      }
    }

    // ==================================================
    // GA PROCEDŪRINIŲ KLAUSIMŲ VALIDACIJA IR KŪRIMAS
    // ==================================================
    // Patikrinti ar yra visi privalomi procedūriniai klausimai
    // Jei trūksta → automatiškai sukurti (retry mechanism)
    // Jei vėl trūksta → HARD ERROR (neleidžiama publikuoti)
    // ==================================================
    const { validateProceduralItems, createProceduralAgendaItems } = await import('@/lib/meetings/procedural-items')
    let proceduralValidation = await validateProceduralItems(meetingId)

    // Jei trūksta procedūrinių klausimų - bandyti sukurti
    if (!proceduralValidation.valid) {
      console.warn('[publishMeeting] Procedural items missing, attempting to create', {
        meeting_id: meetingId,
        missing: proceduralValidation.missing,
        org_id: meeting.org_id,
      })

      // Bandyti sukurti trūkstamus procedūrinius klausimus
      const createResult = await createProceduralAgendaItems(meetingId, meeting.org_id)

      if (!createResult.success) {
        console.error('[publishMeeting] Failed to create procedural items', {
          meeting_id: meetingId,
          error: createResult.error,
        })

        return {
          success: false,
          error: `Nepavyko sukurti privalomų procedūrinių klausimų: ${createResult.error || 'Nežinoma klaida'}`,
          complianceError: true,
        }
      }

      // Patikrinti dar kartą po kūrimo
      proceduralValidation = await validateProceduralItems(meetingId)

      if (!proceduralValidation.valid) {
        console.error('[publishMeeting] Procedural items still missing after creation attempt', {
          meeting_id: meetingId,
          missing: proceduralValidation.missing,
        })

        return {
          success: false,
          error: proceduralValidation.details || 'Trūksta privalomų procedūrinių klausimų',
          complianceError: true,
        }
      }

      console.log('[publishMeeting] Procedural items created successfully', {
        meeting_id: meetingId,
        created: createResult.created,
      })
    }

    console.log('[publishMeeting] Procedural items validation passed', {
      meeting_id: meetingId,
    })
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
    // Translate error message
    const { translateErrorWithContext } = await import('@/lib/error-translations')
    const errorMessage = translateErrorWithContext(result?.reason, result?.details)
    
    return {
      success: false,
      error: errorMessage || 'Nepavyko publikuoti susirinkimo',
    }
  }

  // ==================================================
  // GOVERNANCE SNAPSHOT (GA HARD MODE) - v19.0
  // ==================================================
  // Governance Layer v19.0: Snapshot saugomas meetings.metadata.governance_snapshot
  // Snapshot užfiksuoja: quorum, early_voting_days, procedural item numbers
  // ==================================================
  if (meeting?.org_id) {
    try {
      // Get meeting scheduled_at for freeze calculation
      const { data: meetingData } = await supabase
        .from('meetings')
        .select('scheduled_at')
        .eq('id', meetingId)
        .single()
      
      // Get procedural agenda items (item_no 1, 2, 3)
      const { data: proceduralItems } = await supabase
        .from('meeting_agenda_items')
        .select('item_no')
        .eq('meeting_id', meetingId)
        .in('item_no', [1, 2, 3])
        .order('item_no', { ascending: true })
      
      const proceduralItemNumbers = (proceduralItems || []).map((item) => item.item_no)
      
      const { getGovernanceSnapshot, saveMeetingSnapshot } = await import('@/lib/governance/snapshot')
      const snapshot = await getGovernanceSnapshot(meeting.org_id, meetingData?.scheduled_at)
      
      // Add procedural item numbers and captured_at timestamp
      const snapshotWithProceduralItems = {
        ...snapshot,
        procedural_item_numbers: proceduralItemNumbers,
        captured_at: new Date().toISOString(),
      }
      
      // Save snapshot to meetings.metadata.governance_snapshot
      await saveMeetingSnapshot(meetingId, snapshotWithProceduralItems)
      
      console.log('[publishMeeting] Governance snapshot saved to metadata:', {
        meeting_id: meetingId,
        quorum_percentage: snapshot.quorum_percentage,
        early_voting_days: snapshot.early_voting_days,
        procedural_item_numbers: proceduralItemNumbers,
        captured_at: snapshotWithProceduralItems.captured_at,
      })
    } catch (error) {
      // Log error but don't fail the publish
      console.error('[publishMeeting] Failed to save governance snapshot:', error)
    }
  }

  // Automatically create votes for agenda items with resolution_id
  try {
    const agendaItems = await getAgendaItems(meetingId)
    const { createVote } = await import('./voting')
    
    // Create votes for each agenda item with resolution_id
    for (const item of agendaItems) {
      if (item.resolution_id) {
        // Check if vote already exists
        const { data: existingVote } = await supabase
          .from('votes')
          .select('id')
          .eq('meeting_id', meetingId)
          .eq('resolution_id', item.resolution_id)
          .eq('kind', 'GA')
          .maybeSingle()
        
        // Only create if vote doesn't exist
        if (!existingVote) {
          await createVote({
            resolution_id: item.resolution_id,
            kind: 'GA',
            meeting_id: meetingId,
          })
        }
      }
    }
  } catch (error) {
    // Log error but don't fail the publish operation
    console.error('Error creating votes for agenda items:', error)
  }

  // Revalidate meeting-related paths
  // Note: meetings are displayed at /dashboard/[slug]/governance/[id]
  revalidatePath(`/dashboard`, 'layout')
  
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

// ==================================================
// UPDATE MEETING
// ==================================================

/**
 * Update meeting details (title, scheduled_at, location)
 * Only allowed for DRAFT meetings or OWNER/BOARD
 */
export async function updateMeeting(
  meetingId: string,
  updates: {
    title?: string
    scheduled_at?: string
    location?: string
  }
): Promise<{
  success: boolean
  error?: string
  earliestAllowed?: string
  noticeDays?: number
}> {
  const supabase = await createClient()
  await requireAuth(supabase)

  // Get current meeting to check status
  const { data: meeting, error: fetchError } = await supabase
    .from('meetings')
    .select('status, org_id')
    .eq('id', meetingId)
    .single()

  if (fetchError || !meeting) {
    return {
      success: false,
      error: 'Susirinkimas nerastas',
    }
  }

  // If updating schedule, validate it
  if (updates.scheduled_at) {
    const scheduleCheck = await canScheduleMeeting(meeting.org_id, updates.scheduled_at)
    if (!scheduleCheck.allowed) {
      const { translateErrorWithContext } = await import('@/lib/error-translations')
      const errorMessage = translateErrorWithContext(scheduleCheck.reason, scheduleCheck.details)
      
      return {
        success: false,
        error: errorMessage || 'Nepavyko atnaujinti susirinkimo grafiko',
        earliestAllowed: scheduleCheck.earliest_allowed,
        noticeDays: scheduleCheck.notice_days,
      }
    }
  }

  // Build update object
  const updateData: any = {}
  if (updates.title !== undefined) updateData.title = updates.title
  if (updates.scheduled_at !== undefined) updateData.scheduled_at = updates.scheduled_at
  if (updates.location !== undefined) updateData.location = updates.location

  const { error: updateError } = await supabase
    .from('meetings')
    .update(updateData)
    .eq('id', meetingId)

  if (updateError) {
    if (updateError.code === '42501') {
      authViolation()
    }
    console.error('Error updating meeting:', updateError)
    return {
      success: false,
      error: updateError.message || 'Nepavyko atnaujinti susirinkimo',
    }
  }

  revalidatePath(`/dashboard`, 'layout')
  return {
    success: true,
  }
}

// ==================================================
// DELETE MEETING
// ==================================================

/**
 * Delete a meeting
 * Only allowed for DRAFT meetings or OWNER/BOARD
 */
export async function deleteMeeting(
  meetingId: string
): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()
  await requireAuth(supabase)

  // Get current meeting to check status
  const { data: meeting, error: fetchError } = await supabase
    .from('meetings')
    .select('status')
    .eq('id', meetingId)
    .single()

  if (fetchError || !meeting) {
    return {
      success: false,
      error: 'Susirinkimas nerastas',
    }
  }

  // Only allow deletion of DRAFT meetings
  if (meeting.status !== 'DRAFT') {
    return {
      success: false,
      error: 'Galima ištrinti tik juodraščio būsenos susirinkimus',
    }
  }

  const { error: deleteError } = await supabase
    .from('meetings')
    .delete()
    .eq('id', meetingId)

  if (deleteError) {
    if (deleteError.code === '42501') {
      authViolation()
    }
    console.error('Error deleting meeting:', deleteError)
    return {
      success: false,
      error: deleteError.message || 'Nepavyko ištrinti susirinkimo',
    }
  }

  revalidatePath(`/dashboard`, 'layout')
  return {
    success: true,
  }
}

/**
 * Cancel a meeting
 * Sets status to CANCELLED and closes all associated votes
 * Only allowed for PUBLISHED meetings or OWNER/BOARD
 */
export async function cancelMeeting(
  meetingId: string
): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()
  await requireAuth(supabase)

  // Get current meeting to check status
  const { data: meeting, error: fetchError } = await supabase
    .from('meetings')
    .select('status, org_id')
    .eq('id', meetingId)
    .single()

  if (fetchError || !meeting) {
    return {
      success: false,
      error: 'Susirinkimas nerastas',
    }
  }

  // Only allow cancellation of PUBLISHED or DRAFT meetings
  if (meeting.status === 'CANCELLED' || meeting.status === 'COMPLETED') {
    return {
      success: false,
      error: 'Negalima atšaukti jau atšaukto arba užbaigto susirinkimo',
    }
  }

  // Update meeting status to CANCELLED
  const { error: updateError } = await supabase
    .from('meetings')
    .update({ status: 'CANCELLED' })
    .eq('id', meetingId)

  if (updateError) {
    if (updateError.code === '42501') {
      authViolation()
    }
    console.error('Error cancelling meeting:', updateError)
    return {
      success: false,
      error: updateError.message || 'Nepavyko atšaukti susirinkimo',
    }
  }

  // Close all associated votes
  try {
    const { error: votesError } = await supabase
      .from('votes')
      .update({ status: 'CLOSED' })
      .eq('meeting_id', meetingId)
      .eq('status', 'OPEN')

    if (votesError) {
      // Log but don't fail - votes closure is best effort
      console.error('Error closing votes for cancelled meeting:', votesError)
    }
  } catch (error) {
    // Log but don't fail - votes closure is best effort
    console.error('Error closing votes for cancelled meeting:', error)
  }

  revalidatePath(`/dashboard`, 'layout')
  return {
    success: true,
  }
}

/**
 * Complete a meeting - closes all votes and auto-abstains remote voters who didn't vote
 */
export async function completeMeeting(
  meetingId: string
): Promise<{
  success: boolean
  abstainCount?: number
  error?: string
}> {
  const supabase = await createClient()
  await requireAuth(supabase)

  // Get current meeting to check status
  const { data: meeting, error: fetchError } = await supabase
    .from('meetings')
    .select('status, org_id')
    .eq('id', meetingId)
    .single()

  if (fetchError || !meeting) {
    return {
      success: false,
      error: 'Susirinkimas nerastas',
    }
  }

  // Only allow completion of PUBLISHED meetings
  if (meeting.status !== 'PUBLISHED') {
    return {
      success: false,
      error: `Galima užbaigti tik publikuotus susirinkimus (dabartinis statusas: ${meeting.status})`,
    }
  }

  // ==================================================
  // GA UŽBAIGIMO VALIDACIJA
  // ==================================================
  // Patikrinti ar įvykdytos visos GA reikalavimo sąlygos
  // PRODUCTION: Visi 4 patikrinimai privalomi
  // TEST: Tik procedural + votes privalomi
  // ==================================================
  
  // Determine if this is a GA meeting (has GA votes)
  const { count: gaVotesCount } = await supabase
    .from('votes')
    .select('id', { count: 'exact' })
    .eq('meeting_id', meetingId)
    .eq('kind', 'GA')
    .limit(1)

  const isGAMeeting = (gaVotesCount || 0) > 0

  if (isGAMeeting) {
    console.log('[completeMeeting] GA meeting detected, validating completion requirements')

    const { validateGACompletion } = await import('@/lib/meetings/ga-completion')
    const validation = await validateGACompletion(meetingId)

    if (!validation.ready) {
      console.error('[completeMeeting] GA completion validation failed', {
        meeting_id: meetingId,
        reason: validation.reason,
        checks: validation.checks,
        missing: validation.missing,
        ga_mode: validation.ga_mode,
      })

      return {
        success: false,
        error: validation.reason || 'GA susirinkimas neparuoštas užbaigimui',
      }
    }

    console.log('[completeMeeting] GA validation passed', {
      meeting_id: meetingId,
      ga_mode: validation.ga_mode,
      checks: validation.checks,
    })

    // NOTE: TEST MODE marking removed due to Code Freeze (metadata stulpelio nėra schema)
    // TEST MODE žymė nėra persistinama DB - ji nustatoma runtime pagal GA_MODE env variable
    // Governance snapshot yra runtime-only - test_only statusas nustatomas runtime
    if (validation.ga_mode === 'TEST') {
      console.log('[completeMeeting] TEST MODE: Meeting completed in TEST mode (runtime-only, not persisted)')
      // NO-OP: test_only žymė nėra persistinama DB (Code Freeze - metadata stulpelio nėra)
      // TEST MODE nustatomas runtime pagal GA_MODE env variable
    }
  }

  // Close all associated votes first
  try {
    const { error: votesError } = await supabase
      .from('votes')
      .update({ status: 'CLOSED' })
      .eq('meeting_id', meetingId)
      .eq('status', 'OPEN')

    if (votesError) {
      console.error('Error closing votes for completed meeting:', votesError)
      return {
        success: false,
        error: 'Nepavyko uždaryti balsavimų',
      }
    }
  } catch (error) {
    console.error('Error closing votes for completed meeting:', error)
    return {
      success: false,
      error: 'Nepavyko uždaryti balsavimų',
    }
  }

  // Auto-abstain remote voters who didn't vote
  let abstainCount = 0
  try {
    const { data: abstainResult, error: abstainError } = await supabase.rpc(
      'auto_abstain_for_remote_voters',
      { p_meeting_id: meetingId }
    )

    if (abstainError) {
      // Log but don't fail - auto-abstain is best effort
      console.error('Error auto-abstaining remote voters:', abstainError)
    } else if (abstainResult?.[0]) {
      abstainCount = abstainResult[0].abstain_count || 0
    }
  } catch (error) {
    // Log but don't fail - auto-abstain is best effort
    console.error('Error auto-abstaining remote voters:', error)
  }

  // Update meeting status to COMPLETED
  const { error: updateError } = await supabase
    .from('meetings')
    .update({ status: 'COMPLETED' })
    .eq('id', meetingId)

  if (updateError) {
    if (updateError.code === '42501') {
      authViolation()
    }
    console.error('Error completing meeting:', updateError)
    return {
      success: false,
      error: updateError.message || 'Nepavyko užbaigti susirinkimo',
    }
  }

  revalidatePath(`/dashboard`, 'layout')

  return {
    success: true,
    abstainCount,
  }
}

