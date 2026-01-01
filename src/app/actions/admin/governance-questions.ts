'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export interface GovernanceQuestion {
  id: string
  question_key: string
  question_text: string
  question_type: 'radio' | 'checkbox' | 'text' | 'number'
  section: string
  section_order: number
  is_required: boolean
  options?: Array<{ value: string; label: string }>
  depends_on?: string | null
  depends_value?: string | null
  validation_rules?: Record<string, any>
  is_active: boolean
  created_at: string
  updated_at?: string | null
}

export interface CreateQuestionData {
  question_key: string
  question_text: string
  question_type: 'radio' | 'checkbox' | 'text' | 'number'
  section: string
  section_order: number
  is_required?: boolean
  options?: Array<{ value: string; label: string }>
  depends_on?: string | null
  depends_value?: string | null
  validation_rules?: Record<string, any>
}

/**
 * Get all governance questions (admin only)
 */
export async function getAllGovernanceQuestions(): Promise<GovernanceQuestion[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('governance_questions')
    .select('*')
    .order('section', { ascending: true })
    .order('section_order', { ascending: true })

  if (error) {
    console.error('Error fetching governance questions:', error)
    return []
  }

  return (data || []).map((q) => ({
    ...q,
    options: q.options ? (Array.isArray(q.options) ? q.options : []) : undefined,
    validation_rules: q.validation_rules || undefined,
  }))
}

/**
 * Create a new governance question
 */
export async function createGovernanceQuestion(
  data: CreateQuestionData
): Promise<{ success: boolean; error?: string; id?: string }> {
  const supabase = createAdminClient()

  // Validate
  if (!data.question_key || !data.question_text || !data.question_type || !data.section) {
    return { success: false, error: 'Trūksta privalomų laukų' }
  }

  // Check if question_key already exists
  const { data: existing } = await supabase
    .from('governance_questions')
    .select('id')
    .eq('question_key', data.question_key)
    .maybeSingle()

  if (existing) {
    return { success: false, error: 'Klausimas su šiuo raktu jau egzistuoja' }
  }

  const { data: newQuestion, error } = await supabase
    .from('governance_questions')
    .insert({
      question_key: data.question_key,
      question_text: data.question_text,
      question_type: data.question_type,
      section: data.section,
      section_order: data.section_order,
      is_required: data.is_required ?? true,
      options: data.options || null,
      depends_on: data.depends_on || null,
      depends_value: data.depends_value || null,
      validation_rules: data.validation_rules || null,
      is_active: true,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating governance question:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin')
  return { success: true, id: newQuestion.id }
}

/**
 * Update a governance question
 */
export async function updateGovernanceQuestion(
  id: string,
  data: Partial<CreateQuestionData>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  const updateData: any = {}
  if (data.question_text !== undefined) updateData.question_text = data.question_text
  if (data.question_type !== undefined) updateData.question_type = data.question_type
  if (data.section !== undefined) updateData.section = data.section
  if (data.section_order !== undefined) updateData.section_order = data.section_order
  if (data.is_required !== undefined) updateData.is_required = data.is_required
  if (data.options !== undefined) updateData.options = data.options || null
  if (data.depends_on !== undefined) updateData.depends_on = data.depends_on || null
  if (data.depends_value !== undefined) updateData.depends_value = data.depends_value || null
  if (data.validation_rules !== undefined) updateData.validation_rules = data.validation_rules || null
  updateData.updated_at = new Date().toISOString()

  const { error } = await supabase
    .from('governance_questions')
    .update(updateData)
    .eq('id', id)

  if (error) {
    console.error('Error updating governance question:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin')
  return { success: true }
}

/**
 * Delete a governance question
 */
export async function deleteGovernanceQuestion(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  // Soft delete by setting is_active = false
  const { error } = await supabase
    .from('governance_questions')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('Error deleting governance question:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin')
  return { success: true }
}

/**
 * Reorder questions within a section
 */
export async function reorderQuestions(
  updates: Array<{ id: string; section_order: number }>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  // Update each question's order
  for (const update of updates) {
    const { error } = await supabase
      .from('governance_questions')
      .update({ section_order: update.section_order, updated_at: new Date().toISOString() })
      .eq('id', update.id)

    if (error) {
      console.error('Error reordering questions:', error)
      return { success: false, error: error.message }
    }
  }

  revalidatePath('/admin')
  return { success: true }
}

