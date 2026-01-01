'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation } from '@/app/domain/errors'

/**
 * Get governance config answers for an organization
 */
export async function getGovernanceConfig(orgId: string): Promise<Record<string, any> | null> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error }: any = await supabase
    .from('governance_configs')
    .select('answers')
    .eq('org_id', orgId)
    .maybeSingle()

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error fetching governance config:', error)
    return null
  }

  return data?.answers || null
}

