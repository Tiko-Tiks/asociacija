'use server'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Global Platform Statistics
 * 
 * Fetches system-wide metrics using admin client (bypasses RLS).
 * Used by Super Admin dashboard.
 */
export interface GlobalStats {
  totalCommunities: number
  activeCommunities: number
  pendingCommunities: number
  suspendedCommunities: number
  totalUsers: number
  activeMemberships: number
  suspendedMemberships: number
  totalInvoices: number
  paidInvoices: number
  unpaidInvoices: number
  totalRevenue: number
  userGrowthLast30Days: number
  systemHealth: {
    database: 'healthy' | 'degraded' | 'down'
    lastChecked: string
  }
}

export async function getGlobalStats(): Promise<GlobalStats> {
  const supabase = createAdminClient()

  // Fetch all organizations with their rulesets to calculate effective status
  const { data: orgs, error: orgsError } = await supabase
    .from('orgs')
    .select('id, status')

  if (orgsError) {
    console.error('Error fetching organizations for stats:', orgsError)
  }

  const orgsList = orgs || []
  const totalCommunities = orgsList.length

  // Fetch governance configs and rulesets to calculate effective status
  const { data: governanceConfigs } = await supabase
    .from('governance_configs')
    .select('org_id')

  const { data: proposedRulesets } = await supabase
    .from('org_rulesets')
    .select('org_id, status')
    .eq('status', 'PROPOSED')

  const { data: activeRulesets } = await supabase
    .from('org_rulesets')
    .select('org_id')
    .eq('status', 'ACTIVE')

  const governanceConfigMap = new Map((governanceConfigs || []).map((gc) => [gc.org_id, true]))
  const proposedRulesetMap = new Map((proposedRulesets || []).map((pr) => [pr.org_id, true]))
  const activeRulesetMap = new Map((activeRulesets || []).map((ar) => [ar.org_id, true]))

  // Calculate effective status for each org (same logic as getAllOrganizationsAdmin)
  let activeCommunities = 0
  let pendingCommunities = 0
  let suspendedCommunities = 0

  orgsList.forEach((org) => {
    const hasGovernanceConfig = governanceConfigMap.has(org.id)
    const hasProposedRuleset = proposedRulesetMap.has(org.id)
    const hasActiveRuleset = activeRulesetMap.has(org.id)

    // Determine effective status
    let effectiveStatus = org.status

    // If org.status is ACTIVE but doesn't have active ruleset, it's not fully active
    if (org.status === 'ACTIVE' && !hasActiveRuleset) {
      if (hasGovernanceConfig && hasProposedRuleset) {
        effectiveStatus = 'PENDING_REVIEW'
      } else {
        effectiveStatus = 'PENDING'
      }
    } else if (!org.status || org.status === 'PENDING' || org.status === 'ONBOARDING') {
      if (hasGovernanceConfig && hasProposedRuleset && !hasActiveRuleset) {
        effectiveStatus = 'PENDING_REVIEW'
      } else if (!hasGovernanceConfig || !hasProposedRuleset) {
        effectiveStatus = 'PENDING'
      }
    }

    // Count by effective status
    if (effectiveStatus === 'ACTIVE' && hasActiveRuleset) {
      activeCommunities++
    } else if (effectiveStatus === 'PENDING_REVIEW' || effectiveStatus === 'PENDING_ACTIVATION' || effectiveStatus === 'PENDING') {
      pendingCommunities++
    } else if (effectiveStatus === 'SUSPENDED') {
      suspendedCommunities++
    } else {
      // Default to pending if status is unclear
      pendingCommunities++
    }
  })

  // Fetch all memberships
  const { data: memberships, error: membershipsError } = await supabase
    .from('memberships')
    .select('id, member_status')

  if (membershipsError) {
    console.error('Error fetching memberships for stats:', membershipsError)
  }

  const membershipsList = memberships || []
  const activeMemberships = membershipsList.filter(
    (m: any) => m.member_status === 'ACTIVE'
  ).length
  const suspendedMemberships = membershipsList.filter(
    (m: any) => m.member_status === 'SUSPENDED'
  ).length

  // Get unique user count
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
  const totalUsers = users?.users?.length || 0

  // Fetch invoices
  const { data: invoices, error: invoicesError } = await supabase
    .from('invoices')
    .select('id, status, amount')

  if (invoicesError) {
    console.error('Error fetching invoices for stats:', invoicesError)
  }

  const invoicesList = invoices || []
  const totalInvoices = invoicesList.length
  const paidInvoicesList = invoicesList.filter((inv: any) => inv.status === 'PAID')
  const paidInvoices = paidInvoicesList.length
  const unpaidInvoices = invoicesList.filter(
    (inv: any) => inv.status === 'SENT' || inv.status === 'OVERDUE'
  ).length
  const totalRevenue = paidInvoicesList.reduce(
    (sum: number, inv: any) => sum + (inv.amount || 0),
    0
  )

  // Calculate user growth (last 30 days)
  // This is a simplified calculation - in production, you'd query auth.users.created_at
  const userGrowthLast30Days = 0 // TODO: Implement actual growth calculation

  // System health check
  const systemHealth = {
    database: 'healthy' as const, // TODO: Implement actual health check
    lastChecked: new Date().toISOString(),
  }

  return {
    totalCommunities,
    activeCommunities,
    pendingCommunities,
    suspendedCommunities,
    totalUsers,
    activeMemberships,
    suspendedMemberships,
    totalInvoices,
    paidInvoices,
    unpaidInvoices,
    totalRevenue,
    userGrowthLast30Days,
    systemHealth,
  }
}

