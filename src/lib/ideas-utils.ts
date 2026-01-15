/**
 * v19.0 COMPLIANT PRE-GOVERNANCE Ideas Module - Client-side utilities
 * 
 * ARCHITECTURAL TRUTH:
 * - Phases are stored in metadata.fact.phase (NOT a column)
 * - Phases are LABELS only, no procedural meaning
 * - No green/success colors for phases
 * - ready_for_vote uses WARNING color (amber)
 */

export type IdeaPhase = 'draft' | 'discussion' | 'refined' | 'ready_for_vote' | 'abandoned'

/**
 * Phase transition rules
 * 
 * PRE-GOVERNANCE: Phases are LABELS only, no procedural meaning.
 */
export const PHASE_TRANSITIONS: Record<IdeaPhase, IdeaPhase[]> = {
  draft: ['discussion', 'abandoned'],
  discussion: ['refined', 'draft', 'abandoned'],
  refined: ['discussion', 'ready_for_vote', 'draft', 'abandoned'],
  ready_for_vote: ['refined', 'discussion', 'abandoned'],
  abandoned: [], // Terminal state
}

/**
 * Phase display configuration
 * 
 * PRE-GOVERNANCE colors:
 * - No green/success colors
 * - No checkmarks
 * - ready_for_vote uses WARNING color (amber)
 */
export const PHASE_CONFIG: Record<IdeaPhase, {
  label: string
  color: string
  bgColor: string
  borderColor: string
  description: string
}> = {
  draft: {
    label: 'Juodraštis',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    description: 'Pradinė idėjos versija',
  },
  discussion: {
    label: 'Diskusija',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Vyksta diskusija',
  },
  refined: {
    label: 'Patobulinta',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    description: 'Idėja patobulinta po diskusijos',
  },
  ready_for_vote: {
    label: 'Paruošta sprendimui',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    description: 'Gali būti konvertuota į DRAFT rezoliuciją. Tai nėra patvirtinimas.',
  },
  abandoned: {
    label: 'Atsisakyta',
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    description: 'Idėja nebevystoma',
  },
}

/**
 * Get allowed phase transitions for current phase
 */
export function getAllowedTransitions(currentPhase: IdeaPhase): IdeaPhase[] {
  return PHASE_TRANSITIONS[currentPhase] || []
}

/**
 * Map v19 status column to PRE-GOVERNANCE display
 * 
 * Note: This is for backwards compatibility.
 * Primary source of truth is metadata.fact.phase
 */
export function statusToPhaseHint(status: string): IdeaPhase {
  switch (status) {
    case 'DRAFT':
      return 'draft'
    case 'OPEN':
      return 'discussion'
    case 'FAILED':
      return 'abandoned'
    default:
      return 'draft'
  }
}
