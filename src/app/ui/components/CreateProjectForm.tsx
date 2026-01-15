/**
 * DEPRECATED (v19.0): Projects are derived from APPROVED resolutions
 */
'use client'

import { useState } from 'react'
import { useProjectActions } from '@/app/ui/hooks/useProjectActions'

export function CreateProjectForm({ membershipId }: { membershipId: string }) {
  const [name, setName] = useState('')
  const { createProject, loading, error } = useProjectActions()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = await createProject(membershipId, name)
    if (result) setName('')
  }

  return (
    <form onSubmit={onSubmit}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={loading}
        placeholder="Project name"
      />

      <button disabled={loading || !name.trim()}>
        {loading ? 'Creating…' : 'Create'}
      </button>

      {error === 'AUTH' && <p>Reikia prisijungti</p>}
      {error === 'FORBIDDEN' && <p>Neturite teisiu arba aktyvios narystes</p>}
      {error === 'INVALID' && <p>Neteisinga ivestis</p>}
      {error === 'UNKNOWN' && <p>Ivyko klaida</p>}
    </form>
  )
}

