/**
 * Standardized Board Positions and Governing Body Types
 * 
 * Governing body types (from bylaws):
 * - VALDYBA: Management Board
 * - TARYBA: Council
 * - VALDYBA_IR_TARYBA: Both Board and Council
 * - NERA: No collegial governing body
 * 
 * Simplified position system:
 * - CHAIRMAN: Pirmininkas (set during registration)
 * - BOARD_MEMBER: Valdybos/Tarybos narys (assigned during onboarding)
 * - MEMBER: Narys (automatically assigned when registration is approved)
 */

export const GOVERNING_BODY_TYPES = {
  VALDYBA: 'valdyba',
  TARYBA: 'taryba',
  VALDYBA_IR_TARYBA: 'valdyba_ir_taryba',
  NERA: 'nera',
} as const

export type GoverningBodyType = typeof GOVERNING_BODY_TYPES[keyof typeof GOVERNING_BODY_TYPES]

export const GOVERNING_BODY_LABELS: Record<GoverningBodyType, string> = {
  valdyba: 'Valdyba',
  taryba: 'Taryba',
  valdyba_ir_taryba: 'Valdyba ir Taryba',
  nera: 'Nėra kolegialaus valdymo organo',
}

/**
 * Get governing body label
 */
export function getGoverningBodyLabel(type: string): string {
  return GOVERNING_BODY_LABELS[type as GoverningBodyType] || type
}

export const BOARD_POSITION_TYPES = {
  CHAIRMAN: 'CHAIRMAN',
  BOARD_MEMBER: 'BOARD_MEMBER',
  MEMBER: 'MEMBER',
} as const

export type BoardPositionType = keyof typeof BOARD_POSITION_TYPES

export interface BoardPositionConfig {
  label: string
  shortLabel: string
  description: string
  canVote: boolean
  canSign: boolean
  order: number // Display order
  isBoardPosition: boolean // Whether this position is part of the board/council
}

export const BOARD_POSITIONS: Record<BoardPositionType, BoardPositionConfig> = {
  CHAIRMAN: {
    label: 'Pirmininkas',
    shortLabel: 'Pirm.',
    description: 'Bendruomenės pirmininkas, vadovauja susirinkimams',
    canVote: true,
    canSign: true,
    order: 1,
    isBoardPosition: true,
  },
  BOARD_MEMBER: {
    label: 'Valdybos/Tarybos narys',
    shortLabel: 'Valdyba',
    description: 'Valdybos arba tarybos narys',
    canVote: true,
    canSign: false,
    order: 2,
    isBoardPosition: true,
  },
  MEMBER: {
    label: 'Narys',
    shortLabel: 'Narys',
    description: 'Bendruomenės narys',
    canVote: true,
    canSign: false,
    order: 10,
    isBoardPosition: false,
  },
} as const

/**
 * Get sorted board positions for display
 */
export function getSortedBoardPositions(): Array<{ type: BoardPositionType; config: BoardPositionConfig }> {
  return Object.entries(BOARD_POSITIONS)
    .map(([type, config]) => ({ type: type as BoardPositionType, config }))
    .sort((a, b) => a.config.order - b.config.order)
}

/**
 * Get only board/council positions (excludes regular MEMBER)
 */
export function getBoardOnlyPositions(): Array<{ type: BoardPositionType; config: BoardPositionConfig }> {
  return getSortedBoardPositions().filter(p => p.config.isBoardPosition)
}

/**
 * Get position label by type
 */
export function getPositionLabel(positionType: string): string {
  const config = BOARD_POSITIONS[positionType as BoardPositionType]
  return config?.label || positionType
}

/**
 * Get position short label by type
 */
export function getPositionShortLabel(positionType: string): string {
  const config = BOARD_POSITIONS[positionType as BoardPositionType]
  return config?.shortLabel || positionType
}

/**
 * Check if position type is valid
 */
export function isValidPositionType(positionType: string): positionType is BoardPositionType {
  return positionType in BOARD_POSITIONS
}

/**
 * Check if position is a board position
 */
export function isBoardPosition(positionType: string): boolean {
  const config = BOARD_POSITIONS[positionType as BoardPositionType]
  return config?.isBoardPosition ?? false
}

/**
 * Get positions that can vote in board meetings
 * (Only CHAIRMAN and BOARD_MEMBER vote in board meetings)
 */
export function getBoardVotingPositions(): BoardPositionType[] {
  return Object.entries(BOARD_POSITIONS)
    .filter(([_, config]) => config.canVote && config.isBoardPosition)
    .map(([type]) => type as BoardPositionType)
}

/**
 * Map legacy position titles to standardized types
 * This helps migrate from free-text positions to standardized ones
 */
export function mapLegacyPositionTitle(title: string): BoardPositionType | null {
  const normalized = title.toLowerCase().trim()
  
  if (normalized.includes('pirminink')) {
    return 'CHAIRMAN'
  }
  if (normalized.includes('board') || normalized.includes('valdyb') || normalized.includes('taryb')) {
    return 'BOARD_MEMBER'
  }
  if (normalized.includes('narys') || normalized.includes('member')) {
    return 'MEMBER'
  }
  
  return null
}
