import { PROJECT_ROLE, MEMBERSHIP_ROLE } from './constants'
import type { ProjectRole, MembershipRole } from './types'

/**
 * Permission helpers for project-level operations.
 */

export function canEditProject(role: ProjectRole): boolean {
  return role === PROJECT_ROLE.OWNER || role === PROJECT_ROLE.EDITOR
}

export function canDeleteProject(role: ProjectRole): boolean {
  return role === PROJECT_ROLE.OWNER
}

export function canArchiveProject(role: ProjectRole): boolean {
  return role === PROJECT_ROLE.OWNER || role === PROJECT_ROLE.EDITOR
}

export function canChangeMemberRole(
  currentUserRole: ProjectRole,
  targetMemberRole: ProjectRole
): boolean {
  // VIEWER cannot change roles
  if (currentUserRole === PROJECT_ROLE.VIEWER) {
    return false
  }

  // OWNER can change any role
  if (currentUserRole === PROJECT_ROLE.OWNER) {
    return true
  }

  // EDITOR can change roles, but cannot change OWNER
  if (currentUserRole === PROJECT_ROLE.EDITOR) {
    return targetMemberRole !== PROJECT_ROLE.OWNER
  }

  return false
}

export function canRemoveMember(
  currentUserRole: ProjectRole,
  targetMemberRole: ProjectRole
): boolean {
  // VIEWER cannot remove
  if (currentUserRole === PROJECT_ROLE.VIEWER) {
    return false
  }

  // OWNER can remove any member
  if (currentUserRole === PROJECT_ROLE.OWNER) {
    return true
  }

  // EDITOR cannot remove
  if (currentUserRole === PROJECT_ROLE.EDITOR) {
    return false
  }

  return false
}

/**
 * Permission helpers for governance operations.
 * Only ADMIN or CHAIR can create meetings or mark attendance.
 */

export function canCreateMeeting(role: MembershipRole): boolean {
  return role === MEMBERSHIP_ROLE.ADMIN || role === MEMBERSHIP_ROLE.CHAIR || role === MEMBERSHIP_ROLE.OWNER
}

export function canMarkAttendance(role: MembershipRole): boolean {
  return role === MEMBERSHIP_ROLE.ADMIN || role === MEMBERSHIP_ROLE.CHAIR || role === MEMBERSHIP_ROLE.OWNER
}
