'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth, loadActiveMembership } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'
import { MEMBERSHIP_ROLE } from '@/app/domain/constants'
import { MembershipRole } from '@/app/domain/types'

/**
 * Server Action to list business events (audit log).
 * 
 * SECURITY: Only ADMIN or CHAIR can access this data.
 * 
 * @param membership_id - UUID of the current user's membership (for org context)
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page (default: 50)
 * @returns Paginated list of business events with actor names
 * @throws Error('auth_violation') if authentication fails or user lacks permission
 * @throws Error('operation_failed') if query fails
 */
export async function listBusinessEvents(
  membership_id: string,
  page: number = 1,
  pageSize: number = 50
): Promise<{
  events: Array<{
    id: string
    event_type: string
    actor_user_id: string
    actor_name: string | null
    payload: Record<string, unknown>
    created_at: string
  }>
  total: number
  page: number
  pageSize: number
  totalPages: number
}> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  const membership = await loadActiveMembership(supabase, membership_id, user.id)

  // SECURITY: Check if user has ADMIN or CHAIR role
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

  const userRole = (membershipWithRole.role as MembershipRole) || 'MEMBER'
  if (userRole !== MEMBERSHIP_ROLE.ADMIN && userRole !== MEMBERSHIP_ROLE.CHAIR && userRole !== MEMBERSHIP_ROLE.OWNER) {
    authViolation()
  }

  // Calculate pagination
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  // Query business_events for this org
  const { data: events, error: eventsError, count }: any = await supabase
    .from('business_events')
    .select('id, event_type, actor_user_id, payload, created_at', { count: 'exact' })
    .eq('org_id', membership.org_id)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (eventsError) {
    if (eventsError?.code === '42501') {
      authViolation()
    }
    operationFailed()
  }

  if (!events || events.length === 0) {
    return {
      events: [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    }
  }

  // Query profiles for actor user IDs
  // PRIVACY: Select ONLY id, full_name from profiles (NO email per .cursorrules 1.3)
  const actorUserIds = [...new Set(events.map((e: any) => e.actor_user_id))]
  const { data: profiles, error: profilesError }: any = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', actorUserIds)

  if (profilesError) {
    if (profilesError?.code === '42501') {
      authViolation()
    }
    operationFailed()
  }

  // Create a map of user_id -> full_name
  const profilesMap = new Map(
    (profiles || []).map((p: any) => [p.id, p.full_name])
  )

  // Transform data to include actor names
  const transformedEvents = events.map((event: any) => ({
    id: event.id,
    event_type: event.event_type,
    actor_user_id: event.actor_user_id,
    actor_name: profilesMap.get(event.actor_user_id) || null,
    payload: event.payload || {},
    created_at: event.created_at,
  }))

  const total = count || 0
  const totalPages = Math.ceil(total / pageSize)

  return {
    events: transformedEvents,
    total,
    page,
    pageSize,
    totalPages,
  }
}

