'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

/**
 * Branduolys Organization Content Management
 * 
 * Manages content for the branduolys organization itself.
 * Uses admin client to bypass RLS.
 */

export interface BranduolysContent {
  id: string
  name: string
  slug: string
  description: string | null
  status: string | null
  created_at: string | null
  // Add more fields as needed for branduolys org content
}

/**
 * Get branduolys organization details
 */
export async function getBranduolysOrg(): Promise<BranduolysContent | null> {
  const supabase = createAdminClient()

  // Find branduolys org by slug
  // Type assertion needed due to Supabase TypeScript inference limitations
  const { data: org, error }: any = await supabase
    .from('orgs')
    .select('id, name, slug, status, created_at, description')
    .in('slug', ['branduolys', 'platform'])
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error fetching branduolys org:', error)
    return null
  }

  if (!org) {
    return null
  }

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    description: org.description || null,
    status: org.status,
    created_at: org.created_at,
  }
}

/**
 * Update branduolys organization
 */
export async function updateBranduolysOrg(
  updates: Partial<BranduolysContent>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  // Find branduolys org
  // Type assertion needed due to Supabase TypeScript inference limitations
  const { data: org }: any = await supabase
    .from('orgs')
    .select('id')
    .in('slug', ['branduolys', 'platform'])
    .limit(1)
    .maybeSingle()

  if (!org) {
    return { success: false, error: 'Branduolys organization not found' }
  }

  // Update org
  // Type assertion needed due to Supabase TypeScript inference limitations
  const { error }: any = await (supabase
    .from('orgs') as any)
    .update({
      name: updates.name,
      description: updates.description || null,
    })
    .eq('id', org.id)

  if (error) {
    console.error('Error updating branduolys org:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin')
  revalidatePath('/')
  return { success: true }
}

/**
 * Get landing page content
 * 
 * This would typically come from a content management table.
 * For now, returns placeholder structure.
 */
export interface LandingPageContent {
  heroTitle: string
  heroSubtitle: string
  definitionTitle: string
  definitionContent: string
  processSteps: Array<{ title: string; description: string }>
  legalBaseTitle: string
  legalBaseContent: string
}

export async function getLandingPageContent(): Promise<LandingPageContent> {
  const supabase = createAdminClient()

  // Fetch from system_config table
  // Type assertion needed due to Supabase TypeScript inference limitations
  const { data: config, error }: any = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'landing_page_content')
    .maybeSingle()

  if (error) {
    // If table doesn't exist, return defaults
    if (error.code === '42P01' || error.code === 'PGRST205') {
      console.warn('system_config table does not exist, returning defaults')
      return {
        heroTitle: 'Bendruomenių Branduolys',
        heroSubtitle: 'Lietuvos bendruomenių valdymo platforma',
        definitionTitle: 'Kas tai yra?',
        definitionContent: 'Bendruomenių Branduolys yra...',
        processSteps: [],
        legalBaseTitle: 'Teisinis Pamatas',
        legalBaseContent: 'Platforma veikia pagal...',
      }
    }
    console.error('Error fetching landing page content:', error)
    // Return defaults on error
    return {
      heroTitle: 'Bendruomenių Branduolys',
      heroSubtitle: 'Lietuvos bendruomenių valdymo platforma',
      definitionTitle: 'Kas tai yra?',
      definitionContent: 'Bendruomenių Branduolys yra...',
      processSteps: [],
      legalBaseTitle: 'Teisinis Pamatas',
      legalBaseContent: 'Platforma veikia pagal...',
    }
  }

  if (config?.value) {
    // Parse JSONB value
    const content = config.value as any
    return {
      heroTitle: content.heroTitle || 'Bendruomenių Branduolys',
      heroSubtitle: content.heroSubtitle || 'Lietuvos bendruomenių valdymo platforma',
      definitionTitle: content.definitionTitle || 'Kas tai yra?',
      definitionContent: content.definitionContent || 'Bendruomenių Branduolys yra...',
      processSteps: content.processSteps || [],
      legalBaseTitle: content.legalBaseTitle || 'Teisinis Pamatas',
      legalBaseContent: content.legalBaseContent || 'Platforma veikia pagal...',
    }
  }

  // Return defaults if no config found
  return {
    heroTitle: 'Bendruomenių Branduolys',
    heroSubtitle: 'Lietuvos bendruomenių valdymo platforma',
    definitionTitle: 'Kas tai yra?',
    definitionContent: 'Bendruomenių Branduolys yra...',
    processSteps: [],
    legalBaseTitle: 'Teisinis Pamatas',
    legalBaseContent: 'Platforma veikia pagal...',
  }
}

/**
 * Update landing page content
 */
export async function updateLandingPageContent(
  content: Partial<LandingPageContent>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  // Get current user for updated_by
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get current content to merge
  const currentContent = await getLandingPageContent()

  // Merge with new content
  const updatedContent: LandingPageContent = {
    ...currentContent,
    ...content,
  }

  // Upsert into system_config table
  const { error } = await supabase
    .from('system_config')
    .upsert(
      {
        key: 'landing_page_content',
        value: updatedContent,
        updated_at: new Date().toISOString(),
        updated_by: user?.id || null,
      },
      {
        onConflict: 'key',
      }
    )

  if (error) {
    // If table doesn't exist, log but don't fail
    if (error.code === '42P01' || error.code === 'PGRST205') {
      console.error(
        'system_config table does not exist. Please run sql/create_landing_content_table.sql'
      )
      return {
        success: false,
        error: 'Content management table not configured. Please create system_config table.',
      }
    }
    console.error('Error updating landing page content:', error)
    return { success: false, error: error.message }
  }

  // Revalidate pages
  revalidatePath('/')
  revalidatePath('/admin')

  return { success: true }
}

