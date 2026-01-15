/**
 * Error message translations
 * Converts system error codes to user-friendly Lithuanian messages
 */

export function translateError(error: string | null | undefined): string {
  if (!error) {
    return 'Įvyko nežinoma klaida'
  }

  const errorUpper = error.toUpperCase()

  // Meeting errors
  if (errorUpper === 'NOTICE_TOO_SHORT') {
    return 'Pranešimo terminas per trumpas. Susirinkimas turi būti suplanuotas ne mažiau kaip nustatytą dienų skaičių prieš susirinkimą.'
  }

  if (errorUpper === 'VOTE_NOT_FOUND') {
    return 'Balsavimas nerastas'
  }

  if (errorUpper === 'VOTE_CLOSED') {
    return 'Balsavimas jau uždarytas'
  }

  if (errorUpper === 'NOT_A_MEMBER') {
    return 'Neturite aktyvios narystės šioje organizacijoje'
  }

  if (errorUpper === 'ALREADY_VOTED') {
    return 'Jūs jau balsavote šiame balsavime'
  }

  if (errorUpper === 'CAN_VOTE_BLOCKED') {
    return 'Negalite balsuoti pagal governance taisykles'
  }

  // Return original error if no translation found
  return error
}

/**
 * Translate error with additional context
 */
export function translateErrorWithContext(
  error: string | null | undefined,
  context?: Record<string, any>
): string {
  const baseTranslation = translateError(error)

  if (!context) {
    return baseTranslation
  }

  // Add context-specific information
  if (context.days_short !== undefined) {
    return `${baseTranslation} Trūksta ${context.days_short} ${context.days_short === 1 ? 'dienos' : 'dienų'}.`
  }

  if (context.notice_days !== undefined && context.earliest_allowed) {
    const earliestDate = new Date(context.earliest_allowed).toLocaleDateString('lt-LT')
    return `${baseTranslation} Ankstyviausias leistinas susirinkimo laikas: ${earliestDate}.`
  }

  if (context.can_vote_reason) {
    return `${baseTranslation} Priežastis: ${translateError(context.can_vote_reason)}`
  }

  return baseTranslation
}

