'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth, loadActiveMembership } from './_guards'
import { authViolation } from '@/app/domain/errors'
import { MEMBERSHIP_STATUS, INVOICE_STATUS, RESOLUTION_STATUS } from '@/app/domain/constants'

/**
 * Command Center Data Actions (B1.1)
 * 
 * Fetches all required data for the 3-column Command Center layout.
 * Read-only data fetching for monitoring and activity feed.
 */

export interface CommandCenterData {
  monitoring: {
    activeMembers: number
    pendingMembers: number
    activeResolutions: number
    unpaidInvoices: number | null // null if invoices table doesn't exist
    openIdeas: number
    activeProjects: number
  }
  activityFeed: Array<{
    id: string
    type: 'EVENT' | 'RESOLUTION' | 'IDEA' | 'PROJECT'
    title: string
    created_at: string
    status?: string // For resolutions, ideas, projects
    event_date?: string // For events
  }>
}

/**
 * Get Command Center data in parallel
 * 
 * Fetches:
 * 1. Active Members count (status = ACTIVE)
 * 2. Pending Members count (member_status = PENDING or status != ACTIVE)
 * 3. Active Resolutions count (status = APPROVED)
 * 4. Unpaid Invoices count (status = SENT) - gracefully handles missing table
 * 5. Activity Feed: events + resolutions (sorted by created_at DESC)
 */
export async function getCommandCenterData(
  membership_id: string
): Promise<CommandCenterData> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  const membership = await loadActiveMembership(supabase, membership_id, user.id)

  const orgId = membership.org_id

  // Parallel queries for better performance
  const [
    activeMembersResult,
    pendingMembersResult,
    activeResolutionsResult,
    invoicesResult,
    eventsResult,
    resolutionsResult,
    ideasResult,
    projectsResult,
  ] = await Promise.all([
    // 1. Count active members
    supabase
      .from('memberships')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', MEMBERSHIP_STATUS.ACTIVE),

    // 2. Count pending members (member_status = PENDING or status != ACTIVE)
    supabase
      .from('memberships')
      .select('id, member_status, status', { count: 'exact' })
      .eq('org_id', orgId),

    // 3. Count active resolutions (status = APPROVED)
    supabase
      .from('resolutions')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', RESOLUTION_STATUS.APPROVED),

    // 4. Count unpaid invoices (status = SENT) - may fail if table doesn't exist
    supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', INVOICE_STATUS.SENT)
      .then((result) => result)
      .catch((error) => {
        // If table doesn't exist or RLS blocks, return null count
        if (error?.code === '42P01' || error?.code === '42501') {
          return { data: null, count: null, error: null }
        }
        return { data: null, count: null, error }
      }),

    // 5. Get events (sorted by created_at DESC)
    supabase
      .from('events')
      .select('id, title, created_at, event_date')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then((result) => result)
      .catch((error) => {
        // If table doesn't exist, return empty array
        if (error?.code === '42P01') {
          return { data: [], error: null }
        }
        return { data: [], error }
      }),

    // 6. Get resolutions (sorted by created_at DESC)
    supabase
      .from('resolutions')
      .select('id, title, created_at, status')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(20),

    // 7. Get active ideas (not FAILED/abandoned)
    // v19.0 COMPLIANT: Count ideas where status != 'FAILED'
    // Phase is in metadata.fact.phase, but we use status for counting
    supabase
      .from('ideas')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .neq('status', 'FAILED')
      .then((result) => result)
      .catch((error) => {
        if (error?.code === '42P01') {
          return { data: null, count: 0, error: null }
        }
        return { data: null, count: 0, error }
      }),

    // 8. Get active projects (status IN ('FUNDING', 'IN_PROGRESS'))
    supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .in('status', ['FUNDING', 'IN_PROGRESS'])
      .then((result) => result)
      .catch((error) => {
        if (error?.code === '42P01') {
          return { data: null, count: 0, error: null }
        }
        return { data: null, count: 0, error }
      }),
  ])

  // Handle errors - only throw for auth violations
  if (activeMembersResult.error && activeMembersResult.error.code !== 'PGRST116') {
    if (activeMembersResult.error?.code === '42501') authViolation()
    console.error('Error fetching active members:', activeMembersResult.error)
  }

  if (pendingMembersResult.error && pendingMembersResult.error.code !== 'PGRST116') {
    if (pendingMembersResult.error?.code === '42501') authViolation()
    console.error('Error fetching pending members:', pendingMembersResult.error)
  }

  if (activeResolutionsResult.error && activeResolutionsResult.error.code !== 'PGRST116') {
    if (activeResolutionsResult.error?.code === '42501') authViolation()
    console.error('Error fetching active resolutions:', activeResolutionsResult.error)
  }

  if (invoicesResult.error && invoicesResult.error.code !== 'PGRST116' && invoicesResult.error?.code !== '42P01') {
    if (invoicesResult.error?.code === '42501') authViolation()
    console.error('Error fetching invoices:', invoicesResult.error)
  }

  if (eventsResult.error && eventsResult.error?.code !== '42P01') {
    if (eventsResult.error?.code === '42501') authViolation()
    console.error('Error fetching events:', eventsResult.error)
  }

  if (resolutionsResult.error && resolutionsResult.error.code !== 'PGRST116') {
    if (resolutionsResult.error?.code === '42501') authViolation()
    console.error('Error fetching resolutions:', resolutionsResult.error)
  }

  // Calculate pending members (member_status = PENDING or status != ACTIVE)
  const pendingCount = (pendingMembersResult.data || []).filter((m: any) => {
    return m.member_status === 'PENDING' || m.status !== MEMBERSHIP_STATUS.ACTIVE
  }).length

  // Build activity feed: combine events, resolutions, ideas, and projects, sort by created_at DESC
  const activityFeed: CommandCenterData['activityFeed'] = []

  // Add events
  if (eventsResult.data) {
    eventsResult.data.forEach((event: any) => {
      activityFeed.push({
        id: event.id,
        type: 'EVENT',
        title: event.title,
        created_at: event.created_at,
        event_date: event.event_date || undefined,
      })
    })
  }

  // Add resolutions
  if (resolutionsResult.data) {
    resolutionsResult.data.forEach((resolution: any) => {
      activityFeed.push({
        id: resolution.id,
        type: 'RESOLUTION',
        title: resolution.title,
        created_at: resolution.created_at,
        status: resolution.status,
      })
    })
  }

  // Add ideas (if table exists)
  try {
    const { data: ideasData } = await supabase
      .from('ideas')
      .select('id, title, created_at, status')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (ideasData) {
      ideasData.forEach((idea: any) => {
        activityFeed.push({
          id: idea.id,
          type: 'IDEA',
          title: idea.title,
          created_at: idea.created_at,
          status: idea.status,
        })
      })
    }
  } catch (error: any) {
    // Ignore if table doesn't exist
    if (error?.code !== '42P01') {
      console.error('Error fetching ideas:', error)
    }
  }

  // Add projects (if table exists)
  try {
    const { data: projectsData } = await supabase
      .from('projects')
      .select('id, title, created_at, status')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (projectsData) {
      projectsData.forEach((project: any) => {
        activityFeed.push({
          id: project.id,
          type: 'PROJECT',
          title: project.title,
          created_at: project.created_at,
          status: project.status,
        })
      })
    }
  } catch (error: any) {
    // Ignore if table doesn't exist
    if (error?.code !== '42P01') {
      console.error('Error fetching projects:', error)
    }
  }

  // Sort by created_at DESC
  activityFeed.sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return {
    monitoring: {
      activeMembers: activeMembersResult.count || 0,
      pendingMembers: pendingCount,
      activeResolutions: activeResolutionsResult.count || 0,
      unpaidInvoices: invoicesResult.count ?? null, // null if table doesn't exist
      openIdeas: ideasResult.count || 0,
      activeProjects: projectsResult.count || 0,
    },
    activityFeed: activityFeed.slice(0, 20), // Limit to 20 items
  }
}

