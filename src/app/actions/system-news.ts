'use server'

import { createClient } from '@/lib/supabase/server'
import { RESOLUTION_STATUS, RESOLUTION_VISIBILITY } from '@/app/domain/constants'

/**
 * System News from Branduolys Organization
 * 
 * Fetches the latest announcements/news from the official platform organization.
 * These are displayed in a special widget on all community dashboards.
 */

export interface SystemNewsItem {
  id: string
  type: 'EVENT' | 'RESOLUTION'
  title: string
  content: string | null
  created_at: string
  event_date?: string
  adopted_at?: string | null
}

/**
 * Get latest system news from Branduolys organization
 * 
 * Fetches:
 * - Latest 3 public events from branduolys org
 * - Latest 3 public resolutions from branduolys org
 * 
 * Returns combined and sorted list (newest first)
 */
export async function getSystemNews(): Promise<SystemNewsItem[]> {
  const supabase = await createClient()

  try {
    // First, find branduolys org
    const { data: branduolysOrg, error: orgError } = await supabase
      .from('orgs')
      .select('id')
      .in('slug', ['branduolys', 'platform'])
      .maybeSingle()

    if (orgError || !branduolysOrg) {
      // Branduolys org doesn't exist yet - return empty array
      console.log('System News: Branduolys org not found')
      return []
    }

    // Fetch events and resolutions in parallel
    const [eventsResult, resolutionsResult] = await Promise.all([
      // Public events from branduolys
      supabase
        .from('events')
        .select('id, title, description, created_at, event_date')
        .eq('org_id', branduolysOrg.id)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(3)
        .then((result) => result)
        .catch((error) => {
          if (error?.code === '42P01') {
            // Table doesn't exist
            return { data: [], error: null }
          }
          return { data: [], error }
        }),

      // Public resolutions from branduolys
      supabase
        .from('resolutions')
        .select('id, title, content, created_at, adopted_at')
        .eq('org_id', branduolysOrg.id)
        .eq('visibility', RESOLUTION_VISIBILITY.PUBLIC)
        .eq('status', RESOLUTION_STATUS.APPROVED)
        .order('adopted_at', { ascending: false })
        .limit(3)
        .then((result) => result)
        .catch((error) => {
          if (error?.code === '42P01') {
            // Table doesn't exist
            return { data: [], error: null }
          }
          return { data: [], error }
        }),
    ])

    // Combine and transform results
    const newsItems: SystemNewsItem[] = []

    // Add events
    if (eventsResult.data) {
      eventsResult.data.forEach((event: any) => {
        newsItems.push({
          id: event.id,
          type: 'EVENT',
          title: event.title,
          content: event.description,
          created_at: event.created_at,
          event_date: event.event_date,
        })
      })
    }

    // Add resolutions
    if (resolutionsResult.data) {
      resolutionsResult.data.forEach((resolution: any) => {
        newsItems.push({
          id: resolution.id,
          type: 'RESOLUTION',
          title: resolution.title,
          content: resolution.content,
          created_at: resolution.created_at,
          adopted_at: resolution.adopted_at,
        })
      })
    }

    // Sort by created_at DESC (newest first)
    newsItems.sort((a, b) => {
      const dateA = a.adopted_at || a.event_date || a.created_at
      const dateB = b.adopted_at || b.event_date || b.created_at
      return new Date(dateB).getTime() - new Date(dateA).getTime()
    })

    // Return top 3
    return newsItems.slice(0, 3)
  } catch (error) {
    console.error('Error fetching system news:', error)
    return []
  }
}

