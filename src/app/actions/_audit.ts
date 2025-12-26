'use server'

import { createClient } from '@/lib/supabase/server'
import { PROJECT_AUDIT_ACTION } from '@/app/domain/constants'

export async function logProjectAudit(params: {
  project_id: string
  actor_user_id: string
  target_user_id?: string
  action: (typeof PROJECT_AUDIT_ACTION)[keyof typeof PROJECT_AUDIT_ACTION]
  meta?: Record<string, unknown>
}) {
  const supabase = await createClient()
  await (supabase.from('project_audit_logs') as any).insert({
    project_id: params.project_id,
    actor_user_id: params.actor_user_id,
    target_user_id: params.target_user_id ?? null,
    action: params.action,
    meta: params.meta ?? {},
  })
}

