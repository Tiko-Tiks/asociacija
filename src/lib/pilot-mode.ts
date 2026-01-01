/**
 * TEMPORARY PILOT MODE UTILITY
 * 
 * Purpose: Allow full end-to-end testing without breaking architecture.
 * 
 * This is a UI-only feature that can be easily removed later.
 * No DB changes, no RLS changes.
 * 
 * To remove: Delete this file and remove isPilotMode() calls from components.
 */

/**
 * Pilot mode organization slugs.
 * Organizations with these slugs will have pilot mode enabled.
 */
const PILOT_ORG_SLUGS = ['demo-org', 'mano-bendruomene'] as const

/**
 * Check if an organization is in pilot mode.
 * 
 * @param orgSlug - Organization slug to check
 * @returns true if org is in pilot mode, false otherwise
 */
export function isPilotMode(orgSlug: string | null | undefined): boolean {
  if (!orgSlug) {
    return false
  }
  return PILOT_ORG_SLUGS.includes(orgSlug as any)
}

