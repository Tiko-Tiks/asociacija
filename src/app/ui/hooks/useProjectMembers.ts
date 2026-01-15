'use client'

import { useState } from 'react'
import { listProjectMembers } from '@/app/actions/projectMembers'
import {
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember,
} from '@/app/actions/projectMemberMutations'
import { mapServerError } from '@/app/ui/errors'
import type { ProjectRole } from '@/app/domain/types'

export interface ProjectMember {
  id: string
  user_id: string
  role: ProjectRole
}

export function useProjectMembers(
  projectId: string,
  membershipId: string
) {
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadProjectMembers() {
    try {
      setLoading(true)
      setError(null)
      const data = await listProjectMembers(projectId)
      setMembers(data as ProjectMember[])
    } catch (e: unknown) {
      const uiError = mapServerError(e)
      if (uiError === 'AUTH') {
        setError('Reikia prisijungti')
      } else if (uiError === 'FORBIDDEN') {
        setError('Neturite teisiu arba aktyvios narystes')
      } else {
        setError('Failed to load members')
      }
    } finally {
      setLoading(false)
    }
  }

  async function addMember(
    userId: string,
    role: 'VIEWER' | 'EDITOR'
  ): Promise<void> {
    try {
      setError(null)
      await addProjectMember(projectId, membershipId, userId, role)
      await loadProjectMembers()
    } catch (e: unknown) {
      const uiError = mapServerError(e)
      if (uiError === 'AUTH') {
        setError('Reikia prisijungti')
      } else if (uiError === 'FORBIDDEN') {
        setError('Neturite teisiu arba aktyvios narystes')
      } else {
        setError('Action failed')
      }
      throw e
    }
  }

  async function updateMemberRole(
    userId: string,
    role: 'VIEWER' | 'EDITOR'
  ): Promise<void> {
    try {
      setError(null)
      await updateProjectMemberRole(projectId, membershipId, userId, role)
      await loadProjectMembers()
    } catch (e: unknown) {
      const uiError = mapServerError(e)
      if (uiError === 'AUTH') {
        setError('Reikia prisijungti')
      } else if (uiError === 'FORBIDDEN') {
        setError('Neturite teisiu arba aktyvios narystes')
      } else {
        setError('Action failed')
      }
      throw e
    }
  }

  async function removeMember(userId: string): Promise<void> {
    try {
      setError(null)
      await removeProjectMember(projectId, membershipId, userId)
      await loadProjectMembers()
    } catch (e: unknown) {
      const uiError = mapServerError(e)
      if (uiError === 'AUTH') {
        setError('Reikia prisijungti')
      } else if (uiError === 'FORBIDDEN') {
        setError('Neturite teisiu arba aktyvios narystes')
      } else {
        setError('Action failed')
      }
      throw e
    }
  }

  return {
    members,
    loading,
    error,
    load: loadProjectMembers,
    addMember,
    updateMemberRole,
    removeMember,
  }
}

