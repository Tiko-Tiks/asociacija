import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================
// Lithuanian Date Formatting Utilities
// ============================================================

const LITHUANIAN_MONTHS = [
  'sausio', 'vasario', 'kovo', 'balandžio', 'gegužės', 'birželio',
  'liepos', 'rugpjūčio', 'rugsėjo', 'spalio', 'lapkričio', 'gruodžio'
]

const LITHUANIAN_MONTHS_NOMINATIVE = [
  'sausis', 'vasaris', 'kovas', 'balandis', 'gegužė', 'birželis',
  'liepa', 'rugpjūtis', 'rugsėjis', 'spalis', 'lapkritis', 'gruodis'
]

const LITHUANIAN_WEEKDAYS = [
  'sekmadienis', 'pirmadienis', 'antradienis', 'trečiadienis',
  'ketvirtadienis', 'penktadienis', 'šeštadienis'
]

const LITHUANIAN_WEEKDAYS_SHORT = ['Sk', 'Pr', 'An', 'Tr', 'Kt', 'Pn', 'Št']

/**
 * Format date in Lithuanian format
 * @param date - Date object, string, or timestamp
 * @param format - 'short' (2026-01-07), 'medium' (2026 m. sausio 7 d.), 
 *                 'long' (2026 m. sausio 7 d., pirmadienis), 'time' (14:30)
 */
export function formatDateLT(
  date: Date | string | number | null | undefined,
  format: 'short' | 'medium' | 'long' | 'time' | 'datetime' | 'datetime-short' = 'medium'
): string {
  if (!date) return '—'
  
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  
  if (isNaN(d.getTime())) return '—'
  
  const year = d.getFullYear()
  const month = d.getMonth()
  const day = d.getDate()
  const weekday = d.getDay()
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  
  switch (format) {
    case 'short':
      // 2026-01-07
      return `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
    
    case 'medium':
      // 2026 m. sausio 7 d.
      return `${year} m. ${LITHUANIAN_MONTHS[month]} ${day} d.`
    
    case 'long':
      // 2026 m. sausio 7 d., pirmadienis
      return `${year} m. ${LITHUANIAN_MONTHS[month]} ${day} d., ${LITHUANIAN_WEEKDAYS[weekday]}`
    
    case 'time':
      // 14:30
      return `${hours}:${minutes}`
    
    case 'datetime':
      // 2026 m. sausio 7 d. 14:30
      return `${year} m. ${LITHUANIAN_MONTHS[month]} ${day} d. ${hours}:${minutes}`
    
    case 'datetime-short':
      // 2026-01-07 14:30
      return `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hours}:${minutes}`
    
    default:
      return `${year} m. ${LITHUANIAN_MONTHS[month]} ${day} d.`
  }
}

/**
 * Format relative time in Lithuanian
 * @param date - Date to compare
 * @param baseDate - Base date (defaults to now)
 */
export function formatRelativeTimeLT(
  date: Date | string | number | null | undefined,
  baseDate: Date = new Date()
): string {
  if (!date) return '—'
  
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  
  if (isNaN(d.getTime())) return '—'
  
  const diffMs = d.getTime() - baseDate.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  
  // Future dates
  if (diffMs > 0) {
    if (diffDays === 0) {
      if (diffHours === 0) {
        if (diffMinutes <= 1) return 'netrukus'
        return `po ${diffMinutes} min.`
      }
      return `po ${diffHours} val.`
    }
    if (diffDays === 1) return 'rytoj'
    if (diffDays < 7) return `po ${diffDays} d.`
    if (diffDays < 30) return `po ${Math.floor(diffDays / 7)} sav.`
    return formatDateLT(d, 'medium')
  }
  
  // Past dates
  const absDiffDays = Math.abs(diffDays)
  const absDiffHours = Math.abs(diffHours)
  const absDiffMinutes = Math.abs(diffMinutes)
  
  if (absDiffDays === 0) {
    if (absDiffHours === 0) {
      if (absDiffMinutes <= 1) return 'ką tik'
      return `prieš ${absDiffMinutes} min.`
    }
    return `prieš ${absDiffHours} val.`
  }
  if (absDiffDays === 1) return 'vakar'
  if (absDiffDays < 7) return `prieš ${absDiffDays} d.`
  if (absDiffDays < 30) return `prieš ${Math.floor(absDiffDays / 7)} sav.`
  return formatDateLT(d, 'medium')
}

/**
 * Get Lithuanian month name
 * @param month - Month index (0-11)
 * @param genitive - Use genitive case (sausio vs sausis)
 */
export function getMonthNameLT(month: number, genitive: boolean = true): string {
  if (month < 0 || month > 11) return ''
  return genitive ? LITHUANIAN_MONTHS[month] : LITHUANIAN_MONTHS_NOMINATIVE[month]
}

/**
 * Get Lithuanian weekday name
 * @param weekday - Weekday index (0=Sunday, 1=Monday, etc.)
 * @param short - Use short form (Pr, An, etc.)
 */
export function getWeekdayNameLT(weekday: number, short: boolean = false): string {
  if (weekday < 0 || weekday > 6) return ''
  return short ? LITHUANIAN_WEEKDAYS_SHORT[weekday] : LITHUANIAN_WEEKDAYS[weekday]
}

