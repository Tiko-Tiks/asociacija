'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'

/**
 * Server Action to fetch active positions for organization members.
 * 
 * Schema v17.0: positions table
 * - org_id: UUID (foreign key to orgs)
 * - user_id: UUID (foreign key to profiles)
 * - title: string (position title)
 * - is_active: boolean
 * 
 * @param org_id - Organization ID
 * @param user_ids - Array of user IDs to fetch positions for
 * @returns Map of user_id -> array of position titles
 */
export async function getActivePositions(
  org_id: string,
  user_ids: string[]
): Promise<Map<string, string[]>> {
  if (!user_ids || user_ids.length === 0) {
    return new Map()
  }

  const supabase = await createClient()
  await requireAuth(supabase)

  // Query active positions for the org and users
  const { data: positions, error }: any = await supabase
    .from('positions')
    .select('user_id, title')
    .eq('org_id', org_id)
    .eq('is_active', true)
    .in('user_id', user_ids)

  if (error) {
    if (error?.code === '42501') {
      authViolation()
    }
    console.error('Error fetching positions:', error)
    operationFailed()
  }

  // Group positions by user_id
  const positionsMap = new Map<string, string[]>()
  
  if (positions) {
    for (const position of positions) {
      const userId = position.user_id
      if (!positionsMap.has(userId)) {
        positionsMap.set(userId, [])
      }
      positionsMap.get(userId)!.push(position.title)
    }
  }

  return positionsMap
}

