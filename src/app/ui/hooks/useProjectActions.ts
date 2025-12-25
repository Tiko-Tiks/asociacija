'use client'

import { useState } from 'react'
import {
  createProject,
  updateProjectName,
  deleteProject,
  archiveProject,
  restoreProject,
} from '@/app/actions/projects'
import { mapServerError, UiError } from '@/app/ui/errors'

export function useProjectActions() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<UiError | null>(null)

  async function run<T>(fn: () => Promise<T>): Promise<T | null> {
    try {
      setLoading(true)
      setError(null)
      return await fn()
    } catch (err) {
      setError(mapServerError(err))
      return null
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,

    createProject: (membershipId: string, name: string) =>
      run(() => createProject(membershipId, name)),

    updateProjectName: (projectId: string, membershipId: string, name: string) =>
      run(() => updateProjectName(projectId, membershipId, name)),

    deleteProject: (projectId: string, membershipId: string) =>
      run(() => deleteProject(projectId, membershipId)),

    archiveProject: (projectId: string, membershipId: string) =>
      run(() => archiveProject(projectId, membershipId)),

    restoreProject: (projectId: string, membershipId: string) =>
      run(() => restoreProject(projectId, membershipId)),
  }
}

