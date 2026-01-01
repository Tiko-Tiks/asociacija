'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'
import { MEMBERSHIP_ROLE, MEMBERSHIP_STATUS } from '@/app/domain/constants'

export interface AuditLog {
  id: string
  org_id: string
  user_id: string
  action: string
  target_table: string
  target_id: string | null
  old_value: any
  new_value: any
  created_at: string
}

export interface AuditLogWithUser extends AuditLog {
  user_email: string | null
}

/**
 * Server Action to list audit logs for an organization.
 * 
 * Rules:
 * - OWNER role only
 * - Read-only (SELECT only)
 * - Sorted by created_at DESC (newest first)
 * 
 * @param org_id - Organization ID
 * @param limit - Number of logs to return (default: 50)
 * @param offset - Offset for pagination (default: 0)
 * @returns Array of audit logs with user email
 */
export async function listAuditLogs(
  org_id: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ logs: AuditLogWithUser[]; total: number }> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Step 1: Verify user is OWNER in this org
  const { data: membership, error: membershipError }: any = await supabase
    .from('memberships')
    .select('id, role, status')
    .eq('user_id', user.id)
    .eq('org_id', org_id)
    .eq('status', MEMBERSHIP_STATUS.ACTIVE)
    .maybeSingle()

  if (membershipError) {
    if (membershipError?.code === '42501') {
      authViolation()
    }
    console.error('Error fetching membership:', membershipError)
    operationFailed()
  }

  if (!membership || membership.role !== MEMBERSHIP_ROLE.OWNER) {
    // Return empty array - caller will show access denied message
    return { logs: [], total: 0 }
  }

  // Step 2: Count total logs for pagination
  const { count, error: countError }: any = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', org_id)

  if (countError) {
    if (countError?.code === '42501') {
      authViolation()
    }
    console.error('Error counting audit logs:', countError)
    operationFailed()
  }

  const total = count || 0

  // Step 3: Fetch audit logs
  const { data: logs, error: logsError }: any = await supabase
    .from('audit_logs')
    .select('*')
    .eq('org_id', org_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (logsError) {
    if (logsError?.code === '42501') {
      authViolation()
    }
    console.error('Error fetching audit logs:', logsError)
    operationFailed()
  }

  if (!logs || logs.length === 0) {
    return { logs: [], total }
  }

  // Step 4: Resolve user emails for all user_ids
  const userIds = [...new Set(logs.map((log: any) => log.user_id))]
  const { data: profiles, error: profilesError }: any = await supabase
    .from('profiles')
    .select('id, email')
    .in('id', userIds)

  if (profilesError) {
    // Log but continue - email resolution is optional
    console.error('Error fetching user emails:', profilesError)
  }

  const emailMap = new Map<string, string>()
  if (profiles) {
    profiles.forEach((profile: any) => {
      emailMap.set(profile.id, profile.email || null)
    })
  }

  // Step 5: Combine logs with user emails
  const logsWithUsers: AuditLogWithUser[] = logs.map((log: any) => ({
    id: log.id,
    org_id: log.org_id,
    user_id: log.user_id,
    action: log.action,
    target_table: log.target_table,
    target_id: log.target_id,
    old_value: log.old_value,
    new_value: log.new_value,
    created_at: log.created_at,
    user_email: emailMap.get(log.user_id) || null,
  }))

  return { logs: logsWithUsers, total }
}

