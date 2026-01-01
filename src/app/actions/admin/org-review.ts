'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '../_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'
import { revalidatePath } from 'next/cache'

// ==================================================
// TYPES
// ==================================================

export interface OrgReviewRequest {
  id: string
  org_id: string
  org_name: string
  org_slug: string
  requested_by: string
  requester_name: string | null
  requester_email: string | null
  status: 'OPEN' | 'NEEDS_CHANGES' | 'APPROVED' | 'REJECTED'
  note: string | null
  admin_note: string | null
  created_at: string
  decided_at: string | null
  decided_by: string | null
}

// ==================================================
// LIST REQUESTS
// ==================================================

/**
 * Get all review requests (for platform admin)
 */
export async function listOrgReviewRequests(): Promise<OrgReviewRequest[]> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error }: any = await supabase
    .from('org_review_requests')
    .select(`
      *,
      orgs:org_id (
        name,
        slug
      ),
      requester:requested_by (
        id,
        email,
        raw_user_meta_data
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error listing review requests:', error)
    return []
  }

  return (data || []).map((req: any) => ({
    id: req.id,
    org_id: req.org_id,
    org_name: req.orgs?.name || 'Unknown',
    org_slug: req.orgs?.slug || '',
    requested_by: req.requested_by,
    requester_name: req.requester?.raw_user_meta_data?.full_name || null,
    requester_email: req.requester?.email || null,
    status: req.status,
    note: req.note,
    admin_note: req.admin_note,
    created_at: req.created_at,
    decided_at: req.decided_at,
    decided_by: req.decided_by,
  }))
}

// ==================================================
// ADMIN ACTIONS
// ==================================================

/**
 * Request changes (admin action)
 */
export async function requestOrgChanges(
  requestId: string,
  adminNote: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error }: any = await supabase.rpc('request_org_changes', {
    p_request_id: requestId,
    p_admin_note: adminNote,
  })

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error requesting changes:', error)
    return {
      success: false,
      error: error.message || 'Failed to request changes',
    }
  }

  const result = data?.[0]
  if (!result?.ok) {
    return {
      success: false,
      error: result?.reason || 'Failed to request changes',
    }
  }

  revalidatePath('/admin/org-requests')
  return { success: true }
}

/**
 * Approve organization (admin action)
 */
export async function approveOrg(
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error }: any = await supabase.rpc('approve_org', {
    p_request_id: requestId,
  })

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error approving org:', error)
    return {
      success: false,
      error: error.message || 'Failed to approve organization',
    }
  }

  const result = data?.[0]
  if (!result?.ok) {
    return {
      success: false,
      error: result?.reason || 'Failed to approve organization',
    }
  }

  revalidatePath('/admin/org-requests')
  return { success: true }
}

/**
 * Reject organization (admin action)
 */
export async function rejectOrg(
  requestId: string,
  adminNote: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error }: any = await supabase.rpc('reject_org', {
    p_request_id: requestId,
    p_admin_note: adminNote,
  })

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error rejecting org:', error)
    return {
      success: false,
      error: error.message || 'Failed to reject organization',
    }
  }

  const result = data?.[0]
  if (!result?.ok) {
    return {
      success: false,
      error: result?.reason || 'Failed to reject organization',
    }
  }

  revalidatePath('/admin/org-requests')
  return { success: true }
}

