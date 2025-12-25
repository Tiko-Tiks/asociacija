'use client'

import { canEditProject, canArchiveProject, canDeleteProject } from '@/app/domain/permissions'
import { useProjectRole } from '../hooks/useProjectRole'

type Props = {
  projectId: string
}

export function ProjectActions({ projectId }: Props) {
  const { role, loading } = useProjectRole(projectId)

  if (loading || !role) return null

  return (
    <div className="flex gap-2">
      {canEditProject(role) && (
        <button>Edit</button>
      )}

      {canArchiveProject(role) && (
        <button>Archive</button>
      )}

      {canDeleteProject(role) && (
        <button className="text-red-600">Delete</button>
      )}
    </div>
  )
}

