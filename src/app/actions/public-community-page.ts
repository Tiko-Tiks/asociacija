'use server'

import { createPublicClient } from '@/lib/supabase/public'
import { RESOLUTION_STATUS, RESOLUTION_VISIBILITY } from '@/app/domain/constants'

/**
 * Public Community Page Data Actions (B2.1)
 * 
 * Server actions for fetching public community page data.
 * READ-ONLY, public-safe data only.
 * Respects RLS and visibility rules.
 */

export interface PublicEvent {
  id: string
  title: string
  description: string | null
  event_date: string
  location: string | null
  created_at: string
}

export interface PublicResolution {
  id: string
  title: string
  content: string
  adopted_at: string | null
  created_at: string
}

export interface ActivePosition {
  id: string
  title: string
  user_id: string
  full_name: string | null
}

export interface PublicCommunityPageData {
  org: {
    id: string
    name: string
    slug: string
    description: string | null
  }
  activePositions: ActivePosition[]
  publicEvents: PublicEvent[]
  publicResolutions: PublicResolution[]
}

/**
 * Get public community page data in parallel
 * 
 * Fetches:
 * 1. Org details (name, slug, description)
 * 2. Active positions (is_active = true) with user names
 * 3. Public events (is_public = true)
 * 4. Public resolutions (visibility = PUBLIC, status = APPROVED)
 */
export async function getPublicCommunityPageData(
  slug: string
): Promise<PublicCommunityPageData | null> {
  const supabase = createPublicClient()

  // First, get org by slug
  // Note: description column may not exist in orgs table
  const { data: org, error: orgError } = await supabase
    .from('orgs')
    .select('id, name, slug')
    .eq('slug', slug)
    .maybeSingle()

  if (orgError) {
    console.error('Error fetching org:', {
      code: orgError.code,
      message: orgError.message,
      details: orgError.details,
      hint: orgError.hint,
      slug,
    })
    if (orgError.code === '42501') {
      console.error('RLS_BLOCKED: Public access to orgs table is blocked')
      console.error('Solution: Run sql/rls_platform_admin_policies.sql to add anon_select_orgs_public policy')
    }
    return null
  }

  if (!org) {
    console.log('No org found with slug:', slug)
    // Try to find any orgs to help debug
    const { data: anyOrgs } = await supabase
      .from('orgs')
      .select('slug')
      .limit(5)
    console.log('Available org slugs:', anyOrgs?.map((o: any) => o.slug) || [])
    return null
  }

  // Fetch all data in parallel
  const [
    positionsResult,
    eventsResult,
    resolutionsResult,
  ] = await Promise.all([
    // Active positions with user names
    supabase
      .from('positions')
      .select('id, title, user_id')
      .eq('org_id', org.id)
      .eq('is_active', true)
      .then(async (result) => {
        if (result.error) {
          return result
        }
        // Fetch user names separately
        const userIds = (result.data || []).map((p: any) => p.user_id).filter(Boolean)
        if (userIds.length === 0) {
          return result
        }
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds)
        
        // Merge profile data
        const profilesMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]))
        const positionsWithNames = (result.data || []).map((p: any) => ({
          ...p,
          full_name: profilesMap.get(p.user_id) || null,
        }))
        return { data: positionsWithNames, error: null }
      })
      .catch((error) => {
        if (error?.code === '42P01' || error?.code === '42501') {
          return { data: [], error: null }
        }
        return { data: [], error }
      }),

    // Public events
    supabase
      .from('events')
      .select('id, title, description, event_date, location, created_at')
      .eq('org_id', org.id)
      .eq('is_public', true)
      .order('event_date', { ascending: false })
      .limit(10)
      .then((result) => result)
      .catch((error) => {
        if (error?.code === '42P01') {
          return { data: [], error: null }
        }
        return { data: [], error }
      }),

    // Public resolutions (APPROVED only)
    supabase
      .from('resolutions')
      .select('id, title, content, adopted_at, created_at')
      .eq('org_id', org.id)
      .eq('visibility', RESOLUTION_VISIBILITY.PUBLIC)
      .eq('status', RESOLUTION_STATUS.APPROVED)
      .order('adopted_at', { ascending: false })
      .limit(10)
      .then((result) => result)
      .catch((error) => {
        if (error?.code === '42P01') {
          return { data: [], error: null }
        }
        return { data: [], error }
      }),
  ])

  // Handle errors gracefully
  if (positionsResult.error && positionsResult.error.code !== '42P01') {
    console.error('Error fetching positions:', positionsResult.error)
  }
  if (eventsResult.error && eventsResult.error.code !== '42P01') {
    console.error('Error fetching events:', eventsResult.error)
  }
  if (resolutionsResult.error && resolutionsResult.error.code !== '42P01') {
    console.error('Error fetching resolutions:', resolutionsResult.error)
  }

  // Transform positions data
  const activePositions: ActivePosition[] = (positionsResult.data || []).map((pos: any) => ({
    id: pos.id,
    title: pos.title,
    user_id: pos.user_id,
    full_name: pos.full_name || null,
  }))

  // Transform events data
  const publicEvents: PublicEvent[] = (eventsResult.data || []).map((event: any) => ({
    id: event.id,
    title: event.title,
    description: event.description,
    event_date: event.event_date,
    location: event.location,
    created_at: event.created_at,
  }))

  // Transform resolutions data
  const publicResolutions: PublicResolution[] = (resolutionsResult.data || []).map((res: any) => ({
    id: res.id,
    title: res.title,
    content: res.content,
    adopted_at: res.adopted_at,
    created_at: res.created_at,
  }))

  // Description column doesn't exist in orgs table, so always return null
  return {
    org: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      description: null, // Description column doesn't exist in orgs table
    },
    activePositions,
    publicEvents,
    publicResolutions,
  }
}

