'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation } from '@/app/domain/errors'

/**
 * Auto-abstain for remote voters who didn't vote on all questions
 * Called when meeting is completed
 */
export async function autoAbstainForRemoteVoters(
  meetingId: string
): Promise<{
  success: boolean
  abstainCount?: number
  error?: string
}> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase.rpc('auto_abstain_for_remote_voters', {
    p_meeting_id: meetingId,
  })

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error calling auto_abstain_for_remote_voters:', error)
    return {
      success: false,
      error: error.message || 'Nepavyko automatiškai užregistruoti susilaikymų',
    }
  }

  const result = data?.[0]
  if (!result?.ok) {
    return {
      success: false,
      error: result?.reason || 'Nepavyko automatiškai užregistruoti susilaikymų',
    }
  }

  return {
    success: true,
    abstainCount: result.abstain_count || 0,
  }
}

