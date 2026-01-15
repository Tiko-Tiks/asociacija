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

  try {
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
      // If positions table doesn't exist, RLS blocks, or network error, return false
      // Don't log network errors (500 from Cloudflare) as they're not actionable
      if (error.code !== 'PGRST301' && !error.message?.includes('500')) {
        console.error('Error checking board position:', error.message || error.code)
      }
      return false
    }

    return (positions?.length || 0) > 0
  } catch (error: any) {
    // Catch any unexpected errors (network, parsing, etc.)
    // If it's a network/Cloudflare error, silently return false
    if (error?.message?.includes('500') || error?.message?.includes('Internal server error')) {
      return false
    }
    console.error('Unexpected error checking board position:', error)
    return false
  }
}

