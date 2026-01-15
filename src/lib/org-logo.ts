/**
 * Organization Logo Helper
 * 
 * Provides functions to get organization logo URL for use in documents, PDFs, etc.
 */

import { createClient } from '@/lib/supabase/server'

/**
 * Get organization logo URL by org ID
 * 
 * @param orgId - Organization ID
 * @returns Logo URL or null if not set
 */
export async function getOrgLogoUrl(orgId: string): Promise<string | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('orgs')
    .select('logo_url')
    .eq('id', orgId)
    .single()

  if (error || !data) {
    return null
  }

  return data.logo_url || null
}

/**
 * Get organization logo URL by org slug
 * 
 * @param orgSlug - Organization slug
 * @returns Logo URL or null if not set
 */
export async function getOrgLogoUrlBySlug(orgSlug: string): Promise<string | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('orgs')
    .select('logo_url')
    .eq('slug', orgSlug)
    .single()

  if (error || !data) {
    return null
  }

  return data.logo_url || null
}

/**
 * Get organization logo URL and name
 * 
 * @param orgId - Organization ID
 * @returns Object with logo_url and name, or null
 */
export async function getOrgLogoInfo(orgId: string): Promise<{
  logo_url: string | null
  name: string | null
} | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('orgs')
    .select('logo_url, name')
    .eq('id', orgId)
    .single()

  if (error || !data) {
    return null
  }

  return {
    logo_url: data.logo_url || null,
    name: data.name || null,
  }
}

