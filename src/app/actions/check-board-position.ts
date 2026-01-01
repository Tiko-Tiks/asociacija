'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation } from '@/app/domain/errors'

/**
 * Check if user has BOARD position in organization
 * 
 * Uses positions table: org_id, user_id, title, is_active
 * Checks for position with title containing 'BOARD' or exact match
 * 
 * @param orgId - Organization ID
 * @returns true if user has active BOARD position
 */
export async function checkBoardPosition(orgId: string): Promise<boolean> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Query for BOARD position
  const { data: positions, error } = await supabase
    .from('positions')
    .select('id')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .ilike('title', '%BOARD%')
    .limit(1)

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    // If positions table doesn't exist or RLS blocks, return false
    console.error('Error checking board position:', error)
    return false
  }

  return (positions?.length || 0) > 0
}

