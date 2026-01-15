'use server'

import { createClient } from '@/lib/supabase/server'

export interface GovernanceQuestion {
  question_key: string
  question_text: string
  question_type: 'radio' | 'checkbox' | 'text' | 'number' | 'date'
  section: string
  section_order: number
  is_required: boolean
  options?: Array<{ value: string; label: string }>
  depends_on?: string | null
  depends_value?: string | null
  validation_rules?: Record<string, any>
}

/**
 * Get active governance questions for onboarding
 */
export async function getActiveGovernanceQuestions(): Promise<GovernanceQuestion[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('governance_questions')
    .select('*')
    .eq('is_active', true)
    .order('section', { ascending: true })
    .order('section_order', { ascending: true })

  if (error) {
    console.error('Error fetching governance questions:', error)
    // Return empty array if table doesn't exist yet
    if (error.code === '42P01') {
      return []
    }
    return []
  }

  return (data || []).map((q) => ({
    question_key: q.question_key,
    question_text: q.question_text,
    question_type: q.question_type,
    section: q.section,
    section_order: q.section_order,
    is_required: q.is_required,
    options: q.options ? (Array.isArray(q.options) ? q.options : []) : undefined,
    depends_on: q.depends_on || undefined,
    depends_value: q.depends_value || undefined,
    validation_rules: q.validation_rules || undefined,
  }))
}

