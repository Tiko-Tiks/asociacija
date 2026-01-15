'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { 
  BOARD_POSITIONS, 
  type BoardPositionType,
  mapLegacyPositionTitle,
  getPositionLabel 
} from '@/app/domain/board-positions'

export interface BoardMember {
  id: string
  user_id: string
  membership_id: string
  position_type: BoardPositionType | string
  position_label: string
  full_name: string
  email: string
  start_date: string
  end_date: string | null
  is_active: boolean
  can_vote: boolean
}

export interface BoardComposition {
  total_members: number
  active_members: number
  voting_members: number
  members: BoardMember[]
}

/**
 * Get board composition for an organization
 */
export async function getBoardComposition(orgId: string): Promise<{
  success: boolean
  data?: BoardComposition
  error?: string
}> {
  const supabase = await createClient()
  await requireAuth(supabase)

  try {
    // Get all positions with user details
    const { data: positions, error: positionsError } = await supabase
      .from('positions')
      .select(`
        id,
        user_id,
        title,
        start_date,
        end_date,
        is_active,
        user:profiles!inner(
          full_name,
          email
        ),
        membership:memberships!inner(
          id
        )
      `)
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('title')

    if (positionsError) {
      console.error('Error fetching board positions:', positionsError)
      return {
        success: false,
        error: 'Nepavyko gauti valdybos narių sąrašo',
      }
    }

    // Map positions to board members
    const members: BoardMember[] = (positions || []).map((pos: any) => {
      // Try to map legacy title to standardized type
      const mappedType = mapLegacyPositionTitle(pos.title)
      const positionType = mappedType || pos.title
      const positionConfig = BOARD_POSITIONS[positionType as BoardPositionType]
      
      return {
        id: pos.id,
        user_id: pos.user_id,
        membership_id: pos.membership?.id,
        position_type: positionType,
        position_label: positionConfig?.label || pos.title,
        full_name: pos.user?.full_name || pos.user?.email || 'Nežinomas',
        email: pos.user?.email || '',
        start_date: pos.start_date,
        end_date: pos.end_date,
        is_active: pos.is_active,
        can_vote: positionConfig?.canVote ?? true,
      }
    })

    // Sort by position order
    members.sort((a, b) => {
      const orderA = BOARD_POSITIONS[a.position_type as BoardPositionType]?.order ?? 99
      const orderB = BOARD_POSITIONS[b.position_type as BoardPositionType]?.order ?? 99
      return orderA - orderB
    })

    const votingMembers = members.filter(m => m.can_vote)

    return {
      success: true,
      data: {
        total_members: members.length,
        active_members: members.filter(m => m.is_active).length,
        voting_members: votingMembers.length,
        members,
      },
    }
  } catch (error) {
    console.error('Error in getBoardComposition:', error)
    return {
      success: false,
      error: 'Įvyko klaida gaunant valdybos sudėtį',
    }
  }
}

/**
 * Get board members for a specific meeting (for BOARD type meetings)
 */
export async function getBoardMembersForMeeting(meetingId: string): Promise<{
  success: boolean
  data?: {
    members: BoardMember[]
    quorum_required: number
    quorum_present: number
    has_quorum: boolean
  }
  error?: string
}> {
  const supabase = await createClient()
  await requireAuth(supabase)

  try {
    // Get meeting and org info
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('id, org_id, meeting_type')
      .eq('id', meetingId)
      .single()

    if (meetingError || !meeting) {
      return {
        success: false,
        error: 'Susirinkimas nerastas',
      }
    }

    // Get board composition
    const compositionResult = await getBoardComposition(meeting.org_id)
    if (!compositionResult.success || !compositionResult.data) {
      return {
        success: false,
        error: compositionResult.error || 'Nepavyko gauti valdybos sudėties',
      }
    }

    const { members, voting_members } = compositionResult.data

    // Get attendance for this meeting (only board members)
    const boardMembershipIds = members.map(m => m.membership_id).filter(Boolean)
    
    const { data: attendance, error: attendanceError } = await supabase
      .from('meeting_attendance')
      .select('membership_id, present')
      .eq('meeting_id', meetingId)
      .eq('present', true)
      .in('membership_id', boardMembershipIds)

    if (attendanceError) {
      console.error('Error fetching board attendance:', attendanceError)
    }

    const presentMembershipIds = new Set((attendance || []).map(a => a.membership_id))
    const presentVotingMembers = members.filter(
      m => m.can_vote && presentMembershipIds.has(m.membership_id)
    ).length

    // Calculate quorum (>50% of voting members)
    const quorumRequired = Math.floor(voting_members / 2) + 1
    const hasQuorum = presentVotingMembers >= quorumRequired

    return {
      success: true,
      data: {
        members,
        quorum_required: quorumRequired,
        quorum_present: presentVotingMembers,
        has_quorum: hasQuorum,
      },
    }
  } catch (error) {
    console.error('Error in getBoardMembersForMeeting:', error)
    return {
      success: false,
      error: 'Įvyko klaida',
    }
  }
}

/**
 * Assign a board position to a member
 */
export async function assignBoardPosition(
  orgId: string,
  userId: string,
  positionType: BoardPositionType,
  startDate: string,
  endDate?: string
): Promise<{
  success: boolean
  positionId?: string
  error?: string
}> {
  const supabase = await createClient()
  await requireAuth(supabase)

  try {
    // Validate position type
    if (!(positionType in BOARD_POSITIONS)) {
      return {
        success: false,
        error: 'Netinkamas pozicijos tipas',
      }
    }

    // Check if user already has this position
    const { data: existing } = await supabase
      .from('positions')
      .select('id')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .eq('title', positionType)
      .eq('is_active', true)
      .single()

    if (existing) {
      return {
        success: false,
        error: 'Vartotojas jau turi šią poziciją',
      }
    }

    // Insert new position
    const { data: position, error: insertError } = await supabase
      .from('positions')
      .insert({
        org_id: orgId,
        user_id: userId,
        title: positionType, // Store standardized type, not label
        start_date: startDate,
        end_date: endDate || null,
        is_active: true,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Error inserting position:', insertError)
      return {
        success: false,
        error: 'Nepavyko priskirti pozicijos',
      }
    }

    return {
      success: true,
      positionId: position.id,
    }
  } catch (error) {
    console.error('Error in assignBoardPosition:', error)
    return {
      success: false,
      error: 'Įvyko klaida',
    }
  }
}

/**
 * Remove a board position
 */
export async function removeBoardPosition(positionId: string): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()
  await requireAuth(supabase)

  try {
    // Soft-delete by setting end_date and is_active = false
    const { error: updateError } = await supabase
      .from('positions')
      .update({
        end_date: new Date().toISOString().split('T')[0],
        is_active: false,
      })
      .eq('id', positionId)

    if (updateError) {
      console.error('Error removing position:', updateError)
      return {
        success: false,
        error: 'Nepavyko pašalinti pozicijos',
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in removeBoardPosition:', error)
    return {
      success: false,
      error: 'Įvyko klaida',
    }
  }
}

/**
 * Check if board members have been assigned for an org
 */
export async function checkBoardMembersAssigned(orgId: string): Promise<{
  success: boolean
  assigned: boolean
  count: number
  error?: string
}> {
  const supabase = await createClient()
  await requireAuth(supabase)

  try {
    // Check board_member_assignments table
    const { data: assignments, error: assignmentsError } = await supabase
      .from('board_member_assignments')
      .select('id')
      .eq('org_id', orgId)
      .eq('is_active', true)

    if (assignmentsError) {
      // Table might not exist yet - check positions table as fallback
      const { data: positions, error: positionsError } = await supabase
        .from('positions')
        .select('id')
        .eq('org_id', orgId)
        .eq('is_active', true)
        .ilike('title', '%BOARD%')

      if (positionsError) {
        console.error('Error checking board members:', positionsError)
        return {
          success: false,
          assigned: false,
          count: 0,
          error: 'Nepavyko patikrinti valdybos narių',
        }
      }

      return {
        success: true,
        assigned: (positions?.length || 0) > 0,
        count: positions?.length || 0,
      }
    }

    return {
      success: true,
      assigned: (assignments?.length || 0) > 0,
      count: assignments?.length || 0,
    }
  } catch (error) {
    console.error('Error in checkBoardMembersAssigned:', error)
    return {
      success: false,
      assigned: false,
      count: 0,
      error: 'Įvyko klaida',
    }
  }
}

/**
 * Assign board members during onboarding
 * This function:
 * 1. Creates board_member_assignments records
 * 2. Creates positions records
 * 3. Sends notification emails
 */
export async function assignBoardMembersOnboarding(
  orgId: string,
  membershipIds: string[],
  termStart: string,
  termEnd: string
): Promise<{
  success: boolean
  assignedCount: number
  error?: string
}> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  try {
    // Verify user is OWNER of this org
    const { data: ownerCheck, error: ownerError } = await supabase
      .from('memberships')
      .select('id, role')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .eq('role', 'OWNER')
      .eq('status', 'ACTIVE')
      .single()

    if (ownerError || !ownerCheck) {
      return {
        success: false,
        assignedCount: 0,
        error: 'Tik pirmininkas gali priskirti valdybos narius',
      }
    }

    // Get membership details for all selected members
    const { data: memberships, error: membershipsError } = await supabase
      .from('memberships')
      .select(`
        id,
        user_id,
        profile:profiles!inner(full_name, email)
      `)
      .in('id', membershipIds)
      .eq('org_id', orgId)

    if (membershipsError || !memberships) {
      console.error('Error fetching memberships:', membershipsError)
      return {
        success: false,
        assignedCount: 0,
        error: 'Nepavyko gauti narių duomenų',
      }
    }

    // Get org name for email
    const { data: org } = await supabase
      .from('orgs')
      .select('name')
      .eq('id', orgId)
      .single()

    const orgName = org?.name || 'Bendruomenė'

    let assignedCount = 0
    const emailsToSend: Array<{ email: string; fullName: string }> = []

    // Process each membership
    for (const membership of memberships) {
      const profile = membership.profile as any

      // Create board_member_assignment record
      const { error: assignmentError } = await supabase
        .from('board_member_assignments')
        .insert({
          org_id: orgId,
          membership_id: membership.id,
          position_type: 'BOARD_MEMBER',
          term_start: termStart,
          term_end: termEnd,
          assigned_by: user.id,
          is_active: true,
        })

      if (assignmentError) {
        console.error('Error creating assignment:', assignmentError)
        // Continue with other members
        continue
      }

      // Create position record
      const { error: positionError } = await supabase
        .from('positions')
        .insert({
          org_id: orgId,
          user_id: membership.user_id,
          title: 'BOARD_MEMBER',
          start_date: termStart,
          end_date: termEnd,
          is_active: true,
        })

      if (positionError) {
        console.error('Error creating position:', positionError)
        // Continue with other members
      }

      assignedCount++

      // Collect email for notification
      if (profile?.email) {
        emailsToSend.push({
          email: profile.email,
          fullName: profile.full_name || profile.email,
        })
      }
    }

    // Send notification emails
    if (emailsToSend.length > 0) {
      try {
        const { sendBoardMemberAssignedEmail } = await import('@/lib/email')
        
        for (const recipient of emailsToSend) {
          await sendBoardMemberAssignedEmail({
            to: recipient.email,
            fullName: recipient.fullName,
            orgName,
            termStart,
            termEnd,
          })
        }
      } catch (emailError) {
        console.error('Error sending board member emails:', emailError)
        // Don't fail the operation if email fails
      }
    }

    return {
      success: true,
      assignedCount,
    }
  } catch (error) {
    console.error('Error in assignBoardMembersOnboarding:', error)
    return {
      success: false,
      assignedCount: 0,
      error: 'Įvyko klaida priskiriant valdybos narius',
    }
  }
}
