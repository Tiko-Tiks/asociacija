'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'
import { revalidatePath } from 'next/cache'

// ==================================================
// v19.0 COMPLIANT PRE-GOVERNANCE IDEAS MODULE
// ==================================================
// ARCHITECTURAL TRUTH:
// 1. Ideas have ZERO legal/procedural power
// 2. Phases are stored in metadata.fact.phase (NOT a column)
// 3. Comments stored in metadata.fact.comments[] (NO separate table)
// 4. Only transition: IDEA → DRAFT resolution
// 5. No voting in this module
// ==================================================

// ==================================================
// TYPES
// ==================================================

export type IdeaPhase = 'draft' | 'discussion' | 'refined' | 'ready_for_vote' | 'abandoned'

export interface IdeaComment {
  id: string
  author_id: string
  author_name: string | null
  created_at: string
  content: string
  is_objection: boolean
  reason: string | null
}

export interface Idea {
  id: string
  org_id: string
  title: string
  summary: string | null
  details: string | null
  status: string
  public_visible: boolean
  created_by: string | null
  created_at: string
  // PRE-GOVERNANCE from metadata.fact.*
  phase: IdeaPhase
  is_snapshot: boolean
  parent_id: string | null
  comments: IdeaComment[]
  promoted_to_resolution_id: string | null
  metadata: Record<string, any>
}

export interface IdeaIndicators {
  comment_count: number
  objection_count: number
  participant_count: number
  last_activity: string | null
  _disclaimer: string
}

export interface CreateIdeaResult {
  success: boolean
  error?: string
  idea_id?: string
}

export interface UpdatePhaseResult {
  success: boolean
  error?: string
}

export interface AddCommentResult {
  success: boolean
  error?: string
  comment_id?: string
}

export interface PromoteToResolutionResult {
  success: boolean
  error?: string
  resolution_id?: string
}

// ==================================================
// HELPER: Transform DB row to Idea interface
// ==================================================

function transformIdea(row: any): Idea {
  const metadata = row.metadata || {}
  const fact = metadata.fact || {}
  
  return {
    id: row.id,
    org_id: row.org_id,
    title: row.title,
    summary: row.summary,
    details: row.details,
    status: row.status,
    public_visible: row.public_visible,
    created_by: row.created_by,
    created_at: row.created_at,
    // PRE-GOVERNANCE from metadata.fact.*
    phase: (fact.phase as IdeaPhase) || 'draft',
    is_snapshot: fact.is_snapshot === true,
    parent_id: fact.parent_id || null,
    comments: fact.comments || [],
    promoted_to_resolution_id: fact.promoted_to_resolution_id || null,
    metadata: metadata,
  }
}

// ==================================================
// SERVER ACTIONS
// ==================================================

/**
 * Create a new idea (draft phase)
 * 
 * v19.0 COMPLIANT: Uses existing ideas table columns.
 * PRE-GOVERNANCE phase stored in metadata.fact.phase.
 */
export async function createIdea(
  orgId: string,
  title: string,
  summary: string,
  details?: string
): Promise<CreateIdeaResult> {
  const supabase = await createClient()
  await requireAuth(supabase)

  // Validate input
  if (!title || !title.trim()) {
    return { success: false, error: 'Pavadinimas yra privalomas' }
  }
  if (!summary || !summary.trim()) {
    return { success: false, error: 'Aprašymas yra privalomas' }
  }

  const { data, error } = await supabase.rpc('rpc_create_idea', {
    p_org_id: orgId,
    p_title: title.trim(),
    p_summary: summary.trim(),
    p_details: details?.trim() || null,
  })

  if (error) {
    console.error('Error creating idea:', error)
    if (error.code === '42501') {
      authViolation()
    }
    return { success: false, error: error.message || 'Nepavyko sukurti idėjos' }
  }

  revalidatePath('/dashboard', 'layout')
  return { success: true, idea_id: data }
}

/**
 * Update idea phase (label only)
 * 
 * v19.0 COMPLIANT: Phase stored in metadata.fact.phase.
 * Phases are labels with no procedural meaning.
 */
export async function updateIdeaPhase(
  ideaId: string,
  newPhase: IdeaPhase
): Promise<UpdatePhaseResult> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase.rpc('rpc_update_idea_phase', {
    p_idea_id: ideaId,
    p_new_phase: newPhase,
  })

  if (error) {
    console.error('Error updating idea phase:', error)
    if (error.code === '42501') {
      authViolation()
    }
    return { success: false, error: error.message || 'Nepavyko pakeisti fazės' }
  }

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

/**
 * Add comment to idea
 * 
 * v19.0 COMPLIANT: Comments stored in metadata.fact.comments[].
 * Comments are append-only, never edited.
 * Objections are semantic markers, not procedural blocks.
 */
export async function addIdeaComment(
  ideaId: string,
  content: string,
  isObjection: boolean = false,
  objectionReason?: string
): Promise<AddCommentResult> {
  const supabase = await createClient()
  await requireAuth(supabase)

  // Validate input
  if (!content || !content.trim()) {
    return { success: false, error: 'Komentaras yra privalomas' }
  }

  // If objection, require reason
  if (isObjection && (!objectionReason || !objectionReason.trim())) {
    return { success: false, error: 'Prieštaravimo priežastis yra privaloma' }
  }

  const { data, error } = await supabase.rpc('rpc_add_idea_comment', {
    p_idea_id: ideaId,
    p_content: content.trim(),
    p_is_objection: isObjection,
    p_objection_reason: objectionReason?.trim() || null,
  })

  if (error) {
    console.error('Error adding comment:', error)
    if (error.code === '42501') {
      authViolation()
    }
    return { success: false, error: error.message || 'Nepavyko pridėti komentaro' }
  }

  revalidatePath('/dashboard', 'layout')
  return { success: true, comment_id: data }
}

/**
 * Promote idea to DRAFT resolution
 * 
 * v19.0 COMPLIANT: Creates DRAFT resolution only.
 * Uses template.type=from_idea and fact.source_idea_id.
 * NO approval, NO adoption, NO legal power.
 */
export async function promoteToResolutionDraft(
  ideaId: string
): Promise<PromoteToResolutionResult> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase.rpc('rpc_promote_idea_to_resolution_draft', {
    p_idea_id: ideaId,
  })

  if (error) {
    console.error('Error promoting to resolution:', error)
    if (error.code === '42501') {
      authViolation()
    }
    return { success: false, error: error.message || 'Nepavyko sukurti rezoliucijos juodraščio' }
  }

  revalidatePath('/dashboard', 'layout')
  return { success: true, resolution_id: data }
}

/**
 * List ideas for organization
 * 
 * v19.0 COMPLIANT: Reads from existing ideas table.
 * PRE-GOVERNANCE data extracted from metadata.fact.*
 */
export async function listIdeas(
  orgId: string,
  includeSnapshots: boolean = false
): Promise<Idea[]> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase
    .from('ideas')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error listing ideas:', error)
    operationFailed()
  }

  // Transform and filter
  const ideas = (data || []).map(transformIdea)
  
  if (!includeSnapshots) {
    return ideas.filter(idea => !idea.is_snapshot)
  }
  
  return ideas
}

/**
 * Get single idea by ID
 */
export async function getIdea(ideaId: string): Promise<Idea | null> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase
    .from('ideas')
    .select('*')
    .eq('id', ideaId)
    .maybeSingle()

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error fetching idea:', error)
    return null
  }

  if (!data) return null

  return transformIdea(data)
}

/**
 * Get idea comments
 * 
 * v19.0 COMPLIANT: Comments are in metadata.fact.comments[]
 */
export async function getIdeaComments(ideaId: string): Promise<IdeaComment[]> {
  const idea = await getIdea(ideaId)
  if (!idea) return []
  return idea.comments
}

/**
 * Get idea indicators (analytics only)
 * 
 * v19.0 COMPLIANT: Analytics from metadata.fact.comments[]
 * These are NOT votes, NOT support signals, just analytics.
 */
export async function getIdeaIndicators(ideaId: string): Promise<IdeaIndicators> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase.rpc('rpc_get_idea_indicators', {
    p_idea_id: ideaId,
  })

  if (error) {
    console.error('Error fetching indicators:', error)
    return {
      comment_count: 0,
      objection_count: 0,
      participant_count: 0,
      last_activity: null,
      _disclaimer: 'Analytics only. No procedural meaning.',
    }
  }

  return data as IdeaIndicators
}

// ==================================================
// PRE-GOVERNANCE: POSITIONS (Support Signals)
// ==================================================
// These are ADVISORY-ONLY, NO procedural power
// NOT voting, NOT approval, NOT decisions
// ==================================================

export type PositionType = 'support' | 'concern' | 'objection'

export interface IdeaPosition {
  user_id: string
  type: PositionType
  note: string | null
  created_at: string
}

export interface PositionsSummary {
  support: number
  concern: number
  objection: number
  total: number
  _disclaimer: string
}

export interface SetPositionResult {
  success: boolean
  error?: string
  position?: IdeaPosition
  action?: 'created' | 'updated'
}

/**
 * Set user's position on an idea
 * 
 * PRE-GOVERNANCE: Advisory-only, no procedural power
 * One position per user per idea (replaces previous)
 * 
 * @param ideaId - Idea UUID
 * @param type - Position type: support | concern | objection
 * @param note - Optional note (required for objection)
 */
export async function setIdeaPosition(
  ideaId: string,
  type: PositionType,
  note?: string
): Promise<SetPositionResult> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase.rpc('rpc_set_idea_position', {
    p_idea_id: ideaId,
    p_type: type,
    p_note: note || null,
  })

  if (error) {
    console.error('Error setting position:', error)
    return { success: false, error: error.message }
  }

  return data as SetPositionResult
}

/**
 * Remove user's position from an idea
 * 
 * PRE-GOVERNANCE: Advisory-only
 */
export async function removeIdeaPosition(ideaId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase.rpc('rpc_remove_idea_position', {
    p_idea_id: ideaId,
  })

  if (error) {
    console.error('Error removing position:', error)
    return { success: false, error: error.message }
  }

  return data as { success: boolean; error?: string }
}

/**
 * Get positions summary for analytics
 * 
 * PRE-GOVERNANCE: Analytics-only, no thresholds, no pass/fail
 */
export async function getIdeaPositionsSummary(ideaId: string): Promise<PositionsSummary> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error } = await supabase.rpc('rpc_get_idea_positions_summary', {
    p_idea_id: ideaId,
  })

  if (error) {
    console.error('Error fetching positions summary:', error)
    return {
      support: 0,
      concern: 0,
      objection: 0,
      total: 0,
      _disclaimer: 'Analytics only. No procedural meaning.',
    }
  }

  return data as PositionsSummary
}

/**
 * Get current user's position on an idea
 * 
 * PRE-GOVERNANCE: Helper to show current position in UI
 */
export async function getCurrentUserPosition(ideaId: string): Promise<IdeaPosition | null> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  const idea = await getIdea(ideaId)
  if (!idea) return null

  const positions = (idea.metadata?.fact?.positions || []) as IdeaPosition[]
  return positions.find(p => p.user_id === user.id) || null
}
