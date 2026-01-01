'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'

/**
 * Get vote ID for a resolution in a meeting
 */
export async function getVoteIdByResolution(
  meetingId: string,
  resolutionId: string
): Promise<string | null> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase
    .from('votes')
    .select('id')
    .eq('meeting_id', meetingId)
    .eq('resolution_id', resolutionId)
    .eq('kind', 'GA')
    .maybeSingle()

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error fetching vote:', error)
    return null
  }

  return data?.id || null
}

