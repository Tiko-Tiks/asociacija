'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'
import { MEMBERSHIP_STATUS } from '@/app/domain/constants'

export interface MemberRequirement {
  id: string
  type: 'PROFILE_INCOMPLETE' | 'UNPAID_INVOICE' | 'OVERDUE_INVOICE' | 'MISSING_CONSENT' | 'SUSPENDED_STATUS'
  title: string
  description: string
  severity: 'warning' | 'error' | 'info'
  actionUrl?: string
  actionLabel?: string
  metadata?: Record<string, any>
}

/**
 * Server Action to check member requirements and warnings.
 * 
 * Checks:
 * - Profile completeness (name, surname)
 * - Unpaid invoices
 * - Overdue invoices
 * - Missing consents
 * - Suspended status
 * 
 * @param orgId - Organization ID
 * @returns Array of requirements/warnings
 */
export async function getMemberRequirements(orgId: string, orgSlug?: string): Promise<MemberRequirement[]> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  const requirements: MemberRequirement[] = []

  // Step 1: Get user's membership
  const { data: membership, error: membershipError }: any = await supabase
    .from('memberships')
    .select('id, user_id, member_status, status')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .eq('status', MEMBERSHIP_STATUS.ACTIVE)
    .maybeSingle()

  if (membershipError) {
    if (membershipError?.code === '42501') {
      authViolation()
    }
    console.error('Error fetching membership:', membershipError)
    operationFailed()
  }

  if (!membership) {
    return requirements
  }

  // Step 2: Check profile completeness
  const { data: profile, error: profileError }: any = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (!profileError && profile) {
    const fullName = profile.full_name?.trim() || ''
    const hasFullName = fullName.length > 0
    
    // Check if full_name contains both first and last name (has space or is too short)
    // Simple heuristic: if full_name doesn't contain a space, likely missing surname
    const hasSpace = fullName.includes(' ')
    const isTooShort = fullName.length < 3
    
    if (!hasFullName || (!hasSpace && !isTooShort) || isTooShort) {
      const missingFields: string[] = []
      if (!hasFullName) {
        missingFields.push('vardas', 'pavardė')
      } else if (!hasSpace) {
        missingFields.push('pavardė')
      }
      
      requirements.push({
        id: 'profile-incomplete',
        type: 'PROFILE_INCOMPLETE',
        title: 'Nepilnas profilio informacija',
        description: missingFields.length > 0 
          ? `Prašome užpildyti: ${missingFields.join(', ')}.`
          : 'Prašome užpildyti visus privalomus laukus.',
        severity: 'warning',
        actionUrl: orgSlug ? `/dashboard/${orgSlug}/profile` : `/dashboard/${orgId}/profile`,
        actionLabel: 'Atnaujinti profilį',
        metadata: {
          missingFields,
        },
      })
    }
  }

  // Step 3: Check for unpaid invoices
  const { data: unpaidInvoices, error: invoicesError }: any = await supabase
    .from('invoices')
    .select('id, description, amount, due_date, status')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .in('status', ['SENT', 'OVERDUE'])
    .order('due_date', { ascending: true })

  if (!invoicesError && unpaidInvoices && unpaidInvoices.length > 0) {
    const overdueInvoices = unpaidInvoices.filter((inv: any) => {
      if (inv.status === 'OVERDUE') return true
      if (inv.due_date) {
        const dueDate = new Date(inv.due_date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return dueDate < today
      }
      return false
    })

    const pendingInvoices = unpaidInvoices.filter((inv: any) => inv.status === 'SENT' && !overdueInvoices.includes(inv))

    // Overdue invoices - error severity
    if (overdueInvoices.length > 0) {
      const totalOverdue = overdueInvoices.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0)
      requirements.push({
        id: 'overdue-invoices',
        type: 'OVERDUE_INVOICE',
        title: 'Vėluojantys mokėjimai',
        description: `Turite ${overdueInvoices.length} ${overdueInvoices.length === 1 ? 'vėluojantį mokėjimą' : 'vėluojančių mokėjimų'}. Bendra suma: ${totalOverdue.toFixed(2)} €`,
        severity: 'error',
        actionUrl: `/dashboard/${orgId}/invoices`,
        actionLabel: 'Peržiūrėti sąskaitas',
        metadata: {
          count: overdueInvoices.length,
          totalAmount: totalOverdue,
          invoices: overdueInvoices.map((inv: any) => ({
            id: inv.id,
            title: inv.description || 'Sąskaita',
            amount: inv.amount,
            due_date: inv.due_date,
          })),
        },
      })
    }

    // Pending invoices - warning severity
    if (pendingInvoices.length > 0) {
      const totalPending = pendingInvoices.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0)
      requirements.push({
        id: 'unpaid-invoices',
        type: 'UNPAID_INVOICE',
        title: 'Laukia apmokėjimo',
        description: `Turite ${pendingInvoices.length} ${pendingInvoices.length === 1 ? 'neapmokėtą sąskaitą' : 'neapmokėtų sąskaitų'}. Bendra suma: ${totalPending.toFixed(2)} €`,
        severity: 'warning',
        actionUrl: `/dashboard/${orgId}/invoices`,
        actionLabel: 'Peržiūrėti sąskaitas',
        metadata: {
          count: pendingInvoices.length,
          totalAmount: totalPending,
          invoices: pendingInvoices.map((inv: any) => ({
            id: inv.id,
            title: inv.description || 'Sąskaita',
            amount: inv.amount,
            due_date: inv.due_date,
          })),
        },
      })
    }
  }

  // Step 4: Check member status
  if (membership.member_status === 'SUSPENDED') {
    requirements.push({
      id: 'suspended-status',
      type: 'SUSPENDED_STATUS',
      title: 'Jūsų narystė sustabdyta',
      description: 'Jūsų narystė šiuo metu yra sustabdyta. Susisiekite su organizacijos administracija.',
      severity: 'error',
      actionUrl: `/dashboard/${orgId}/members`,
      actionLabel: 'Susisiekti',
      metadata: {
        status: membership.member_status,
      },
    })
  }

  // Step 5: Check consents (simplified - would need actual consent version checking)
  // TODO: Implement proper consent version checking
  // For now, we'll skip this as it requires more complex logic

  return requirements
}

