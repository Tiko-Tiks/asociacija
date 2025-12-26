'use client'

import {
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember,
} from '@/app/actions/projectMemberMutations'

export function useProjectMemberActions(
  projectId: string,
  membershipId: string
) {
  return {
    add: (userId: string, role: 'VIEWER' | 'EDITOR') =>
      addProjectMember(projectId, membershipId, userId, role),

    updateRole: (userId: string, role: 'VIEWER' | 'EDITOR') =>
      updateProjectMemberRole(projectId, membershipId, userId, role),

    remove: (userId: string) =>
      removeProjectMember(projectId, membershipId, userId),
  }
}

