'use server'

import { createClient } from '@/lib/supabase/server'
import {
  requireAuth,
  loadActiveMembership,
  loadProjectForMembership,
} from '@/app/actions/_guards'
import { authViolation, crossOrgViolation, operationFailed } from '@/app/domain/errors'

export async function listProjectAuditLog(
  project_id: string,
  membership_id: string
): Promise<
  Array<{
    id: string
    created_at: string
    action: string
    actor_user_id: string
    target_user_id: string | null
    meta: Record<string, unknown>
  }>
> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Step 2: Load and validate active membership (SOURCE OF TRUTH)
  // DO NOT accept org_id from client parameters
  const membership = await loadActiveMembership(supabase, membership_id, user.id)

  // Step 3: Load and validate project belongs to same org
  await loadProjectForMembership(supabase, project_id, membership.org_id)

  // Step 4: Query audit logs
  // RLS policies will enforce additional security
  const { data, error }: any = await supabase
    .from('project_audit_logs')
    .select('id, created_at, action, actor_user_id, target_user_id, meta')
    .eq('project_id', project_id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    // Check if error is due to RLS violation
    if (error.code === '42501') {
      authViolation()
    }
    operationFailed()
  }

  return (data as any) ?? []
}

