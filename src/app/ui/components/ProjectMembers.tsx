'use client'

import { useEffect } from 'react'
import { useProjectMembers } from '../hooks/useProjectMembers'

export function ProjectMembers({ projectId }: { projectId: string }) {
  const { members, loading, error, load } = useProjectMembers(projectId)

  useEffect(() => {
    load()
  }, [projectId])

  if (loading) return <p>Loading...</p>
  if (error) return <p>Error</p>

  return (
    <ul>
      {members.map((m) => (
        <li key={m.id}>
          {m.user_id} — {m.role}
        </li>
      ))}
    </ul>
  )
}

