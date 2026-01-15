/**
 * Membership State Machine
 * 
 * Enforces valid membership status transitions per constitutional rules.
 * 
 * State Diagram:
 * 
 *   PENDING ──┐
 *      │      │
 *      ↓      │
 *   ACTIVE ───┤──→ LEFT (terminal)
 *      │      │
 *      ↓      │
 *  SUSPENDED ─┘
 * 
 * Rules:
 * - PENDING can become: ACTIVE, LEFT
 * - ACTIVE can become: SUSPENDED, LEFT
 * - SUSPENDED can become: ACTIVE, LEFT
 * - LEFT is terminal (cannot transition from LEFT)
 * - All transitions require status_reason
 */

import { MEMBERSHIP_STATUS } from '@/app/domain/constants'
import { MembershipStatus } from '@/app/domain/types'

/**
 * Allowed state transitions
 */
const ALLOWED_TRANSITIONS: Record<MembershipStatus, MembershipStatus[]> = {
  PENDING: [MEMBERSHIP_STATUS.ACTIVE, MEMBERSHIP_STATUS.LEFT],
  ACTIVE: [MEMBERSHIP_STATUS.SUSPENDED, MEMBERSHIP_STATUS.LEFT],
  SUSPENDED: [MEMBERSHIP_STATUS.ACTIVE, MEMBERSHIP_STATUS.LEFT],
  LEFT: [], // Terminal state - no transitions allowed
}

/**
 * Validate membership status transition
 * 
 * @param currentStatus - Current membership status
 * @param newStatus - Desired new status
 * @returns true if transition is valid, false otherwise
 */
export function isValidMembershipTransition(
  currentStatus: MembershipStatus,
  newStatus: MembershipStatus
): boolean {
  // Same status is always "valid" (no-op)
  if (currentStatus === newStatus) {
    return true
  }

  // Check if transition is in allowed list
  const allowedTargets = ALLOWED_TRANSITIONS[currentStatus]
  return allowedTargets?.includes(newStatus) ?? false
}

/**
 * Validate membership status transition (throwing version)
 * 
 * @param currentStatus - Current membership status
 * @param newStatus - Desired new status
 * @throws Error if transition is invalid
 */
export function requireValidMembershipTransition(
  currentStatus: MembershipStatus,
  newStatus: MembershipStatus
): void {
  if (!isValidMembershipTransition(currentStatus, newStatus)) {
    throw new Error(
      `Invalid membership transition: ${currentStatus} → ${newStatus}. ` +
      `Allowed transitions from ${currentStatus}: ${ALLOWED_TRANSITIONS[currentStatus]?.join(', ') || 'none'}`
    )
  }
}

/**
 * Get allowed transitions from current status
 * 
 * @param currentStatus - Current membership status
 * @returns Array of allowed target statuses
 */
export function getAllowedMembershipTransitions(
  currentStatus: MembershipStatus
): MembershipStatus[] {
  return ALLOWED_TRANSITIONS[currentStatus] ?? []
}

/**
 * Check if status is terminal (no outgoing transitions)
 * 
 * @param status - Membership status to check
 * @returns true if status is terminal
 */
export function isTerminalMembershipStatus(status: MembershipStatus): boolean {
  return (ALLOWED_TRANSITIONS[status]?.length ?? 0) === 0
}

/**
 * Get human-readable transition reason templates
 */
export const MEMBERSHIP_TRANSITION_TEMPLATES: Record<string, string> = {
  'PENDING→ACTIVE': 'Narystė patvirtinta po peržiūros',
  'PENDING→LEFT': 'Paraiška atmesta',
  'ACTIVE→SUSPENDED': 'Narystė sustabdyta dėl:',
  'ACTIVE→LEFT': 'Narys išstojo / pašalintas',
  'SUSPENDED→ACTIVE': 'Narystė atnaujinta po sustabdymo',
  'SUSPENDED→LEFT': 'Narystė nutraukta po sustabdymo',
}

/**
 * Get transition template
 * 
 * @param from - Current status
 * @param to - Target status
 * @returns Template string or null
 */
export function getMembershipTransitionTemplate(
  from: MembershipStatus,
  to: MembershipStatus
): string | null {
  const key = `${from}→${to}`
  return MEMBERSHIP_TRANSITION_TEMPLATES[key] ?? null
}

/**
 * Validate transition with reason
 * 
 * @param currentStatus - Current status
 * @param newStatus - New status
 * @param reason - Reason for transition
 * @returns Validation result
 */
export function validateMembershipTransitionWithReason(
  currentStatus: MembershipStatus,
  newStatus: MembershipStatus,
  reason?: string
): { valid: boolean; error?: string } {
  // Check transition validity
  if (!isValidMembershipTransition(currentStatus, newStatus)) {
    return {
      valid: false,
      error: `Netinkamas perėjimas: ${currentStatus} → ${newStatus}`,
    }
  }

  // No-op transitions don't need reason
  if (currentStatus === newStatus) {
    return { valid: true }
  }

  // Check reason is provided
  if (!reason || reason.trim().length === 0) {
    return {
      valid: false,
      error: 'Priežastis yra privaloma',
    }
  }

  // Check reason is meaningful (at least 10 characters)
  if (reason.trim().length < 10) {
    return {
      valid: false,
      error: 'Priežastis per trumpa (mažiausiai 10 simbolių)',
    }
  }

  return { valid: true }
}

/**
 * Example usage:
 * 
 * ```typescript
 * import { requireValidMembershipTransition } from '@/app/domain/state-machines/membership'
 * 
 * // In updateMemberStatus action:
 * export async function updateMemberStatus(
 *   org_id: string,
 *   target_user_id: string,
 *   new_status: MembershipStatus,
 *   reason: string
 * ) {
 *   // ... fetch current membership ...
 *   
 *   // Validate transition
 *   try {
 *     requireValidMembershipTransition(
 *       currentMembership.member_status,
 *       new_status
 *     )
 *   } catch (error) {
 *     return { success: false, error: error.message }
 *   }
 *   
 *   // ... proceed with update ...
 * }
 * ```
 */

