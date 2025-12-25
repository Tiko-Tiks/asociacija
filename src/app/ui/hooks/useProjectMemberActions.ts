'use client'

import {
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember,
} from '@/app/actions/projectMemberMutations'

export function useProjectMemberActions(projectId: string) {
  return {
    add: (userId: string, role: 'VIEWER' | 'EDITOR') =>
      addProjectMember(projectId, userId, role),

    updateRole: (userId: string, role: 'VIEWER' | 'EDITOR') =>
      updateProjectMemberRole(projectId, userId, role),

    remove: (userId: string) =>
      removeProjectMember(projectId, userId),
  }
}

