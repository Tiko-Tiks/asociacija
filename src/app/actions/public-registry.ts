'use server'

import { createPublicClient } from '@/lib/supabase/public'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'

/**
 * ==================================================
 * PUBLIC ORGANIZATIONS REGISTRY
 * ==================================================
 *
 * Public list of active organizations for landing page.
 * No authentication required.
 *
 * ==================================================
 */

export interface PublicOrganization {
  id: string
  name: string
  slug: string
  status: 'ACTIVE' | 'PILOT'
}

/**
 * Get public list of active organizations for registry display.
 * 
 * Returns only ACTIVE organizations (public-facing).
 * No authentication required.
 * 
 * NOTE: metadata column does NOT exist in orgs table (schema frozen v19.0)
 */
export async function getPublicOrganizationsRegistry(): Promise<PublicOrganization[]> {
  const supabase = createPublicClient()

  // NOTE: metadata column does NOT exist in orgs table (schema frozen v19.0)
  const { data, error } = await supabase
    .from('orgs')
    .select('id, name, slug, status')
    .eq('status', 'ACTIVE')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching public organizations registry:', error)
    // Return empty array on error (graceful degradation)
    return []
  }

  return (data || []).map((org: any) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    // NOTE: PILOT status detection removed - metadata column does not exist
    status: 'ACTIVE' as const,
  }))
}

/**
 * ==================================================
 * PROJECTS REGISTRY — v19.0 (CANONICAL)
 * ==================================================
 *
 * READ-ONLY operational registry.
 *
 * PROJECT := APPROVED RESOLUTION
 *            + resolutions.metadata.project exists
 *
 * No CRUD.
 * No legal authority.
 * No independent lifecycle.
 *
 * Source of truth:
 * - resolutions.status = 'APPROVED'
 * - resolutions.metadata.project
 *
 * ==================================================
 */

export type ProjectPhase =
  | 'planned'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled'

export interface ProjectRegistryItem {
  resolution_id: string
  org_id: string
  title: string
  approved_at: string
  project: {
    code?: string
    phase?: ProjectPhase
    tags?: string[]
    legacy_id?: string
  }
  indicator?: {
    progress?: number
    budget_planned?: number
    budget_spent?: number
  }
}

/**
 * List projects derived from APPROVED resolutions.
 */
export async function listProjectsRegistry(
  orgId: string
): Promise<ProjectRegistryItem[]> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase
    .from('resolutions')
    .select(
      `
      id,
      org_id,
      title,
      approved_at,
      metadata
    `
    )
    .eq('org_id', orgId)
    .eq('status', 'APPROVED')
    .not('metadata->project', 'is', null)
    .order('approved_at', { ascending: false })

  if (error) {
    if (error.code === '42501') authViolation()
    console.error('Error listing projects registry:', error)
    operationFailed()
  }

  return (data || []).map((row: any) => ({
    resolution_id: row.id,
    org_id: row.org_id,
    title: row.title,
    approved_at: row.approved_at,
    project: row.metadata?.project || {},
    indicator: row.metadata?.indicator || {},
  }))
}
