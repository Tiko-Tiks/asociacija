/**
 * Meeting Type Definitions
 * 
 * These are the official meeting types supported by the system.
 * Moved from governance.ts to avoid 'use server' export restrictions.
 */

export type MeetingType = 'GA' | 'GA_EXTRAORDINARY' | 'BOARD'

export interface MeetingTypeConfig {
  label: string
  shortLabel: string
  description: string
  requiresQuorum: boolean
  requiresProtocol: boolean
  isExtraordinary: boolean
}

export const MEETING_TYPE_CONFIG: Record<MeetingType, MeetingTypeConfig> = {
  GA: {
    label: 'Visuotinis narių susirinkimas',
    shortLabel: 'VNS',
    description: 'Aukščiausias bendruomenės sprendimų organas. Reikalingas kvorumas, balsavimas, protokolas.',
    requiresQuorum: true,
    requiresProtocol: true,
    isExtraordinary: false,
  },
  GA_EXTRAORDINARY: {
    label: 'Neeilinis visuotinis narių susirinkimas',
    shortLabel: 'Neeilinis VNS',
    description: 'Skubus susirinkimas su ta pačia teisine galia kaip VNS.',
    requiresQuorum: true,
    requiresProtocol: true,
    isExtraordinary: true,
  },
  BOARD: {
    label: 'Valdybos / tarybos posėdis',
    shortLabel: 'Valdybos posėdis',
    description: 'Deleguotos kompetencijos sprendimai. Kvorumas skaičiuojamas tik valdybos nariams.',
    requiresQuorum: true,
    requiresProtocol: true,
    isExtraordinary: false,
  },
} as const

/**
 * Get meeting type label
 */
export function getMeetingTypeLabel(type: MeetingType): string {
  return MEETING_TYPE_CONFIG[type]?.label || type
}

/**
 * Get meeting type short label
 */
export function getMeetingTypeShortLabel(type: MeetingType): string {
  return MEETING_TYPE_CONFIG[type]?.shortLabel || type
}
