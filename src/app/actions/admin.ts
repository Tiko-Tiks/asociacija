'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation } from '@/app/domain/errors'
import { MEMBERSHIP_ROLE, MEMBERSHIP_STATUS } from '@/app/domain/constants'

/**
 * Check if current user is a platform admin (super admin OR branduolys owner).
 * 
 * Platform admin is defined as:
 * - User with email 'admin@pastas.email' (super admin), OR
 * - User with OWNER role in branduolys organization (slug = 'branduolys' or 'platform')
 * 
 * CRITICAL: This is DIFFERENT from regular community OWNER.
 * - Platform admin (super admin OR branduolys owner) = can see ALL organizations
 * - Regular OWNER (community owner) = can see ONLY their own organization
 * 
 * This ensures that:
 * - Super admin (admin@pastas.email) can see all communities (full system access)
 * - Branduolys owner can see all communities (platform admin)
 * - Community owners CANNOT see branduolys data or other communities
 * 
 * Requires RLS policies that check is_platform_admin() function.
 * 
 * @returns true if user is platform admin (super admin OR branduolys owner), false otherwise
 */
export async function isPlatformAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Step 1: Check if user is super admin by email
  // CRITICAL: admin@pastas.email is super admin with all permissions
  if (user.email === 'admin@pastas.email') {
    return true
  }

  // Step 2: Find branduolys org (by slug)
  // CRITICAL: Only branduolys owner is platform admin, not regular community owners
  const { data: branduolysOrg, error: orgError }: any = await supabase
    .from('orgs')
    .select('id')
    .in('slug', ['branduolys', 'platform'])
    .limit(1)
    .maybeSingle()

  if (orgError) {
    if (orgError?.code === '42501') {
      authViolation()
    }
    return false
  }

  if (!branduolysOrg) {
    // Branduolys org not found - no platform admin
    return false
  }

  // Step 3: Check if user has OWNER role in branduolys org with ACTIVE member_status
  // CRITICAL: Use member_status (not status) per schema fix
  const { data: membership, error: membershipError }: any = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('org_id', branduolysOrg.id)
    .eq('role', MEMBERSHIP_ROLE.OWNER)
    .eq('member_status', MEMBERSHIP_STATUS.ACTIVE)
    .limit(1)
    .maybeSingle()

  if (membershipError) {
    if (membershipError?.code === '42501') {
      authViolation()
    }
    return false
  }

  // User is platform admin if they have OWNER role in branduolys org
  // OR if they are super admin (checked above)
  // Regular community owners return false
  return !!membership
}

/**
 * Get all community applications (registration requests).
 * 
 * Since schema v15.1 may not have applications table,
 * we'll use a simple approach: store in a JSON file or use a simple table.
 * For now, we'll create a server action that can be extended.
 * 
 * @returns Array of community applications
 */
export async function getCommunityApplications(): Promise<Array<{
  id: string
  communityName: string
  contactPerson: string | null
  email: string
  description: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  created_at: string
}>> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Check admin access
  const isAdmin = await isPlatformAdmin()
  if (!isAdmin) {
    authViolation()
  }

  // Query from community_applications table
  const { data: applications, error: appsError }: any = await supabase
    .from('community_applications')
    .select('id, community_name, contact_person, email, description, status, created_at')
    .order('created_at', { ascending: false })

  if (appsError) {
    if (appsError.code === '42P01') {
      // Table doesn't exist - return empty array
      console.warn('community_applications table does not exist')
      return []
    }
    console.error('Error fetching community applications:', appsError)
    return []
  }

  return (applications || []).map((app: any) => ({
    id: app.id,
    communityName: app.community_name,
    contactPerson: app.contact_person,
    email: app.email,
    description: app.description,
    status: app.status || 'PENDING',
    created_at: app.created_at,
  }))
}

/**
 * Get all organizations for admin view.
 * 
 * @returns Array of all organizations with member counts
 */
export async function getAllOrganizations(): Promise<Array<{
  id: string
  name: string
  slug: string
  status: string | null
  memberCount: number
  created_at: string | null
}>> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Check admin access
  const isAdmin = await isPlatformAdmin()
  if (!isAdmin) {
    authViolation()
  }

  // Query all organizations
  // CRITICAL: This requires RLS policy that allows OWNER role users to SELECT all orgs
  // RLS policy should check: EXISTS (SELECT 1 FROM memberships WHERE user_id = auth.uid() AND role = 'OWNER' AND member_status = 'ACTIVE')
  // If RLS blocks this, admin will only see orgs they belong to (not all orgs)
  const { data: orgs, error: orgsError }: any = await supabase
    .from('orgs')
    .select('id, name, slug, status, created_at')
    .order('created_at', { ascending: false })

  if (orgsError) {
    if (orgsError?.code === '42501') {
      authViolation()
    }
    return []
  }

  // Get member counts for each org
  const orgsWithCounts = await Promise.all(
    (orgs || []).map(async (org: any) => {
      // CRITICAL: Use member_status (not status) per schema fix
      const { count } = await supabase
        .from('memberships')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('member_status', 'ACTIVE')

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        status: org.status,
        memberCount: count || 0,
        created_at: org.created_at,
      }
    })
  )

  return orgsWithCounts
}

/**
 * Get organization finances for admin view.
 * 
 * @param orgId - Organization ID to get finances for
 * @returns Financial summary for the organization
 */
export async function getOrgFinances(orgId: string): Promise<{
  totalInvoices: number
  paidInvoices: number
  unpaidInvoices: number
  totalRevenue: number
  unpaidAmount: number
  invoices: Array<{
    id: string
    amount: number
    status: string
    due_date: string | null
    created_at: string
  }>
}> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Check admin access
  const isAdmin = await isPlatformAdmin()
  if (!isAdmin) {
    authViolation()
  }

  // Query invoices for this org
  // CRITICAL: This requires RLS policy that allows OWNER role users to SELECT invoices from ANY org
  // RLS policy should check: EXISTS (SELECT 1 FROM memberships WHERE user_id = auth.uid() AND role = 'OWNER' AND member_status = 'ACTIVE')
  // If RLS blocks this, admin will only see invoices from their own org
  const { data: invoices, error: invoicesError }: any = await supabase
    .from('invoices')
    .select('id, amount, status, due_date, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (invoicesError) {
    if (invoicesError?.code === '42501') {
      authViolation()
    }
    return {
      totalInvoices: 0,
      paidInvoices: 0,
      unpaidInvoices: 0,
      totalRevenue: 0,
      unpaidAmount: 0,
      invoices: [],
    }
  }

  const invoicesList = invoices || []
  const paidInvoices = invoicesList.filter((inv: any) => inv.status === 'PAID')
  const unpaidInvoices = invoicesList.filter((inv: any) => 
    inv.status === 'SENT' || inv.status === 'OVERDUE'
  )

  const totalRevenue = paidInvoices.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0)
  const unpaidAmount = unpaidInvoices.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0)

  return {
    totalInvoices: invoicesList.length,
    paidInvoices: paidInvoices.length,
    unpaidInvoices: unpaidInvoices.length,
    totalRevenue,
    unpaidAmount,
    invoices: invoicesList.map((inv: any) => ({
      id: inv.id,
      amount: inv.amount,
      status: inv.status,
      due_date: inv.due_date,
      created_at: inv.created_at,
    })),
  }
}

