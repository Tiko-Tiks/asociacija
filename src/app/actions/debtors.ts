'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { requireOwner } from '@/app/domain/guards/membership'
import { authViolation, operationFailed } from '@/app/domain/errors'

export type DebtorStatus = 'DEBTOR' | 'PENDING' | 'PAID_UP'

export interface MemberDebt {
  membership_id: string
  org_id: string
  user_id: string
  member_status: string
  full_name: string | null
  email: string | null
  overdue_count: number
  pending_count: number
  total_debt: number
  oldest_overdue_date: string | null
  debt_status: DebtorStatus
  can_vote: boolean // Based on governance settings
}

/**
 * Get all members with their debt status
 * OWNER only
 */
export async function getMemberDebts(orgId: string): Promise<MemberDebt[]> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  console.log('[getMemberDebts] Starting for org:', orgId, 'user:', user.id)

  // Ensure user is OWNER of this org
  try {
    await requireOwner(supabase, user.id, orgId)
    console.log('[getMemberDebts] User is OWNER ✓')
  } catch (error) {
    console.error('[getMemberDebts] Not OWNER:', error)
    throw error
  }

  // Get governance settings for this org
  const { data: govConfig, error: govError } = await supabase
    .from('governance_configs')
    .select('answers')
    .eq('org_id', orgId)
    .single()

  if (govError) {
    console.error('[getMemberDebts] Error fetching governance config:', govError)
    // Don't fail - just use defaults
  }

  const trackFees = (govConfig as any)?.answers?.track_fees === 'yes'
  const restrictDebtors = (govConfig as any)?.answers?.restrict_debtors || 'not_applicable'
  const blockVoting = restrictDebtors === 'block_vote'
  
  console.log('[getMemberDebts] Governance:', { trackFees, restrictDebtors, blockVoting })

  // Query member_debts view
  const { data: debts, error } = await supabase
    .from('member_debts')
    .select('*')
    .eq('org_id', orgId)
    .order('total_debt', { ascending: false })

  console.log('[getMemberDebts] Query result:', { 
    debtsCount: debts?.length, 
    error: error?.message,
    errorCode: error?.code 
  })

  if (error) {
    if (error.code === '42501') {
      console.error('[getMemberDebts] RLS violation!')
      authViolation()
    }
    console.error('[getMemberDebts] Error fetching member debts:', error)
    operationFailed()
  }

  // Add can_vote flag based on governance settings
  const result = (debts || []).map((debt: any) => ({
    ...debt,
    can_vote: !trackFees || !blockVoting || debt.debt_status === 'PAID_UP',
  }))
  
  console.log('[getMemberDebts] Returning', result.length, 'debts')
  return result
}

/**
 * Get debt summary for org
 * OWNER only
 */
export async function getDebtSummary(orgId: string) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  await requireOwner(supabase, user.id, orgId)

  console.log('[getDebtSummary] Starting for org:', orgId)

  const { data: debts, error } = await supabase
    .from('member_debts')
    .select('debt_status, total_debt, overdue_count')
    .eq('org_id', orgId)

  console.log('[getDebtSummary] Query result:', { 
    debtsCount: debts?.length, 
    error: error?.message 
  })

  if (error) {
    console.error('[getDebtSummary] Error fetching debt summary:', error)
    operationFailed()
  }

  const summary = {
    total_members: debts?.length || 0,
    debtors: debts?.filter((d: any) => d.debt_status === 'DEBTOR').length || 0,
    pending: debts?.filter((d: any) => d.debt_status === 'PENDING').length || 0,
    total_outstanding: debts?.reduce((sum: number, d: any) => sum + (d.total_debt || 0), 0) || 0,
    total_overdue_invoices: debts?.reduce((sum: number, d: any) => sum + (d.overdue_count || 0), 0) || 0,
  }

  console.log('[getDebtSummary] Summary:', summary)
  return summary
}

/**
 * Send payment reminder to member
 * OWNER only
 */
export async function sendPaymentReminder(membershipId: string, orgId: string) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  await requireOwner(supabase, user.id, orgId)

  // TODO: Implement email sending logic
  // For now, just log
  console.log('TODO: Send payment reminder to membership:', membershipId)

  return { success: true, message: 'Reminder sent (TODO: implement email)' }
}

