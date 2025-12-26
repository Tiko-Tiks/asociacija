import { PROJECT_ROLE } from './constants'
import { ProjectRole } from './types'

/**
 * Permission helpers for project roles.
 * 
 * These functions determine what actions a user can perform
 * based on their role in a project.
 */

/**
 * Checks if a role can edit a project.
 * 
 * @param role - The user's role in the project
 * @returns true if the role can edit, false otherwise
 */
export function canEditProject(role: ProjectRole): boolean {
  return role === PROJECT_ROLE.OWNER || role === PROJECT_ROLE.EDITOR
}

/**
 * Checks if a role can delete a project.
 * 
 * @param role - The user's role in the project
 * @returns true if the role can delete, false otherwise
 */
export function canDeleteProject(role: ProjectRole): boolean {
  return role === PROJECT_ROLE.OWNER
}

/**
 * Checks if a role can archive a project.
 * 
 * @param role - The user's role in the project
 * @returns true if the role can archive, false otherwise
 */
export function canArchiveProject(role: ProjectRole): boolean {
  return role === PROJECT_ROLE.OWNER || role === PROJECT_ROLE.EDITOR
}

/**
 * Checks if a role can change another member's role.
 * 
 * @param currentUserRole - The current user's role
 * @param targetMemberRole - The target member's role to change
 * @returns true if the current user can change the target member's role
 */
export function canChangeMemberRole(
  currentUserRole: ProjectRole,
  targetMemberRole: ProjectRole
): boolean {
  // VIEWER cannot change anyone's role
  if (currentUserRole === PROJECT_ROLE.VIEWER) {
    return false
  }

  // OWNER can change anyone's role
  if (currentUserRole === PROJECT_ROLE.OWNER) {
    return true
  }

  // EDITOR can change roles, but cannot change OWNER
  if (currentUserRole === PROJECT_ROLE.EDITOR) {
    return targetMemberRole !== PROJECT_ROLE.OWNER
  }

  return false
}

/**
 * Checks if a role can remove a member from the project.
 * 
 * @param currentUserRole - The current user's role
 * @param targetMemberRole - The target member's role to remove
 * @returns true if the current user can remove the target member
 */
export function canRemoveMember(
  currentUserRole: ProjectRole,
  targetMemberRole: ProjectRole
): boolean {
  // VIEWER cannot remove anyone
  if (currentUserRole === PROJECT_ROLE.VIEWER) {
    return false
  }

  // OWNER can remove anyone
  if (currentUserRole === PROJECT_ROLE.OWNER) {
    return true
  }

  // EDITOR cannot remove anyone (only OWNER can remove members)
  if (currentUserRole === PROJECT_ROLE.EDITOR) {
    return false
  }

  return false
}

