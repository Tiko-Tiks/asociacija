'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'
import { revalidatePath } from 'next/cache'

// ==================================================
// TYPES
// ==================================================

export interface MeetingAttendanceMember {
  membership_id: string
  user_id: string
  full_name: string | null
  present: boolean
  mode: 'IN_PERSON' | 'WRITTEN' | 'REMOTE'
  joined_at: string | null
  voted_remotely: boolean
}

export interface CanRegisterInPersonResult {
  allowed: boolean
  reason: string
  details?: {
    membership_id?: string
    message?: string
  }
}

export interface RegisterAttendanceResult {
  ok: boolean
  reason: string
}

export interface MeetingUniqueParticipants {
  remote_participants: number
  live_participants: number
  total_participants: number
}

// ==================================================
// SERVER ACTIONS
// ==================================================

/**
 * Check if a member can register as IN_PERSON for a meeting
 */
export async function canRegisterInPerson(
  meetingId: string,
  userId: string
): Promise<CanRegisterInPersonResult> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase.rpc('can_register_in_person', {
    p_meeting_id: meetingId,
    p_user_id: userId,
  })

  if (error) {
    console.error('Error checking registration eligibility:', error)
    return {
      allowed: false,
      reason: 'OPERATION_FAILED',
    }
  }

  const result = data?.[0]
  if (!result) {
    return {
      allowed: false,
      reason: 'OPERATION_FAILED',
    }
  }

  return {
    allowed: result.allowed,
    reason: result.reason,
    details: result.details || {},
  }
}

/**
 * Register a member as IN_PERSON for a meeting
 * Requires OWNER/BOARD role
 */
export async function registerInPersonAttendance(
  meetingId: string,
  membershipId: string
): Promise<RegisterAttendanceResult> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase.rpc('register_in_person_attendance', {
    p_meeting_id: meetingId,
    p_membership_id: membershipId,
  })

  if (error) {
    console.error('Error registering attendance:', error)
    if (error.code === '42501') {
      authViolation()
    }
    return {
      ok: false,
      reason: 'OPERATION_FAILED',
    }
  }

  const result = data?.[0]
  if (!result) {
    return {
      ok: false,
      reason: 'OPERATION_FAILED',
    }
  }

  revalidatePath('/dashboard', 'layout')
  return {
    ok: result.ok,
    reason: result.reason,
  }
}

/**
 * Unregister a member from IN_PERSON attendance
 * Requires OWNER/BOARD role
 */
export async function unregisterInPersonAttendance(
  meetingId: string,
  membershipId: string
): Promise<RegisterAttendanceResult> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase.rpc('unregister_in_person_attendance', {
    p_meeting_id: meetingId,
    p_membership_id: membershipId,
  })

  if (error) {
    console.error('Error unregistering attendance:', error)
    if (error.code === '42501') {
      authViolation()
    }
    return {
      ok: false,
      reason: 'OPERATION_FAILED',
    }
  }

  const result = data?.[0]
  if (!result) {
    return {
      ok: false,
      reason: 'OPERATION_FAILED',
    }
  }

  revalidatePath('/dashboard', 'layout')
  return {
    ok: result.ok,
    reason: result.reason,
  }
}

/**
 * Get attendance list for a meeting
 */
export async function getMeetingAttendance(
  meetingId: string
): Promise<MeetingAttendanceMember[]> {
  const supabase = await createClient()
  await requireAuth(supabase)

  // Get meeting to verify org access
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select('org_id')
    .eq('id', meetingId)
    .single()

  if (meetingError || !meeting) {
    console.error('Error fetching meeting:', meetingError)
    if (meetingError?.code === '42501') {
      authViolation()
    }
    operationFailed()
  }

  // Get all memberships for this org
  const { data: memberships, error: membershipsError } = await supabase
    .from('memberships')
    .select('id, user_id, status')
    .eq('org_id', meeting.org_id)
    .eq('status', 'ACTIVE')

  if (membershipsError) {
    console.error('Error fetching memberships:', membershipsError)
    if (membershipsError.code === '42501') {
      authViolation()
    }
    operationFailed()
  }

  if (!memberships || memberships.length === 0) {
    return []
  }

  // Get profiles for all user_ids
  const userIds = memberships.map((m) => m.user_id)
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds)

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError)
    if (profilesError.code === '42501') {
      authViolation()
    }
    operationFailed()
  }

  const profilesMap = new Map((profiles || []).map((p) => [p.id, p.full_name]))

  // Get attendance records
  const { data: attendance, error: attendanceError } = await supabase
    .from('meeting_attendance')
    .select('membership_id, present, mode, joined_at')
    .eq('meeting_id', meetingId)

  if (attendanceError) {
    console.error('Error fetching attendance:', attendanceError)
    if (attendanceError.code === '42501') {
      authViolation()
    }
    operationFailed()
  }

  const attendanceMap = new Map(
    (attendance || []).map((a) => [
      a.membership_id,
      {
        present: a.present,
        mode: a.mode,
        joined_at: a.joined_at,
      },
    ])
  )

  // Get remote voters
  const { data: remoteVoters, error: remoteError } = await supabase
    .from('meeting_remote_voters')
    .select('membership_id')
    .eq('meeting_id', meetingId)

  if (remoteError) {
    console.error('Error fetching remote voters:', remoteError)
    // Don't fail, just continue without remote voters info
  }

  const remoteVotersSet = new Set((remoteVoters || []).map((rv) => rv.membership_id))

  // Combine data
  return memberships.map((membership) => {
    const attendanceData = attendanceMap.get(membership.id)
    const votedRemotely = remoteVotersSet.has(membership.id)

    return {
      membership_id: membership.id,
      user_id: membership.user_id,
      full_name: profilesMap.get(membership.user_id) || null,
      present: attendanceData?.present || false,
      mode: attendanceData?.mode || ('IN_PERSON' as const),
      joined_at: attendanceData?.joined_at || null,
      voted_remotely: votedRemotely,
    }
  })
}

/**
 * Get unique participant counts for a meeting
 */
export async function getMeetingUniqueParticipants(
  meetingId: string
): Promise<MeetingUniqueParticipants> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase.rpc('get_meeting_unique_participants', {
    p_meeting_id: meetingId,
  })

  if (error) {
    console.error('Error fetching unique participants:', error)
    if (error.code === '42501') {
      authViolation()
    }
    return {
      remote_participants: 0,
      live_participants: 0,
      total_participants: 0,
    }
  }

  const result = data?.[0]
  if (!result) {
    return {
      remote_participants: 0,
      live_participants: 0,
      total_participants: 0,
    }
  }

  return {
    remote_participants: result.remote_participants || 0,
    live_participants: result.live_participants || 0,
    total_participants: result.total_participants || 0,
  }
}

