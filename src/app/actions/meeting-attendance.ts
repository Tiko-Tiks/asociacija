'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'

/**
 * Register remote attendance for a meeting
 * This marks the member as participating remotely (will vote via web)
 */
export async function registerRemoteAttendance(
  meetingId: string
): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Get meeting and membership
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select('org_id')
    .eq('id', meetingId)
    .single()

  if (meetingError || !meeting) {
    return {
      success: false,
      error: 'Susirinkimas nerastas',
    }
  }

  // Get active membership
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select('id')
    .eq('user_id', user.id)
    .eq('org_id', meeting.org_id)
    .eq('status', 'ACTIVE')
    .single()

  if (membershipError || !membership) {
    if (membershipError?.code === '42501') {
      authViolation()
    }
    return {
      success: false,
      error: 'Narystė nerasta',
    }
  }

  // Check if already registered (either remote or in-person)
  const { data: existingAttendance } = await supabase
    .from('meeting_attendance')
    .select('id, attendance_type')
    .eq('meeting_id', meetingId)
    .eq('membership_id', membership.id)
    .maybeSingle()

  if (existingAttendance) {
    // Already registered
    return {
      success: true, // Already registered, consider it success
    }
  }

  // Register remote attendance
  // Note: Remote attendance is registered when first vote is cast
  // This function just confirms intent to vote remotely
  // Actual registration happens in cast_vote RPC when channel='web' or 'REMOTE'

  return {
    success: true,
  }
}

/**
 * Check if member has registered remote attendance intent
 */
export async function hasRemoteAttendanceIntent(
  meetingId: string
): Promise<boolean> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Get meeting and membership
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select('org_id')
    .eq('id', meetingId)
    .single()

  if (meetingError || !meeting) {
    return false
  }

  // Get active membership
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select('id')
    .eq('user_id', user.id)
    .eq('org_id', meeting.org_id)
    .eq('status', 'ACTIVE')
    .single()

  if (membershipError || !membership) {
    return false
  }

  // Check if has voted remotely (which registers attendance)
  const { data: remoteVote } = await supabase
    .from('vote_ballots')
    .select('id')
    .eq('membership_id', membership.id)
    .in('channel', ['web', 'REMOTE', 'WRITTEN'])
    .limit(1)

  // Also check meeting_remote_voters view
  const { data: remoteVoter } = await supabase
    .from('meeting_remote_voters')
    .select('membership_id')
    .eq('meeting_id', meetingId)
    .eq('membership_id', membership.id)
    .maybeSingle()

  return remoteVote !== null || remoteVoter !== null
}

// ==================================================
// IN-PERSON ATTENDANCE (FOR CHECK-IN LIST)
// ==================================================

export interface AttendanceRecord {
  membership_id: string
  member_name: string
  member_email: string
  attendance_type: 'IN_PERSON' | 'REMOTE' | null
  checked_in_at: string | null
}

// Alias for backward compatibility
export type MeetingAttendanceMember = AttendanceRecord

/**
 * Get meeting attendance list
 */
export async function getMeetingAttendance(
  meetingId: string
): Promise<AttendanceRecord[]> {
  const supabase = await createClient()
  await requireAuth(supabase)

  console.log('[getMeetingAttendance] Meeting ID:', meetingId)

  // Get meeting org_id
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select('org_id')
    .eq('id', meetingId)
    .single()

  if (meetingError || !meeting) {
    console.error('[getMeetingAttendance] Meeting not found:', meetingError)
    return []
  }

  console.log('[getMeetingAttendance] Meeting org_id:', meeting.org_id)

  // Get all active members of the org
  const { data: memberships, error: membersError } = await supabase
    .from('memberships')
    .select('id, user_id')
    .eq('org_id', meeting.org_id)
    .eq('member_status', 'ACTIVE')

  console.log('[getMeetingAttendance] Memberships query result:', {
    count: memberships?.length || 0,
    error: membersError,
  })

  if (membersError) {
    console.error('[getMeetingAttendance] Error fetching memberships:', membersError)
    return []
  }

  if (!memberships || memberships.length === 0) {
    console.log('[getMeetingAttendance] No active members found')
    return []
  }

  // Get profiles for these users
  // PRIVACY: Only select 'id, full_name' per .cursorrules rule 10
  // email/phone/metadata are forbidden in public/shared contexts
  const userIds = memberships.map((m: any) => m.user_id)
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds)

  console.log('[getMeetingAttendance] Profiles query result:', {
    count: profiles?.length || 0,
    error: profilesError,
    profiles: profiles,
  })

  if (profilesError) {
    console.error('[getMeetingAttendance] Error fetching profiles:', profilesError)
  }

  const profilesMap = new Map(
    (profiles || []).map((p: any) => [p.id, p])
  )

  // Get attendance records for this meeting (in-person)
  const { data: attendance, error: attendanceError } = await supabase
    .from('meeting_attendance')
    .select('membership_id, mode, joined_at, present')
    .eq('meeting_id', meetingId)

  if (attendanceError) {
    console.error('[getMeetingAttendance] Error fetching attendance:', attendanceError)
  } else {
    console.log('[getMeetingAttendance] Attendance records:', attendance)
  }

  // Get remote voters from view
  const { data: remoteVoters, error: remoteError } = await supabase
    .from('meeting_remote_voters')
    .select('membership_id')
    .eq('meeting_id', meetingId)

  if (remoteError) {
    console.error('Error fetching remote voters:', remoteError)
  }

  const attendanceMap = new Map(
    (attendance || []).map((a: any) => [a.membership_id, a])
  )
  
  const remoteVotersSet = new Set(
    (remoteVoters || []).map((rv: any) => rv.membership_id)
  )

  const result = (memberships || []).map((m: any) => {
    const att = attendanceMap.get(m.id)
    const isRemoteVoter = remoteVotersSet.has(m.id)
    const profile = profilesMap.get(m.user_id)
    
    // Determine attendance type
    let attendanceType: 'IN_PERSON' | 'REMOTE' | null = null
    if (att?.mode) {
      attendanceType = att.mode
    } else if (isRemoteVoter) {
      attendanceType = 'REMOTE'
    }
    
    console.log('[getMeetingAttendance] Mapping member:', {
      membership_id: m.id,
      user_id: m.user_id,
      has_profile: !!profile,
      profile_name: profile?.full_name,
      is_remote_voter: isRemoteVoter,
      attendance_type: attendanceType,
    })
    
    return {
      membership_id: m.id,
      member_name: profile?.full_name || 'Nenurodytas vardas',
      // PRIVACY: email removed per .cursorrules rule 10
      // email/phone/metadata are forbidden in public/shared contexts
      member_email: null,
      attendance_type: attendanceType,
      checked_in_at: att?.joined_at || null,
    }
  })
  
  console.log('[getMeetingAttendance] Returning', result.length, 'members')
  return result
}

/**
 * Register in-person attendance
 */
export async function registerInPersonAttendance(
  meetingId: string,
  membershipId: string
): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()
  await requireAuth(supabase)

  // Check if already has remote votes (cannot switch)
  const { data: remoteVoter } = await supabase
    .from('meeting_remote_voters')
    .select('membership_id')
    .eq('meeting_id', meetingId)
    .eq('membership_id', membershipId)
    .maybeSingle()

  if (remoteVoter) {
    return {
      success: false,
      error: 'Narys jau balsavo nuotoliu, negali registruotis gyvu būdu',
    }
  }

  // Upsert attendance record
  const { error } = await supabase
    .from('meeting_attendance')
    .upsert({
      meeting_id: meetingId,
      membership_id: membershipId,
      mode: 'IN_PERSON',
      present: true,
      joined_at: new Date().toISOString(),
    }, {
      onConflict: 'meeting_id,membership_id',
    })

  if (error) {
    console.error('Error registering in-person attendance:', error)
    return {
      success: false,
      error: error.message,
    }
  }

  return { success: true }
}

/**
 * Unregister in-person attendance
 */
export async function unregisterInPersonAttendance(
  meetingId: string,
  membershipId: string
): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { error } = await supabase
    .from('meeting_attendance')
    .delete()
    .eq('meeting_id', meetingId)
    .eq('membership_id', membershipId)
    .eq('mode', 'IN_PERSON')

  if (error) {
    console.error('Error unregistering attendance:', error)
    return {
      success: false,
      error: error.message,
    }
  }

  return { success: true }
}
