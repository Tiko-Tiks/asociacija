'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'
import { revalidatePath } from 'next/cache'

// ==================================================
// TYPES
// ==================================================

export interface MeetingProtocol {
  id: string
  org_id: string
  meeting_id: string
  protocol_number: string
  version: number
  status: 'DRAFT' | 'FINAL'
  snapshot: Record<string, any>
  snapshot_hash: string
  pdf_bucket: string | null
  pdf_path: string | null
  created_by: string | null
  created_at: string
  finalized_by: string | null
  finalized_at: string | null
}

export interface ProtocolSnapshot {
  meeting: {
    id: string
    org_id: string
    title: string
    scheduled_at: string
    location: string | null
    meeting_type: string
    status: string
    published_at: string | null
    notice_days: number | null
  }
  attendance: {
    present_in_person: number
    present_written: number
    present_remote: number
    present_total: number
    total_active_members: number
  }
  quorum: {
    has_quorum: boolean
    present_count: number
    required_count: number | null
    quorum_percentage: number | null
  }
  agenda: Array<{
    item_no: number
    title: string
    summary: string | null
    details: string | null
    resolution_id: string | null
    resolution: {
      id: string
      title: string
      status: string
      adopted_at: string | null
      adopted_by: string | null
      recommended_at: string | null
      recommended_by: string | null
    } | null
    vote: {
      id: string
      kind: string
      status: string
      opens_at: string
      closes_at: string | null
      closed_at: string | null
      tallies: {
        votes_for: number
        votes_against: number
        votes_abstain: number
        votes_total: number
      } | null
      live_tallies?: {
        votes_for: number
        votes_against: number
        votes_abstain: number
        votes_total: number
      } | null
      remote_tallies?: {
        votes_for: number
        votes_against: number
        votes_abstain: number
        votes_total: number
      } | null
    } | null
    attachments: Array<{
      id: string
      file_name: string
      storage_path: string
      mime_type: string | null
      size_bytes: number | null
    }>
  }>
  generated_at: string
}

// ==================================================
// PREVIEW
// ==================================================

/**
 * Preview meeting protocol (does not create record)
 */
export async function previewMeetingProtocol(meetingId: string): Promise<{
  success: boolean
  snapshot?: ProtocolSnapshot
  error?: string
}> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error }: any = await supabase.rpc('preview_meeting_protocol', {
    p_meeting_id: meetingId,
  })

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error previewing protocol:', error)
    return {
      success: false,
      error: error.message || 'Failed to preview protocol',
    }
  }

  const result = data?.[0]
  if (!result?.ok) {
    return {
      success: false,
      error: result?.reason || 'Failed to preview protocol',
    }
  }

  return {
    success: true,
    snapshot: result.snapshot as ProtocolSnapshot,
  }
}

// ==================================================
// FINALIZE
// ==================================================

/**
 * Finalize meeting protocol
 */
export async function finalizeMeetingProtocol(meetingId: string): Promise<{
  success: boolean
  protocolId?: string
  version?: number
  protocolNumber?: string
  snapshotHash?: string
  error?: string
}> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error }: any = await supabase.rpc('finalize_meeting_protocol', {
    p_meeting_id: meetingId,
  })

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error finalizing protocol:', error)
    return {
      success: false,
      error: error.message || 'Failed to finalize protocol',
    }
  }

  const result = data?.[0]
  if (!result?.ok) {
    // Translate error reasons to user-friendly messages
    let errorMessage = result?.reason || 'Failed to finalize protocol'
    
    if (result?.reason === 'ALREADY_FINALIZED') {
      errorMessage = 'Protokolas jau finalizuotas. Pakartotinis finalizavimas negalimas.'
    } else if (result?.reason === 'MEETING_ALREADY_COMPLETED') {
      errorMessage = 'Susirinkimas jau užbaigtas. Protokolas jau egzistuoja.'
    } else if (result?.reason?.startsWith('VOTE_NOT_CLOSED')) {
      errorMessage = 'Visi balsavimai turi būti uždaryti prieš finalizuojant protokolą.'
    } else if (result?.reason?.startsWith('VOTE_NOT_FOUND')) {
      errorMessage = 'Nerasta balsavimo darbotvarkės klausimui. Patikrinkite ar visi klausimai turi balsavimus.'
    }
    
    return {
      success: false,
      error: errorMessage,
    }
  }

  revalidatePath('/dashboard/[slug]/meetings', 'page')
  return {
    success: true,
    protocolId: result.protocol_id,
    version: result.version,
    protocolNumber: result.protocol_number,
    snapshotHash: result.snapshot_hash,
  }
}

// ==================================================
// GET PROTOCOL
// ==================================================

/**
 * Get meeting protocol by ID
 */
export async function getMeetingProtocol(protocolId: string): Promise<{
  success: boolean
  protocol?: MeetingProtocol
  snapshot?: ProtocolSnapshot
  error?: string
}> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error }: any = await supabase.rpc('get_meeting_protocol', {
    p_protocol_id: protocolId,
  })

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error fetching protocol:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch protocol',
    }
  }

  if (!data || data.error) {
    return {
      success: false,
      error: data?.error || 'Protocol not found',
    }
  }

  return {
    success: true,
    protocol: {
      id: data.id,
      org_id: data.org_id,
      meeting_id: data.meeting_id,
      protocol_number: data.protocol_number,
      version: data.version,
      status: data.status,
      snapshot: data.snapshot,
      snapshot_hash: data.snapshot_hash,
      pdf_bucket: data.pdf_bucket,
      pdf_path: data.pdf_path,
      created_by: data.created_by,
      created_at: data.created_at,
      finalized_by: data.finalized_by,
      finalized_at: data.finalized_at,
    },
    snapshot: data.snapshot as ProtocolSnapshot,
  }
}

/**
 * List protocols for a meeting
 */
export async function listMeetingProtocols(meetingId: string): Promise<MeetingProtocol[]> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error }: any = await supabase
    .from('meeting_protocols')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('version', { ascending: false })

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error fetching protocols:', error)
    operationFailed()
  }

  return (data || []).map((p: any) => ({
    id: p.id,
    org_id: p.org_id,
    meeting_id: p.meeting_id,
    protocol_number: p.protocol_number,
    version: p.version,
    status: p.status,
    snapshot: p.snapshot,
    snapshot_hash: p.snapshot_hash,
    pdf_bucket: p.pdf_bucket,
    pdf_path: p.pdf_path,
    created_by: p.created_by,
    created_at: p.created_at,
    finalized_by: p.finalized_by,
    finalized_at: p.finalized_at,
  }))
}

// ==================================================
// PDF GENERATION
// ==================================================

/**
 * Update protocol PDF path (after PDF generation)
 * Uses RPC set_protocol_pdf to update FINAL protocols (immutable otherwise)
 */
export async function updateProtocolPdf(
  protocolId: string,
  pdfPath: string,
  pdfBucket: string = 'protocols'
): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error }: any = await supabase.rpc('set_protocol_pdf', {
    p_protocol_id: protocolId,
    p_bucket: pdfBucket,
    p_path: pdfPath,
  })

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error updating protocol PDF:', error)
    return {
      success: false,
      error: error.message || 'Failed to update PDF path',
    }
  }

  const result = data?.[0]
  if (!result?.ok) {
    return {
      success: false,
      error: result?.reason || 'Failed to update PDF path',
    }
  }

  revalidatePath('/dashboard/[slug]/meetings', 'page')
  return {
    success: true,
  }
}

/**
 * Upload signed protocol PDF
 * Uploads PDF file to Supabase Storage and updates protocol PDF path
 * Uses RPC set_protocol_pdf to update FINAL protocols (immutable otherwise)
 */
export async function uploadProtocolPdf(
  protocolId: string,
  formData: FormData
): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const file = formData.get('file') as File | null
  if (!file) {
    return {
      success: false,
      error: 'No file provided',
    }
  }

  // Validate file type
  if (file.type !== 'application/pdf') {
    return {
      success: false,
      error: 'Only PDF files are allowed',
    }
  }

  // Validate file size (10MB max)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return {
      success: false,
      error: 'File size must be less than 10MB',
    }
  }

  // Get protocol to get org_id and meeting_id for path
  const { data: protocol, error: protocolError } = await supabase
    .from('meeting_protocols')
    .select('org_id, meeting_id, version, status')
    .eq('id', protocolId)
    .single()

  if (protocolError || !protocol) {
    return {
      success: false,
      error: 'Protocol not found',
    }
  }

  // Only allow FINAL protocols
  if (protocol.status !== 'FINAL') {
    return {
      success: false,
      error: 'Can only upload PDF for FINAL protocols',
    }
  }

  // Upload PDF to Storage
  // Note: Supabase storage.upload() accepts File, Blob, ArrayBuffer, Buffer, or Uint8Array
  const pdfPath = `org/${protocol.org_id}/meetings/${protocol.meeting_id}/protocols/${protocolId}_v${protocol.version}_signed.pdf`
  const bucket = 'protocols'

  // Convert File to Buffer for upload (Node.js Buffer is available in server actions)
  const arrayBuffer = await file.arrayBuffer()
  // Use Buffer.from() - it's available in Node.js runtime (server actions)
  const buffer = Buffer.from(arrayBuffer)

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(pdfPath, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadError) {
    console.error('Error uploading PDF:', uploadError)
    return {
      success: false,
      error: `Failed to upload PDF: ${uploadError.message || 'Unknown error'}`,
    }
  }

  // Update protocol PDF path via RPC
  const { data: rpcData, error: rpcError }: any = await supabase.rpc('set_protocol_pdf', {
    p_protocol_id: protocolId,
    p_bucket: bucket,
    p_path: pdfPath,
  })

  if (rpcError) {
    if (rpcError.code === '42501') {
      authViolation()
    }
    console.error('Error updating protocol PDF path:', rpcError)
    return {
      success: false,
      error: rpcError.message || 'Failed to update protocol PDF path',
    }
  }

  const result = rpcData?.[0]
  if (!result?.ok) {
    return {
      success: false,
      error: result?.reason || 'Failed to update protocol PDF path',
    }
  }

  revalidatePath('/dashboard/[slug]/meetings', 'page')
  return {
    success: true,
  }
}

/**
 * Get signed URL for protocol PDF download
 * Validates: member must belong to org and protocol must be FINAL
 */
export async function getProtocolPdfSignedUrl(protocolId: string): Promise<{
  success: boolean
  url?: string
  error?: string
}> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Get protocol with meeting info for org check
  const { data: protocol, error: protError }: any = await supabase
    .from('meeting_protocols')
    .select(`
      pdf_bucket,
      pdf_path,
      status,
      org_id,
      meeting_id,
      meetings!inner(org_id)
    `)
    .eq('id', protocolId)
    .single()

  if (protError) {
    if (protError.code === '42501') {
      authViolation()
    }
    console.error('Error fetching protocol:', protError)
    return {
      success: false,
      error: 'Protocol not found',
    }
  }

  if (!protocol.pdf_path) {
    return {
      success: false,
      error: 'PDF not generated yet',
    }
  }

  // Validate: protocol must be FINAL
  if (protocol.status !== 'FINAL') {
    return {
      success: false,
      error: 'Protocol is not finalized',
    }
  }

  // Validate: member must belong to org
  const orgId = protocol.org_id || protocol.meetings?.org_id
  if (!orgId) {
    return {
      success: false,
      error: 'Organization not found',
    }
  }

  const { data: membership, error: membershipError }: any = await supabase
    .from('memberships')
    .select('id')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .eq('member_status', 'ACTIVE')
    .maybeSingle()

  if (membershipError) {
    if (membershipError.code === '42501') {
      authViolation()
    }
    console.error('Error checking membership:', membershipError)
    return {
      success: false,
      error: 'Failed to verify membership',
    }
  }

  if (!membership) {
    return {
      success: false,
      error: 'You are not a member of this organization',
    }
  }

  // Generate signed URL (valid for 1 hour)
  const { data: signedUrl, error: urlError } = await supabase.storage
    .from(protocol.pdf_bucket || 'protocols')
    .createSignedUrl(protocol.pdf_path, 3600)

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

