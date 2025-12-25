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

      {error === 'AUTH' && <p>Please sign in</p>}
      {error === 'FORBIDDEN' && <p>Not allowed</p>}
      {error === 'INVALID' && <p>Invalid input</p>}
      {error === 'UNKNOWN' && <p>Something went wrong</p>}
    </form>
  )
}

