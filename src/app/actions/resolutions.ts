'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'
import { MEMBERSHIP_ROLE, MEMBERSHIP_STATUS, RESOLUTION_STATUS, RESOLUTION_VISIBILITY } from '@/app/domain/constants'
import { canPublish } from '@/app/domain/guards/canPublish'
import { requireOrgActive } from '@/app/domain/guards/orgActivation'
import { revalidatePath } from 'next/cache'

export type ResolutionStatus = typeof RESOLUTION_STATUS[keyof typeof RESOLUTION_STATUS]
export type ResolutionVisibility = typeof RESOLUTION_VISIBILITY[keyof typeof RESOLUTION_VISIBILITY]

export interface Resolution {
  id: string
  org_id: string
  title: string
  content: string
  status: ResolutionStatus
  visibility: ResolutionVisibility
  adopted_at: string | null
  adopted_by: string | null
  recommended_at: string | null
  recommended_by: string | null
  created_at: string
  updated_at: string | null
}

/**
 * Server Action to list resolutions for an organization.
 * 
 * Filters by visibility based on user role:
 * - PUBLIC: visible to all authenticated users
 * - MEMBERS: visible to members of the org
 * - INTERNAL: visible to OWNER/ADMIN only
 * 
 * @param org_id - Organization ID
 * @returns Array of resolutions
 */
export async function listResolutions(org_id: string): Promise<Resolution[]> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Get user's membership to check role
  const { data: membership, error: membershipError }: any = await supabase
    .from('memberships')
    .select('id, role, status')
    .eq('user_id', user.id)
    .eq('org_id', org_id)
    .eq('status', MEMBERSHIP_STATUS.ACTIVE)
    .maybeSingle()

  if (membershipError) {
    if (membershipError?.code === '42501') {
      authViolation()
    }
    console.error('Error fetching membership:', membershipError)
    operationFailed()
  }

  if (!membership) {
    return [] // No membership = no access
  }

  const isOwnerOrAdmin = membership.role === MEMBERSHIP_ROLE.OWNER || membership.role === MEMBERSHIP_ROLE.ADMIN

  // Build visibility filter
  let visibilityFilter: string[] = ['PUBLIC', 'MEMBERS']
  if (isOwnerOrAdmin) {
    visibilityFilter.push('INTERNAL')
  }

  // Query resolutions
  const { data: resolutions, error }: any = await supabase
    .from('resolutions')
    .select('*')
    .eq('org_id', org_id)
    .in('visibility', visibilityFilter)
    .order('created_at', { ascending: false })

  if (error) {
    if (error?.code === '42501') {
      authViolation()
    }
    console.error('Error fetching resolutions:', error)
    operationFailed()
  }

  return (resolutions || []).map((r: any) => ({
    id: r.id,
    org_id: r.org_id,
    title: r.title,
    content: r.content,
    status: r.status,
    visibility: r.visibility,
    adopted_at: r.adopted_at,
    adopted_by: r.adopted_by,
    recommended_at: r.recommended_at || null,
    recommended_by: r.recommended_by || null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }))
}

/**
 * Server Action to get a single resolution by ID.
 * 
 * @param resolution_id - Resolution ID
 * @returns Resolution or null if not found
 */
export async function getResolution(resolution_id: string): Promise<Resolution | null> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data: resolution, error }: any = await supabase
    .from('resolutions')
    .select('*')
    .eq('id', resolution_id)
    .single()

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching resolution:', error)
    operationFailed()
  }

  if (!resolution) return null

  return {
    id: resolution.id,
    org_id: resolution.org_id,
    title: resolution.title,
    content: resolution.content,
    status: resolution.status,
    visibility: resolution.visibility,
    adopted_at: resolution.adopted_at,
    adopted_by: resolution.adopted_by,
    recommended_at: resolution.recommended_at || null,
    recommended_by: resolution.recommended_by || null,
    created_at: resolution.created_at,
    updated_at: resolution.updated_at,
  }
}

/**
 * Server Action to create a new resolution.
 * 
 * Rules:
 * - Any authenticated member can create
 * - Default status: DRAFT
 * - Logs to audit_logs
 * 
 * @param org_id - Organization ID
 * @param title - Resolution title
 * @param content - Resolution content
 * @param visibility - Visibility level
 * @param status - Initial status (DRAFT or PROPOSED)
 * @returns Created resolution ID
 */
export async function createResolution(
  org_id: string,
  title: string,
  content: string,
  visibility: ResolutionVisibility,
  status: 'DRAFT' | 'PROPOSED' = 'DRAFT'
): Promise<{ success: boolean; resolutionId?: string; error?: string }> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Step 1: Check org activation (CRITICAL)
  try {
    await requireOrgActive(org_id)
  } catch (error: any) {
    if (error?.code === 'access_denied' || error?.code === 'auth_violation') {
      return { success: false, error: 'Organizacija nėra aktyvi. Prašome užbaigti aktyvacijos procesą.' }
    }
    throw error
  }

  // Validate inputs
  if (!title || title.trim().length === 0) {
    return { success: false, error: 'Pavadinimas yra privalomas' }
  }

  if (!content || content.trim().length === 0) {
    return { success: false, error: 'Turinys yra privalomas' }
  }

  // Verify user has membership in org
  const { data: membership, error: membershipError }: any = await supabase
    .from('memberships')
    .select('id, role, status')
    .eq('user_id', user.id)
    .eq('org_id', org_id)
    .eq('status', MEMBERSHIP_STATUS.ACTIVE)
    .maybeSingle()

  if (membershipError) {
    if (membershipError?.code === '42501') {
      authViolation()
    }
    console.error('Error fetching membership:', membershipError)
    operationFailed()
  }

  if (!membership) {
    return { success: false, error: 'Neturite prieigos prie šios organizacijos' }
  }

  // Insert resolution
  const { data: insertedResolution, error: insertError }: any = await supabase
    .from('resolutions')
    .insert({
      org_id: org_id,
      title: title.trim(),
      content: content.trim(),
      status: status,
      visibility: visibility,
    })
    .select('id, title, status, visibility')

  if (insertError) {
    if (insertError?.code === '42501') {
      authViolation()
    }
    console.error('Error creating resolution:', insertError)
    operationFailed()
  }

  if (!insertedResolution || insertedResolution.length === 0) {
    return { success: false, error: 'Nepavyko sukurti sprendimo' }
  }

  const newResolution = insertedResolution[0]

  // Log to audit
  const { error: auditError }: any = await supabase
    .from('audit_logs')
    .insert({
      org_id: org_id,
      user_id: user.id,
      action: 'RESOLUTION_CREATED',
      target_table: 'resolutions',
      target_id: newResolution.id,
      old_value: null,
      new_value: {
        id: newResolution.id,
        title: newResolution.title,
        status: newResolution.status,
        visibility: newResolution.visibility,
      },
    })

  if (auditError) {
    // SOFT AUDIT MODE: Log incident but don't fail the operation
    console.error('AUDIT INCIDENT: Failed to log RESOLUTION_CREATED:', auditError)
    // Surface for monitoring / incident review
  }

  // Revalidate dashboard pages
  revalidatePath('/dashboard', 'layout')

  return { success: true, resolutionId: newResolution.id }
}

/**
 * Server Action to create a resolution draft (with canPublish check).
 * 
 * Wrapper around createResolution that enforces canPublish guard.
 * Used by Quick Publish modals.
 * 
 * @param orgId - Organization ID
 * @param title - Resolution title
 * @param content - Resolution content
 * @param visibility - Visibility level
 * @param status - Initial status (DRAFT or PROPOSED)
 * @returns Created resolution ID or error
 */
export async function createResolutionDraft(
  orgId: string,
  title: string,
  content: string,
  visibility: ResolutionVisibility,
  status: 'DRAFT' | 'PROPOSED' = 'DRAFT'
): Promise<{ success: boolean; resolutionId?: string; error?: string }> {
  // Step 1: Check publishing permissions
  try {
    await canPublish(orgId)
  } catch (error: any) {
    if (error?.code === 'access_denied' || error?.code === 'auth_violation') {
      return { success: false, error: 'Neturite teisių publikuoti turinį' }
    }
    throw error
  }

  // Step 2: Call existing createResolution
  return await createResolution(orgId, title, content, visibility, status)
}

/**
 * AI Assist: Generate resolution template text
 * 
 * Mock implementation - returns template text
 * 
 * @param orgId - Organization ID
 * @returns Template text for resolution
 */
export async function aiAssistResolution(orgId: string): Promise<{ title: string; content: string }> {
  // Mock AI - returns template
  return {
    title: 'Naujas nutarimas',
    content: 'Šis nutarimas aprašo...',
  }
}

/**
 * Server Action to approve a resolution.
 * 
 * Rules:
 * - OWNER only
 * - Sets adopted_at and adopted_by
 * - Logs to audit_logs
 * 
 * @param org_id - Organization ID
 * @param resolution_id - Resolution ID
 * @returns Success indicator
 */
export async function approveResolution(
  org_id: string,
  resolution_id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Verify user is OWNER
  const { data: membership, error: membershipError }: any = await supabase
    .from('memberships')
    .select('id, role, status')
    .eq('user_id', user.id)
    .eq('org_id', org_id)
    .eq('status', MEMBERSHIP_STATUS.ACTIVE)
    .maybeSingle()

  if (membershipError) {
    if (membershipError?.code === '42501') {
      authViolation()
    }
    console.error('Error fetching membership:', membershipError)
    operationFailed()
  }

  if (!membership || membership.role !== MEMBERSHIP_ROLE.OWNER) {
    return { success: false, error: 'Tik OWNER gali patvirtinti sprendimus' }
  }

  // Fetch current resolution for old_value
  const { data: currentResolution, error: fetchError }: any = await supabase
    .from('resolutions')
    .select('*')
    .eq('id', resolution_id)
    .eq('org_id', org_id)
    .single()

  if (fetchError) {
    if (fetchError?.code === '42501') {
      authViolation()
    }
    console.error('Error fetching resolution:', fetchError)
    operationFailed()
  }

  if (!currentResolution) {
    return { success: false, error: 'Sprendimas nerastas' }
  }

  // Update resolution
  const adoptedAt = new Date().toISOString()
  const { data: updatedResolution, error: updateError }: any = await supabase
    .from('resolutions')
    .update({
      status: RESOLUTION_STATUS.APPROVED,
      adopted_at: adoptedAt,
      adopted_by: user.id,
    })
    .eq('id', resolution_id)
    .eq('org_id', org_id)
    .select('*')

  if (updateError) {
    if (updateError?.code === '42501') {
      authViolation()
    }
    console.error('Error approving resolution:', updateError)
    operationFailed()
  }

  if (!updatedResolution || updatedResolution.length === 0) {
    return { success: false, error: 'Nepavyko patvirtinti sprendimo' }
  }

  // Log to audit
  const oldValue = {
    status: currentResolution.status,
    adopted_at: currentResolution.adopted_at,
    adopted_by: currentResolution.adopted_by,
  }

  const newValue = {
    status: RESOLUTION_STATUS.APPROVED,
    adopted_at: adoptedAt,
    adopted_by: user.id,
  }

  const { error: auditError }: any = await supabase
    .from('audit_logs')
    .insert({
      org_id: org_id,
      user_id: user.id,
      action: 'RESOLUTION_APPROVED',
      target_table: 'resolutions',
      target_id: resolution_id,
      old_value: oldValue,
      new_value: newValue,
    })

  if (auditError) {
    console.error('Error inserting audit log:', auditError)
    // Continue - approval succeeded even if audit fails
  }

  revalidatePath('/dashboard/resolutions')

  return { success: true }
}

/**
 * Server Action to reject a resolution.
 * 
 * Rules:
 * - OWNER only
 * - Logs to audit_logs
 * 
 * @param org_id - Organization ID
 * @param resolution_id - Resolution ID
 * @returns Success indicator
 */
export async function rejectResolution(
  org_id: string,
  resolution_id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Verify user is OWNER
  const { data: membership, error: membershipError }: any = await supabase
    .from('memberships')
    .select('id, role, status')
    .eq('user_id', user.id)
    .eq('org_id', org_id)
    .eq('status', MEMBERSHIP_STATUS.ACTIVE)
    .maybeSingle()

  if (membershipError) {
    if (membershipError?.code === '42501') {
      authViolation()
    }
    console.error('Error fetching membership:', membershipError)
    operationFailed()
  }

  if (!membership || membership.role !== MEMBERSHIP_ROLE.OWNER) {
    return { success: false, error: 'Tik OWNER gali atmesti sprendimus' }
  }

  // Fetch current resolution for old_value
  const { data: currentResolution, error: fetchError }: any = await supabase
    .from('resolutions')
    .select('*')
    .eq('id', resolution_id)
    .eq('org_id', org_id)
    .single()

  if (fetchError) {
    if (fetchError?.code === '42501') {
      authViolation()
    }
    console.error('Error fetching resolution:', fetchError)
    operationFailed()
  }

  if (!currentResolution) {
    return { success: false, error: 'Sprendimas nerastas' }
  }

  // Update resolution
  const { data: updatedResolution, error: updateError }: any = await supabase
    .from('resolutions')
    .update({
      status: RESOLUTION_STATUS.REJECTED,
    })
    .eq('id', resolution_id)
    .eq('org_id', org_id)
    .select('*')

  if (updateError) {
    if (updateError?.code === '42501') {
      authViolation()
    }
    console.error('Error rejecting resolution:', updateError)
    operationFailed()
  }

  if (!updatedResolution || updatedResolution.length === 0) {
    return { success: false, error: 'Nepavyko atmesti sprendimo' }
  }

  // Log to audit
  const oldValue = {
    status: currentResolution.status,
  }

  const newValue = {
    status: RESOLUTION_STATUS.REJECTED,
  }

  const { error: auditError }: any = await supabase
    .from('audit_logs')
    .insert({
      org_id: org_id,
      user_id: user.id,
      action: 'RESOLUTION_REJECTED',
      target_table: 'resolutions',
      target_id: resolution_id,
      old_value: oldValue,
      new_value: newValue,
    })

  if (auditError) {
    console.error('Error inserting audit log:', auditError)
    // Continue - rejection succeeded even if audit fails
  }

  revalidatePath('/dashboard/resolutions')

  return { success: true }
}

