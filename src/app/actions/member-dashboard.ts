'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'
import { MEMBERSHIP_STATUS } from '@/app/domain/constants'

export interface MemberDashboardData {
  // User identity
  userName: string | null
  memberStatus: string
  memberMetadata?: any // Include metadata for status hints
  position: string | null
  orgName: string
  orgSlug: string
  
  // Invoices
  invoices: Array<{
    id: string
    title: string
    amount: number
    status: string
    due_date: string | null
  }>
  unpaidInvoicesCount: number
  
  // Engagement stats
  engagement: {
    financial: number // Count of PAID invoices
    labor: number // Count of PRESENT attendance at WORK events
    democracy: number // Count of PRESENT attendance at MEETING events
  }
  
  // Upcoming events
  upcomingEvents: Array<{
    id: string
    title: string
    date: string
    location: string | null
    type: string
  }>
  
  // Latest resolutions
  resolutions: Array<{
    id: string
    title: string
    adopted_at: string | null
  }>
  
  // Legal consents
  needsConsent: boolean
  consentMessage: string | null
}

/**
 * Server Action to fetch comprehensive member dashboard data.
 * 
 * Fetches in parallel:
 * - User identity (name, status, position)
 * - Invoices (SENT/PAID/OVERDUE only)
 * - Engagement stats (financial, labor, democracy)
 * - Upcoming events
 * - Latest resolutions (APPROVED, MEMBERS or PUBLIC)
 * - Legal consents status
 * 
 * @param orgId - Organization ID
 * @returns Member dashboard data
 */
export async function getMemberDashboardData(orgId: string): Promise<MemberDashboardData> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Step 1: Get user's membership and profile
  // NOTE: v19.0 schema - metadata column does NOT exist in memberships table
  // Allow both ACTIVE and PENDING memberships so users can see dashboard while waiting for approval
  const { data: membership, error: membershipError }: any = await supabase
    .from('memberships')
    .select('id, user_id, member_status')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .in('member_status', [MEMBERSHIP_STATUS.ACTIVE, MEMBERSHIP_STATUS.PENDING])
    .maybeSingle()

  if (membershipError) {
    if (membershipError?.code === '42501') {
      authViolation()
    }
    console.error('Error fetching membership:', membershipError)
    operationFailed()
  }

  if (!membership) {
    operationFailed('Membership not found')
  }

  // Step 2: Get organization name and slug
  const { data: org, error: orgError }: any = await supabase
    .from('orgs')
    .select('name, slug')
    .eq('id', orgId)
    .maybeSingle()

  if (orgError) {
    console.error('Error fetching organization:', orgError)
  }

  const orgName = org?.name || 'Bendruomenė'
  const orgSlug = org?.slug || ''

  // Step 3: Fetch all data in parallel
  const [
    profileResult,
    positionResult,
    invoicesResult,
    paidInvoicesResult,
    workAttendanceResult,
    meetingAttendanceResult,
    eventsResult,
    resolutionsResult,
    consentsResult,
  ] = await Promise.all([
    // Profile
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle(),

    // Active position
    supabase
      .from('positions')
      .select('title')
      .eq('user_id', user.id)
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle(),

    // Invoices (SENT/PAID/OVERDUE only, exclude DRAFT)
    // CRITICAL: invoices table uses membership_id, not user_id
    supabase
      .from('invoices')
      .select('id, description, amount, status, due_date')
      .eq('org_id', orgId)
      .eq('membership_id', membership.id)
      .in('status', ['SENT', 'PAID', 'OVERDUE'])
      .order('due_date', { ascending: true }),

    // Count of PAID invoices (financial engagement)
    // CRITICAL: invoices table uses membership_id, not user_id
    supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('membership_id', membership.id)
      .eq('status', 'PAID'),

    // Work attendance (will be processed separately)
    Promise.resolve({ count: 0, error: null }),

    // Meeting attendance (will be processed separately)
    Promise.resolve({ count: 0, error: null }),

    // Upcoming events (future dates) - TODO: Events table may not exist yet
    // For now, return empty array
    Promise.resolve({ data: [], error: null }) as Promise<{ data: any[]; error: any }>,

    // Latest resolutions (APPROVED, MEMBERS or PUBLIC)
    supabase
      .from('resolutions')
      .select('id, title, adopted_at')
      .eq('org_id', orgId)
      .eq('status', 'APPROVED')
      .in('visibility', ['MEMBERS', 'PUBLIC'])
      .order('adopted_at', { ascending: false })
      .limit(3),

    // Legal consents (check if user needs to review)
    supabase
      .from('member_consents')
      .select('id, consent_type, version, agreed_at')
      .eq('user_id', user.id)
      .eq('org_id', orgId)
      .order('agreed_at', { ascending: false }),
  ])

  // Handle errors
  if (profileResult.error && profileResult.error.code !== 'PGRST116') {
    console.error('Error fetching profile:', profileResult.error)
  }
  if (positionResult.error && positionResult.error.code !== 'PGRST116') {
    console.error('Error fetching position:', positionResult.error)
  }
  if (invoicesResult.error) {
    console.error('Error fetching invoices:', invoicesResult.error)
  }
  if (eventsResult.error) {
    console.error('Error fetching events:', eventsResult.error)
  }
  if (resolutionsResult.error) {
    console.error('Error fetching resolutions:', resolutionsResult.error)
  }

  // Process work attendance - TODO: Events table may not exist yet
  // For now, return 0
  let laborCount = 0
  // TODO: Implement when events table is available
  // try {
  //   const { data: workEvents }: any = await supabase
  //     .from('events')
  //     .select('id')
  //     .eq('org_id', orgId)
  //     .eq('type', 'WORK')
  //   ...
  // }

  // Process meeting attendance - TODO: Events table may not exist yet
  // For now, return 0
  let democracyCount = 0
  // TODO: Implement when events table is available

  // Calculate unpaid invoices
  const unpaidInvoicesCount = (invoicesResult.data || []).filter(
    (inv: any) => inv.status === 'SENT' || inv.status === 'OVERDUE'
  ).length

  // Check legal consents (simplified - would need actual consent version checking)
  const needsConsent = false // TODO: Implement proper consent version checking
  const consentMessage = null

  return {
    userName: profileResult.data?.full_name || null,
    memberStatus: membership.member_status || 'ACTIVE',
    memberMetadata: null, // NOTE: v19.0 schema - metadata column does NOT exist in memberships table
    position: positionResult.data?.title || null,
    orgName,
    orgSlug,
    invoices: (invoicesResult.data || []).map((inv: any) => ({
      id: inv.id,
      title: inv.description || 'Sąskaita',
      amount: inv.amount,
      status: inv.status,
      due_date: inv.due_date,
    })),
    unpaidInvoicesCount,
    engagement: {
      financial: paidInvoicesResult.count || 0,
      labor: laborCount,
      democracy: democracyCount,
    },
    upcomingEvents: (eventsResult.data || []).map((event: any) => ({
      id: event.id,
      title: event.title || 'Renginys',
      date: event.date || new Date().toISOString(),
      location: event.location || null,
      type: event.type || 'OTHER',
    })),
    resolutions: (resolutionsResult.data || []).map((res: any) => ({
      id: res.id,
      title: res.title,
      adopted_at: res.adopted_at,
    })),
    needsConsent,
    consentMessage,
  }
}

