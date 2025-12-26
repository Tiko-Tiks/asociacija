'use client'

import { useEffect, useState } from 'react'
import { listProjectAuditLog } from '@/app/actions/projectAuditLog'
import { mapServerError } from '@/app/ui/errors'

export function useProjectAuditLog(projectId: string, membershipId: string) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)

    listProjectAuditLog(projectId, membershipId)
      .then((data) => mounted && setRows(data))
      .catch((e) => mounted && setError(mapServerError(e)))
      .finally(() => mounted && setLoading(false))

    return () => {
      mounted = false
    }
  }, [projectId, membershipId])

  return { rows, loading, error }
}

