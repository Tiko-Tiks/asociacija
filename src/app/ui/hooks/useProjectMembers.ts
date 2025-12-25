'use client'

import { useState } from 'react'
import { listProjectMembers } from '@/app/actions/projectMembers'

export function useProjectMembers(projectId: string) {
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const data = await listProjectMembers(projectId)
      setMembers(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return { members, loading, error, load }
}

