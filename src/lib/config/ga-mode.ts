/**
 * GA HARD MODE Configuration
 * 
 * GA (General Assembly) balsavimai veikia procedūriniu režimu,
 * kuris turi aukštesnį prioritetą nei universalus voting modulis.
 * 
 * @see docs/VOTING_FLOW_SPECIFICATION.md
 */

/**
 * GA režimai
 * 
 * TEST - Bandomasis režimas:
 *   - Rezultatai skaičiuojami
 *   - resolutions.status NEKEIČIAMAS
 *   - Teisinės pasekmės NETAIKYTOS
 *   - Leidžiama be kvorumo
 *   - Leidžiama be PDF
 * 
 * PRODUCTION - Gamybinis režimas:
 *   - Privalomas kvorumas
 *   - Privalomas pasirašytas PDF
 *   - Taikomi rezultatai
 *   - Teisinės pasekmės PILNOS
 */
export type GAMode = 'TEST' | 'PRODUCTION'

/**
 * Gauti dabartinį GA režimą
 * 
 * Nuskaito iš environment variable NEXT_PUBLIC_GA_MODE
 * Default: TEST (saugumas pirmiausia)
 */
export function getGAMode(): GAMode {
  const mode = process.env.NEXT_PUBLIC_GA_MODE || process.env.GA_MODE || 'TEST'
  
  if (mode === 'PRODUCTION') {
    return 'PRODUCTION'
  }
  
  // Default to TEST for safety
  return 'TEST'
}

/**
 * Ar sistema veikia PRODUCTION režimu?
 */
export function isProductionMode(): boolean {
  return getGAMode() === 'PRODUCTION'
}

/**
 * Ar sistema veikia TEST režimu?
 */
export function isTestMode(): boolean {
  return getGAMode() === 'TEST'
}

/**
 * Gauti režimo aprašymą logging tikslams
 */
export function getGAModeDescription(): string {
  const mode = getGAMode()
  
  if (mode === 'PRODUCTION') {
    return 'PRODUCTION (Full legal enforcement, quorum required, PDF required)'
  }
  
  return 'TEST (No legal consequences, quorum optional, PDF optional)'
}

/**
 * Validuoti ar GA gali būti užbaigtas pagal režimą
 * 
 * @param hasQuorum - Ar pasiektas kvorumas
 * @param hasSignedPDF - Ar įkeltas pasirašytas PDF
 * @returns { allowed: boolean, reason?: string }
 */
export function canCompleteGA(
  hasQuorum: boolean,
  hasSignedPDF: boolean
): { allowed: boolean; reason?: string } {
  const mode = getGAMode()
  
  if (mode === 'TEST') {
    // TEST režime visada leidžiama
    return { allowed: true }
  }
  
  // PRODUCTION režimas
  if (!hasQuorum) {
    return {
      allowed: false,
      reason: 'PRODUCTION režimas: Kvorumas nepasiektas',
    }
  }
  
  if (!hasSignedPDF) {
    return {
      allowed: false,
      reason: 'PRODUCTION režimas: Protokolas nepasirašytas (PDF nėra)',
    }
  }
  
  return { allowed: true }
}

/**
 * Log GA režimo informaciją
 */
export function logGAMode(context: string) {
  const mode = getGAMode()
  const desc = getGAModeDescription()
  
  console.log(`[GA_MODE] ${context}: ${mode}`)
  console.log(`[GA_MODE] ${desc}`)
}

