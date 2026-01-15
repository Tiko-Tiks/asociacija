/**
 * Resolution State Machine and Immutability Guards
 * 
 * Enforces resolution status transitions and immutability rules.
 * 
 * State Diagram:
 * 
 *   DRAFT ──→ PROPOSED ──┬──→ APPROVED (immutable)
 *                        └──→ REJECTED (immutable)
 * 
 * Rules:
 * - DRAFT can become: PROPOSED
 * - PROPOSED can become: APPROVED, REJECTED
 * - APPROVED is terminal and IMMUTABLE
 * - REJECTED is terminal and IMMUTABLE
 * - adopted_at and adopted_by set ONCE when entering APPROVED
 */

import { RESOLUTION_STATUS } from '@/app/domain/constants'
import { ResolutionStatus } from '@/app/domain/types'

/**
 * Allowed state transitions
 */
const ALLOWED_TRANSITIONS: Record<ResolutionStatus, ResolutionStatus[]> = {
  DRAFT: [RESOLUTION_STATUS.PROPOSED],
  PROPOSED: [RESOLUTION_STATUS.APPROVED, RESOLUTION_STATUS.REJECTED],
  APPROVED: [], // Terminal and immutable
  REJECTED: [], // Terminal and immutable
}

/**
 * Immutable statuses (cannot be modified once reached)
 */
const IMMUTABLE_STATUSES: ResolutionStatus[] = [
  RESOLUTION_STATUS.APPROVED,
  RESOLUTION_STATUS.REJECTED,
]

/**
 * Check if resolution status is immutable
 * 
 * @param status - Resolution status
 * @returns true if status is immutable
 */
export function isImmutableResolution(status: ResolutionStatus): boolean {
  return IMMUTABLE_STATUSES.includes(status)
}

/**
 * Validate resolution status transition
 * 
 * @param currentStatus - Current resolution status
 * @param newStatus - Desired new status
 * @returns true if transition is valid, false otherwise
 */
export function isValidResolutionTransition(
  currentStatus: ResolutionStatus,
  newStatus: ResolutionStatus
): boolean {
  // Same status is always "valid" (no-op)
  if (currentStatus === newStatus) {
    return true
  }

  // Cannot transition from immutable statuses
  if (isImmutableResolution(currentStatus)) {
    return false
  }

  // Check if transition is in allowed list
  const allowedTargets = ALLOWED_TRANSITIONS[currentStatus]
  return allowedTargets?.includes(newStatus) ?? false
}

/**
 * Validate resolution status transition (throwing version)
 * 
 * @param currentStatus - Current resolution status
 * @param newStatus - Desired new status
 * @throws Error if transition is invalid
 */
export function requireValidResolutionTransition(
  currentStatus: ResolutionStatus,
  newStatus: ResolutionStatus
): void {
  if (!isValidResolutionTransition(currentStatus, newStatus)) {
    if (isImmutableResolution(currentStatus)) {
      throw new Error(
        `Cannot modify resolution with status ${currentStatus} (immutable)`
      )
    }

    throw new Error(
      `Invalid resolution transition: ${currentStatus} → ${newStatus}. ` +
      `Allowed transitions from ${currentStatus}: ${ALLOWED_TRANSITIONS[currentStatus]?.join(', ') || 'none'}`
    )
  }
}

/**
 * Guard against modifications to immutable resolutions
 * 
 * This should be called before ANY update to a resolution.
 * 
 * @param currentStatus - Current resolution status
 * @throws Error if resolution is immutable
 */
export function requireMutableResolution(currentStatus: ResolutionStatus): void {
  if (isImmutableResolution(currentStatus)) {
    throw new Error(
      `Resolution is immutable (status: ${currentStatus}). ` +
      `APPROVED and REJECTED resolutions cannot be modified.`
    )
  }
}

/**
 * Get allowed transitions from current status
 * 
 * @param currentStatus - Current resolution status
 * @returns Array of allowed target statuses
 */
export function getAllowedResolutionTransitions(
  currentStatus: ResolutionStatus
): ResolutionStatus[] {
  return ALLOWED_TRANSITIONS[currentStatus] ?? []
}

/**
 * Check if resolution is terminal (no outgoing transitions)
 * 
 * @param status - Resolution status
 * @returns true if status is terminal
 */
export function isTerminalResolutionStatus(status: ResolutionStatus): boolean {
  return (ALLOWED_TRANSITIONS[status]?.length ?? 0) === 0
}

/**
 * Resolution fields that become immutable after APPROVED/REJECTED
 */
export const IMMUTABLE_RESOLUTION_FIELDS = [
  'title',
  'content',
  'status',
  'visibility',
  'adopted_at',
  'adopted_by',
] as const

/**
 * Validate resolution update payload
 * 
 * @param currentStatus - Current status
 * @param updates - Proposed updates
 * @returns Validation result
 */
export function validateResolutionUpdate(
  currentStatus: ResolutionStatus,
  updates: Record<string, any>
): { valid: boolean; error?: string } {
  // Check if resolution is immutable
  if (isImmutableResolution(currentStatus)) {
    const attemptedFields = Object.keys(updates)
    return {
      valid: false,
      error: `Cannot update ${currentStatus} resolution. Attempted to modify: ${attemptedFields.join(', ')}`,
    }
  }

  // Additional validations can go here
  // For example: check visibility changes, etc.

  return { valid: true }
}

/**
 * Example usage:
 * 
 * ```typescript
 * import { 
 *   requireMutableResolution,
 *   requireValidResolutionTransition 
 * } from '@/app/domain/state-machines/resolution'
 * 
 * // Before updating resolution content:
 * export async function updateResolution(id: string, updates: any) {
 *   const current = await getResolution(id)
 *   
 *   // Guard: Check if mutable
 *   requireMutableResolution(current.status)
 *   
 *   // Proceed with update
 *   await supabase.from('resolutions').update(updates).eq('id', id)
 * }
 * 
 * // Before changing status:
 * export async function approveResolution(id: string) {
 *   const current = await getResolution(id)
 *   
 *   // Validate transition
 *   requireValidResolutionTransition(
 *     current.status,
 *     RESOLUTION_STATUS.APPROVED
 *   )
 *   
 *   // Proceed with approval
 *   await supabase
 *     .from('resolutions')
 *     .update({
 *       status: RESOLUTION_STATUS.APPROVED,
 *       adopted_at: new Date().toISOString(),
 *       adopted_by: user.id,
 *     })
 *     .eq('id', id)
 * }
 * ```
 */

