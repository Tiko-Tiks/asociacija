'use client'

import { useEffect, useState } from 'react'
import type { ProjectRole } from '@/app/domain/types'

export function useProjectRole(projectId: string) {
  const [role, setRole] = useState<ProjectRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadRole() {
      try {
        const res = await fetch(`/api/projects/${projectId}/role`)
        const json = await res.json()

        if (!cancelled && res.ok) {
          setRole(json.role)
        }
      } catch {
        // ignore — server enforces anyway
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadRole()
    return () => {
      cancelled = true
    }
  }, [projectId])

  return { role, loading }
}

