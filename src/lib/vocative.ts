/**
 * Lithuanian Vocative Case (Šauksmininkas) Helper
 * 
 * Converts Lithuanian first names to vocative case for greetings.
 * Example: "Giedrius" → "Giedriau", "Jonas" → "Jonai", "Eglė" → "Egle"
 * 
 * Rules:
 * - Male names ending in -as → -ai (Jonas → Jonai)
 * - Male names ending in -is → -i (Vytis → Vyti)
 * - Male names ending in -us → -au (Marius → Mariau)
 * - Male names ending in -ius → -iau (Giedrius → Giedriau)
 * - Female names ending in -a → -a (usually unchanged, some → -e)
 * - Female names ending in -ė → -e (Eglė → Egle)
 * - Female names ending in -ija → unchanged (Marija → Marija)
 */

/**
 * Extracts first name from full name
 * @param fullName - Full name (e.g., "Jonas Jonaitis")
 * @returns First name only (e.g., "Jonas")
 */
export function getFirstName(fullName: string | null | undefined): string | null {
  if (!fullName) return null
  const trimmed = fullName.trim()
  if (!trimmed) return null
  
  const parts = trimmed.split(/\s+/)
  return parts[0] || null
}

/**
 * Converts Lithuanian first name to vocative case (šauksmininkas)
 * @param firstName - First name in nominative case
 * @returns First name in vocative case for greetings
 */
export function toVocative(firstName: string | null | undefined): string | null {
  if (!firstName) return null
  
  const name = firstName.trim()
  if (!name) return null
  
  // Handle common exceptions first
  const exceptions: Record<string, string> = {
    // Common male names with irregular vocative
    'Jurgis': 'Jurgi',
    'Antanas': 'Antanai',
    'Tadas': 'Tadai',
    'Vladas': 'Vladai',
    'Kazys': 'Kazy',
    'Pranas': 'Pranai',
    // Names that don't change much
    'Marija': 'Marija',
    'Sofija': 'Sofija',
    'Julija': 'Julija',
    'Emilija': 'Emilija',
    'Viktorija': 'Viktorija',
    'Patricija': 'Patricija',
  }
  
  // Check exceptions (case-insensitive)
  const exceptionKey = Object.keys(exceptions).find(
    k => k.toLowerCase() === name.toLowerCase()
  )
  if (exceptionKey) {
    // Preserve original capitalization
    const vocative = exceptions[exceptionKey]
    return name[0].toUpperCase() === name[0] 
      ? vocative.charAt(0).toUpperCase() + vocative.slice(1)
      : vocative.toLowerCase()
  }
  
  // Apply general rules based on ending
  const lowerName = name.toLowerCase()
  
  // Male names: -ius → -iau (Giedrius → Giedriau, Marius → Mariau)
  if (lowerName.endsWith('ius')) {
    return name.slice(0, -3) + 'iau'
  }
  
  // Male names: -us → -au (Titus → Titau) - less common
  if (lowerName.endsWith('us') && !lowerName.endsWith('ius')) {
    return name.slice(0, -2) + 'au'
  }
  
  // Male names: -as → -ai (Jonas → Jonai, Petras → Petrai)
  if (lowerName.endsWith('as')) {
    return name.slice(0, -2) + 'ai'
  }
  
  // Male names: -is → -i (Vytis → Vyti)
  if (lowerName.endsWith('is')) {
    return name.slice(0, -2) + 'i'
  }
  
  // Male names: -ys → -y (rarely used)
  if (lowerName.endsWith('ys')) {
    return name.slice(0, -2) + 'y'
  }
  
  // Female names: -ė → -e (Eglė → Egle, Agnė → Agne)
  if (lowerName.endsWith('ė')) {
    return name.slice(0, -1) + 'e'
  }
  
  // Female names: -ija → unchanged (Marija → Marija)
  if (lowerName.endsWith('ija')) {
    return name
  }
  
  // Female names: -a → mostly unchanged, but some change to -e
  // This is complex, so we'll keep it unchanged for safety
  if (lowerName.endsWith('a')) {
    return name
  }
  
  // If no rule matches, return as-is
  return name
}

/**
 * Creates a greeting with vocative case
 * Uses time-appropriate greeting (Labas rytas/Laba diena/Labas vakaras)
 * 
 * @param firstName - First name (will be converted to vocative)
 * @param includeTimeGreeting - Whether to use time-based greeting (default: true)
 * @returns Greeting string like "Laba diena, Jonai"
 */
export function createGreeting(
  firstName: string | null | undefined,
  includeTimeGreeting: boolean = true
): string {
  const vocativeName = toVocative(firstName)
  
  let greeting: string
  
  if (includeTimeGreeting) {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) {
      greeting = 'Labas rytas'
    } else if (hour >= 12 && hour < 18) {
      greeting = 'Laba diena'
    } else {
      greeting = 'Labas vakaras'
    }
  } else {
    greeting = 'Sveiki'
  }
  
  if (vocativeName) {
    return `${greeting}, ${vocativeName}`
  }
  
  return greeting
}

/**
 * Creates greeting from full name (extracts first name, converts to vocative)
 * 
 * @param fullName - Full name (e.g., "Giedrius Pupenis")
 * @param includeTimeGreeting - Whether to use time-based greeting
 * @returns Greeting like "Laba diena, Giedriau"
 */
export function createGreetingFromFullName(
  fullName: string | null | undefined,
  includeTimeGreeting: boolean = true
): string {
  const firstName = getFirstName(fullName)
  return createGreeting(firstName, includeTimeGreeting)
}

/**
 * Formats full name for privacy in discussions
 * Shows only first name and first letter of last name
 * 
 * @param fullName - Full name (e.g., "Jonas Jonaitis")
 * @returns Formatted name (e.g., "Jonas J.")
 */
export function formatNameForDiscussion(fullName: string | null | undefined): string {
  if (!fullName) return 'Narys'
  
  const trimmed = fullName.trim()
  if (!trimmed) return 'Narys'
  
  const parts = trimmed.split(/\s+/)
  
  if (parts.length === 0) return 'Narys'
  if (parts.length === 1) return parts[0] // Only first name
  
  const firstName = parts[0]
  const lastName = parts[parts.length - 1]
  const lastNameInitial = lastName.charAt(0).toUpperCase()
  
  return `${firstName} ${lastNameInitial}.`
}

