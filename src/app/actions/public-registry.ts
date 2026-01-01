'use server'

import { createPublicClient } from '@/lib/supabase/public'

/**
 * Public Registry Actions
 * 
 * Fetches public data for the Accredited Nodes Registry.
 * Uses anonymous Supabase client - no authentication required.
 * 
 * Security Rules:
 * - Only public fields: name, slug, municipality, status
 * - NEVER select emails or private data
 * - RLS enforced
 */

export interface PublicOrganization {
  id: string
  name: string
  slug: string
  status: string | null
}

/**
 * Get public list of organizations for the registry
 * 
 * Returns all organizations that are publicly visible.
 * 
 * Note: status column does not exist in orgs table - returns all orgs
 */
export async function getPublicOrganizationsRegistry(): Promise<PublicOrganization[]> {
  const supabase = createPublicClient()

  const { data: orgs, error } = await supabase
    .from('orgs')
    .select('id, name, slug')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching public organizations registry:', error)
    return []
  }

  return (orgs || []).map((org: any) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    status: null, // Status column doesn't exist
  }))
}

