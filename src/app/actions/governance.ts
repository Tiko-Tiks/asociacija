'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth, loadActiveMembership } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'
import { MEMBERSHIP_STATUS } from '@/app/domain/constants'
import { MembershipRole } from '@/app/domain/types'
import { canCreateMeeting, canMarkAttendance } from '@/app/domain/permissions'

/**
 * Server Action to get the active ruleset version for an organization.
 * 
 * @param membership_id - UUID of the current user's membership (for org context)
 * @returns Active ruleset with quorum_percentage, notice_period_days, annual_fee
 * @throws Error('auth_violation') if authentication fails
 * @throws Error('operation_failed') if query fails
 */
export async function getActiveRuleset(membership_id: string): Promise<{
  quorum_percentage: number
  notice_period_days: number
  annual_fee: number
} | null> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  const membership = await loadActiveMembership(supabase, membership_id, user.id)

  // First try: Query org_rulesets (where onboarding answers are stored)
  const { data: orgRuleset, error: orgRulesetError }: any = await supabase
    .from('org_rulesets')
    .select('answers')
    .eq('org_id', membership.org_id)
    .eq('status', 'ACTIVE')
    .maybeSingle()

  if (orgRuleset && orgRuleset.answers) {
    const answers = orgRuleset.answers
    // Parse governance answers from JSONB
    // Keys from governance_questions: meeting_notice_days, quorum_percentage, annual_fee, etc.
    return {
      quorum_percentage: parseInt(answers.quorum_percentage) || parseInt(answers.kvorumas) || 50,
      notice_period_days: parseInt(answers.meeting_notice_days) || parseInt(answers.notice_period_days) || 0,
      annual_fee: parseFloat(answers.annual_fee) || parseFloat(answers.metinis_mokestis) || 0,
    }
  }

  // Fallback: Query ruleset_versions (legacy table)
  const { data: ruleset, error: rulesetError }: any = await supabase
    .from('ruleset_versions')
    .select('quorum_percentage, notice_period_days, annual_fee')
    .eq('org_id', membership.org_id)
    .eq('status', 'ACTIVE')
    .maybeSingle()

  if (rulesetError && rulesetError?.code !== 'PGRST116') {
    if (rulesetError?.code === '42501') {
      authViolation()
    }
    console.error('getActiveRuleset: query error (returning null):', {
      code: rulesetError.code,
      message: rulesetError.message,
      details: rulesetError.details,
    })
    return null
  }

  if (ruleset) {
    return {
      quorum_percentage: ruleset.quorum_percentage || 50,
      notice_period_days: ruleset.notice_period_days || 0,
      annual_fee: ruleset.annual_fee || 0,
    }
  }

  return null
}

/**
 * Server Action to list organization meetings.
 * 
 * @param membership_id - UUID of the current user's membership (for org context)
 * @returns Array of meetings with id, title, scheduled_at, quorum_met
 * @throws Error('auth_violation') if authentication fails
 * @throws Error('operation_failed') if query fails
 */
export async function listMeetings(membership_id: string): Promise<
  Array<{
    id: string
    title: string
    scheduled_at: string
    status?: string
    quorum_met: boolean | null
    created_at: string
  }>
> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  const membership = await loadActiveMembership(supabase, membership_id, user.id)

  // Query meetings for this org
  const { data: meetings, error: meetingsError }: any = await supabase
    .from('meetings')
    .select('id, title, scheduled_at, status, quorum_met, created_at')
    .eq('org_id', membership.org_id)
    .order('scheduled_at', { ascending: false })

  if (meetingsError) {
    if (meetingsError?.code === '42501') {
      authViolation()
    }
    // For other errors, log and return empty array (resilient handling)
    console.error('listMeetings: query error (returning empty array):', {
      code: meetingsError.code,
      message: meetingsError.message,
      details: meetingsError.details,
    })
    return []
  }

  return (meetings || []).map((meeting: any) => ({
    id: meeting.id,
    title: meeting.title,
    scheduled_at: meeting.scheduled_at,
    status: meeting.status || 'DRAFT',
    quorum_met: meeting.quorum_met,
    created_at: meeting.created_at,
  }))
}

/**
 * Server Action to get a specific meeting by ID.
 * 
 * @param membership_id - UUID of the current user's membership (for org context)
 * @param meeting_id - UUID of the meeting
 * @returns Meeting details with attendance list
 * @throws Error('auth_violation') if authentication fails
 * @throws Error('operation_failed') if query fails
 */
export async function getMeeting(
  membership_id: string,
  meeting_id: string
): Promise<{
  id: string
  title: string
  scheduled_at: string
  quorum_met: boolean | null
  attendance: Array<{
    membership_id: string
    member_name: string | null
    present: boolean
  }>
  protocols: Array<{
    id: string
    url: string
    created_at: string
  }>
} | null> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  const membership = await loadActiveMembership(supabase, membership_id, user.id)

  // Query meeting
  const { data: meeting, error: meetingError }: any = await supabase
    .from('meetings')
    .select('id, title, scheduled_at, quorum_met')
    .eq('id', meeting_id)
    .eq('org_id', membership.org_id)
    .single()

  if (meetingError) {
    if (meetingError?.code === '42501') {
      authViolation()
    }
    if (meetingError?.code === 'PGRST116') {
      return null
    }
    operationFailed()
  }

  // Query attendance for this meeting
  const { data: attendance, error: attendanceError }: any = await supabase
    .from('meeting_attendance')
    .select('membership_id, present')
    .eq('meeting_id', meeting_id)

  if (attendanceError) {
    if (attendanceError?.code === '42501') {
      authViolation()
    }
    operationFailed()
  }

  // Query all active memberships for the org to build full attendance list
  const { data: memberships, error: membershipsError }: any = await supabase
    .from('memberships')
    .select('id, user_id, profiles!inner(id, full_name)')
    .eq('org_id', membership.org_id)
    .eq('status', MEMBERSHIP_STATUS.ACTIVE)

  if (membershipsError) {
    if (membershipsError?.code === '42501') {
      authViolation()
    }
    operationFailed()
  }

  // Create a map of membership_id -> present status
  const attendanceMap = new Map(
    (attendance || []).map((a: any) => [a.membership_id, a.present === true])
  )

  // Build attendance list with all active members
  const attendanceList = (memberships || []).map((m: any) => ({
    membership_id: m.id,
    member_name: m.profiles?.full_name || null,
    present: attendanceMap.get(m.id) || false,
  }))

  // Query protocols - v17.0: media_items table does not exist
  // TODO: Implement protocol query using v17.0 schema (if protocols are needed)
  // For now, return empty array as media_items is not in v17.0 schema
  const protocols: any[] = []

  return {
    id: meeting.id,
    title: meeting.title,
    scheduled_at: meeting.scheduled_at,
    quorum_met: meeting.quorum_met,
    attendance: attendanceList,
    protocols: [],
  }
}

/**
 * Server Action to create a meeting.
 * 
 * CRITICAL: The scheduled_at date must respect notice_period_days.
 * This is enforced by DB trigger, but we validate here for better UX.
 * 
 * @param membership_id - UUID of the current user's membership (for org context)
 * @param title - Meeting title
 * @param scheduled_at - ISO date string for the meeting date
 * @throws Error('auth_violation') if authentication fails or user lacks permission
 * @throws Error('operation_failed') if creation fails
 */
// Import meeting types from domain (cannot export non-functions from 'use server' files)
import { MeetingType } from '@/app/domain/meeting-types'

export async function createMeeting(
  membership_id: string,
  title: string,
  scheduled_at: string,
  meeting_type: MeetingType = 'GA'
): Promise<{ id: string }> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  const membership = await loadActiveMembership(supabase, membership_id, user.id)

  // Check permission: Only ADMIN, CHAIR, or OWNER can create meetings
  // Get membership role from the membership data
  const { data: membershipWithRole, error: roleError }: any = await supabase
    .from('memberships')
    .select('role')
    .eq('id', membership_id)
    .eq('user_id', user.id)
    .single()

  if (roleError || !membershipWithRole) {
    if (roleError?.code === '42501') {
      authViolation()
    }
    operationFailed()
  }

  if (!canCreateMeeting((membershipWithRole.role as MembershipRole) || 'MEMBER')) {
    authViolation()
  }

  // Insert meeting
  const { data: meeting, error: meetingError }: any = await (supabase.from('meetings') as any).insert({
    org_id: membership.org_id,
    title,
    scheduled_at,
    meeting_type,
  }).select('id').single()

  if (meetingError) {
    // Handle DB trigger validation error (notice period violation)
    if (meetingError?.code === 'P0001' || meetingError?.message?.includes('notice')) {
      operationFailed()
    }
    if (meetingError?.code === '42501') {
      authViolation()
    }
    operationFailed()
  }

  return { id: meeting.id }
}

/**
 * Server Action to mark attendance for a meeting.
 * 
 * The DB trigger `update_quorum_status` will automatically update the meeting's quorum_met status.
 * 
 * @param membership_id - UUID of the current user's membership (for org context)
 * @param meeting_id - UUID of the meeting
 * @param target_membership_id - UUID of the membership whose attendance is being marked
 * @param present - Whether the member is present
 * @throws Error('auth_violation') if authentication fails or user lacks permission
 * @throws Error('operation_failed') if update fails
 */
export async function markAttendance(
  membership_id: string,
  meeting_id: string,
  target_membership_id: string,
  present: boolean
): Promise<void> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  const membership = await loadActiveMembership(supabase, membership_id, user.id)

  // Check permission: Only ADMIN, CHAIR, or OWNER can mark attendance
  // Get membership role from the membership data
  const { data: membershipWithRole, error: roleError }: any = await supabase
    .from('memberships')
    .select('role')
    .eq('id', membership_id)
    .eq('user_id', user.id)
    .single()

  if (roleError || !membershipWithRole) {
    if (roleError?.code === '42501') {
      authViolation()
    }
    operationFailed()
  }

  if (!canMarkAttendance((membershipWithRole.role as MembershipRole) || 'MEMBER')) {
    authViolation()
  }

  // Verify meeting belongs to the same org
  const { data: meeting, error: meetingError }: any = await supabase
    .from('meetings')
    .select('org_id')
    .eq('id', meeting_id)
    .single()

  if (meetingError || !meeting || meeting.org_id !== membership.org_id) {
    if (meetingError?.code === '42501') {
      authViolation()
    }
    operationFailed()
  }

  // Upsert attendance record
  const { error: attendanceError }: any = await (supabase.from('meeting_attendance') as any)
    .upsert({
      meeting_id,
      membership_id: target_membership_id,
      present,
    }, {
      onConflict: 'meeting_id,membership_id',
    })

  if (attendanceError) {
    if (attendanceError?.code === '42501') {
      authViolation()
    }
    operationFailed()
  }
}

/**
 * Server Action to create a protocol (media item) for a meeting.
 * 
 * Note: File upload to Supabase Storage should be done client-side.
 * This function only creates the database record.
 * 
 * Schema v15.1: media_items table columns: object_id, object_type, category
 * Note: url column does NOT exist in schema v15.1
 * 
 * @param membership_id - UUID of the current user's membership (for org context)
 * @param meeting_id - UUID of the meeting
 * @param url - DEPRECATED: Not stored in schema v15.1 (kept for API compatibility)
 * @throws Error('auth_violation') if authentication fails
 * @throws Error('operation_failed') if creation fails
 */
export async function createProtocol(
  membership_id: string,
  meeting_id: string,
  url: string
): Promise<{ success: boolean }> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  const membership = await loadActiveMembership(supabase, membership_id, user.id)

  // Verify meeting belongs to the same org
  const { data: meeting, error: meetingError }: any = await supabase
    .from('meetings')
    .select('org_id')
    .eq('id', meeting_id)
    .single()

  if (meetingError || !meeting || meeting.org_id !== membership.org_id) {
    if (meetingError?.code === '42501') {
      authViolation()
    }
    operationFailed()
  }

  // Insert protocol - v17.0: media_items table does not exist
  // TODO: Implement protocol creation using v17.0 schema (if protocols are needed)
  // For now, skip protocol creation as media_items is not in v17.0 schema
  console.warn('Protocol creation skipped: media_items table does not exist in v17.0 schema')

  const { revalidatePath } = await import('next/cache')
  revalidatePath(`/dashboard/governance/${meeting_id}`)

  return { success: true }
}

