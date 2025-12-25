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

