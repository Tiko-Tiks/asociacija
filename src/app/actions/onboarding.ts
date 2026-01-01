'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'
import { revalidatePath } from 'next/cache'

// ==================================================
// TYPES
// ==================================================

export interface OnboardingReadiness {
  org_id: string
  has_required_org_fields: boolean
  has_bylaws: boolean
  has_governance_required: boolean
  ready_to_submit: boolean
}

export interface ReviewRequest {
  id: string
  org_id: string
  requested_by: string
  status: 'OPEN' | 'NEEDS_CHANGES' | 'APPROVED' | 'REJECTED'
  note: string | null
  admin_note: string | null
  created_at: string
  decided_at: string | null
  decided_by: string | null
}

export interface SubmitOrgForReviewResult {
  success: boolean
  requestId?: string
  error?: string
  details?: {
    has_required_org_fields: boolean
    has_bylaws: boolean
    has_governance_required: boolean
  }
}

// ==================================================
// READINESS CHECK
// ==================================================

/**
 * Get onboarding readiness status for an organization
 */
export async function getOnboardingReadiness(
  orgId: string
): Promise<OnboardingReadiness | null> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase
    .from('org_onboarding_readiness')
    .select('*')
    .eq('org_id', orgId)
    .single()

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error fetching readiness:', error)
    return null
  }

  return data as OnboardingReadiness
}

// ==================================================
// SUBMIT FOR REVIEW
// ==================================================

/**
 * Submit organization for Branduolio admin review
 */
export async function submitOrgForReview(
  orgId: string,
  note?: string
): Promise<SubmitOrgForReviewResult> {
  const supabase = await createClient()
  await requireAuth(supabase)

  // Check compliance before critical action
  const { checkActionAllowed } = await import('./governance-compliance')
  const complianceCheck = await checkActionAllowed(orgId, 'submit_review')
  if (!complianceCheck.allowed) {
    return {
      success: false,
      error: complianceCheck.reason === 'INVALID_COMPLIANCE'
        ? 'Trūksta privalomų nustatymų. Prašome papildyti duomenis prieš pateikiant.'
        : 'Nepavyko patikrinti nustatymų',
      details: {
        has_required_org_fields: false,
        has_bylaws: false,
        has_governance_required: false,
      },
    }
  }

  const { data, error }: any = await supabase.rpc('submit_org_for_review', {
    p_org_id: orgId,
    p_note: note || null,
  })

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error submitting org for review:', error)
    return {
      success: false,
      error: error.message || 'Failed to submit organization for review',
    }
  }

  const result = data?.[0]
  if (!result?.ok) {
    return {
      success: false,
      error: result?.reason || 'Failed to submit organization',
      details: result?.details,
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/onboarding')
  return {
    success: true,
    requestId: result.request_id,
  }
}

// ==================================================
// GET REVIEW REQUEST
// ==================================================

/**
 * Get review request for an organization
 */
export async function getReviewRequest(
  orgId: string
): Promise<ReviewRequest | null> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase
    .from('org_review_requests')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error fetching review request:', error)
    return null
  }

  return data as ReviewRequest | null
}

// ==================================================
// GET ORG STATUS
// ==================================================

/**
 * Get organization status
 */
export async function getOrgStatus(orgId: string): Promise<string | null> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase
    .from('orgs')
    .select('status')
    .eq('id', orgId)
    .single()

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error fetching org status:', error)
    return null
  }

  return data?.status || null
}

