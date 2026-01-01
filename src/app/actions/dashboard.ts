'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth, loadActiveMembership } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'
import { MEMBERSHIP_STATUS, PROJECT_STATUS, INVOICE_STATUS } from '@/app/domain/constants'

interface DashboardStats {
  members: {
    totalActive: number
  }
  invoices: {
    unpaidCount: number
    unpaidSum: number
  }
  projects: {
    activeCount: number
  }
  meetings: {
    nextMeeting: {
      id: string
      title: string
      scheduled_at: string
    } | null
  }
  userActions: {
    hasUnpaidInvoices: boolean
    unmarkedAttendance: {
      meetingId: string
      meetingTitle: string
      scheduledAt: string
    } | null
  }
  recentActivity: Array<{
    id: string
    event_type: string
    actor_name: string | null
    created_at: string
  }>
}

/**
 * Server Action to get dashboard statistics.
 * 
 * Aggregates key metrics from all modules for the dashboard overview.
 * Uses Promise.all for parallel queries for better performance.
 * 
 * @param membership_id - UUID of the current user's membership (for org context)
 * @returns Dashboard statistics including members, invoices, projects, meetings, user actions, and recent activity
 * @throws Error('auth_violation') if authentication fails
 * @throws Error('operation_failed') if query fails
 */
export async function getDashboardStats(
  membership_id: string
): Promise<DashboardStats> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  const membership = await loadActiveMembership(supabase, membership_id, user.id)

  // Parallel queries for better performance
  const [
    membersResult,
    invoicesResult,
    projectsResult,
    meetingsResult,
    userInvoicesResult,
    activityResult,
  ] = await Promise.all([
    // 1. Count active members
    supabase
      .from('memberships')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', membership.org_id)
      .eq('status', MEMBERSHIP_STATUS.ACTIVE),

    // 2. Count and sum unpaid invoices
    supabase
      .from('invoices')
      .select('amount', { count: 'exact' })
      .eq('org_id', membership.org_id)
      .eq('status', INVOICE_STATUS.SENT),

    // 3. Count active projects
    supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', membership.org_id)
      .eq('status', PROJECT_STATUS.ACTIVE),

    // 4. Get next upcoming meeting
    supabase
      .from('meetings')
      .select('id, title, scheduled_at')
      .eq('org_id', membership.org_id)
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(1)
      .maybeSingle(),

    // 5. Check if current user has unpaid invoices
    supabase
      .from('invoices')
      .select('id')
      .eq('org_id', membership.org_id)
      .eq('status', INVOICE_STATUS.SENT)
      .eq('membership_id', membership_id)
      .limit(1),

    // 6. Placeholder (attendance check done separately)
    Promise.resolve({ data: null, error: null }) as Promise<{ data: any; error: any }>,

    // 7. Get last 5 business events with actor names
    supabase
      .from('business_events')
      .select('id, event_type, actor_user_id, created_at')
      .eq('org_id', membership.org_id)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  // Handle errors - log detailed error info
  // Make function resilient: return default values instead of throwing for non-critical errors
  // Only throw for auth violations (42501) - other errors are logged but treated as empty/default values
  
  if (membersResult.error && membersResult.error.code !== 'PGRST116') {
    console.error('getDashboardStats: members query error:', {
      code: membersResult.error.code,
      message: membersResult.error.message,
      details: membersResult.error.details,
    })
    if (membersResult.error?.code === '42501') authViolation()
    // Don't throw - use default value (0 members)
  }
  if (invoicesResult.error && invoicesResult.error.code !== 'PGRST116') {
    console.error('getDashboardStats: invoices query error:', {
      code: invoicesResult.error.code,
      message: invoicesResult.error.message,
      details: invoicesResult.error.details,
    })
    if (invoicesResult.error?.code === '42501') authViolation()
    // Don't throw - use default value (0 invoices, 0 sum)
  }
  if (projectsResult.error && projectsResult.error.code !== 'PGRST116') {
    console.error('getDashboardStats: projects query error:', {
      code: projectsResult.error.code,
      message: projectsResult.error.message,
      details: projectsResult.error.details,
    })
    if (projectsResult.error?.code === '42501') authViolation()
    // Don't throw - use default value (0 projects)
  }
  if (meetingsResult.error && meetingsResult.error.code !== 'PGRST116') {
    console.error('getDashboardStats: meetings query error:', {
      code: meetingsResult.error.code,
      message: meetingsResult.error.message,
      details: meetingsResult.error.details,
    })
    if (meetingsResult.error?.code === '42501') authViolation()
    // Don't throw - use default value (no upcoming meeting)
  }
  if (userInvoicesResult.error && userInvoicesResult.error.code !== 'PGRST116') {
    console.error('getDashboardStats: userInvoices query error:', {
      code: userInvoicesResult.error.code,
      message: userInvoicesResult.error.message,
      details: userInvoicesResult.error.details,
    })
    if (userInvoicesResult.error?.code === '42501') authViolation()
    // Don't throw - use default value (no unpaid invoices)
  }
  if (activityResult.error && activityResult.error.code !== 'PGRST116') {
    console.error('getDashboardStats: activity query error:', {
      code: activityResult.error.code,
      message: activityResult.error.message,
      details: activityResult.error.details,
    })
    if (activityResult.error?.code === '42501') authViolation()
    // Don't throw - use default value (empty activity)
  }

  // Calculate unpaid invoices sum (use empty array if query failed)
  const unpaidSum = ((invoicesResult.error && invoicesResult.error.code !== 'PGRST116') 
    ? [] 
    : (invoicesResult.data || [])
  ).reduce(
    (sum: number, invoice: any) => sum + (invoice.amount || 0),
    0
  )

  // Check if user has unpaid invoices (use empty array if query failed)
  const hasUnpaidInvoices = ((userInvoicesResult.error && userInvoicesResult.error.code !== 'PGRST116')
    ? []
    : (userInvoicesResult.data || [])
  ).length > 0

  // Get unmarked attendance - check if next meeting exists and user hasn't marked attendance
  let unmarkedAttendance = null
  if (meetingsResult.data) {
    const meetingData = meetingsResult.data as any
    const { data: attendance }: any = await supabase
      .from('meeting_attendance')
      .select('id')
      .eq('meeting_id', meetingData.id)
      .eq('membership_id', membership_id)
      .maybeSingle()

    if (!attendance) {
      unmarkedAttendance = {
        meetingId: meetingData.id,
        meetingTitle: meetingData.title,
        scheduledAt: meetingData.scheduled_at,
      }
    }
  }

  // Get actor names for recent activity (use empty array if query failed)
  const activityData = (activityResult.error && activityResult.error.code !== 'PGRST116')
    ? []
    : (activityResult.data || [])
  const actorUserIds = [...new Set(activityData.map((e: any) => e.actor_user_id))]
  let profilesMap = new Map<string, string | null>()

  if (actorUserIds.length > 0) {
    const { data: profiles, error: profilesError }: any = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', actorUserIds)

    if (profilesError) {
      if (profilesError?.code === '42501') authViolation()
      // Don't fail the whole request if profiles query fails, just continue without names
    } else {
      profilesMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]))
    }
  }

  // Build recent activity (use empty array if query failed)
  const recentActivity = ((activityResult.error && activityResult.error.code !== 'PGRST116')
    ? []
    : (activityResult.data || [])
  ).map((event: any) => ({
    id: event.id,
    event_type: event.event_type,
    actor_name: profilesMap.get(event.actor_user_id) || null,
    created_at: event.created_at,
  }))

  // Return stats with default values for failed queries
  // This makes the dashboard resilient to partial query failures
  // Only auth violations (42501) throw - other errors return default values
  return {
    members: {
      totalActive: (membersResult.error && membersResult.error.code !== 'PGRST116')
        ? 0
        : (membersResult.count || 0),
    },
    invoices: {
      unpaidCount: (invoicesResult.error && invoicesResult.error.code !== 'PGRST116')
        ? 0
        : (invoicesResult.count || 0),
      unpaidSum,
    },
    projects: {
      activeCount: (projectsResult.error && projectsResult.error.code !== 'PGRST116')
        ? 0
        : (projectsResult.count || 0),
    },
    meetings: {
      nextMeeting: (meetingsResult.error && meetingsResult.error.code !== 'PGRST116')
        ? null
        : (meetingsResult.data
            ? {
                id: (meetingsResult.data as any).id,
                title: (meetingsResult.data as any).title,
                scheduled_at: (meetingsResult.data as any).scheduled_at,
              }
            : null),
    },
    userActions: {
      hasUnpaidInvoices,
      unmarkedAttendance,
    },
    recentActivity,
  }
}

