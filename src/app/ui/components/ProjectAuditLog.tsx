'use client'

import { useProjectAuditLog } from '../hooks/useProjectAuditLog'

export function ProjectAuditLog({
  projectId,
  membershipId,
}: {
  projectId: string
  membershipId: string
}) {
  const { rows, loading, error } = useProjectAuditLog(projectId, membershipId)

  if (loading) return <div>Loading audit log…</div>
  if (error) return <div>{error}</div>
  if (!rows.length) return <div>No activity yet</div>

  return (
    <ul>
      {rows.map((r) => (
        <li key={r.id}>
          <strong>{r.action}</strong> — {r.created_at}
        </li>
      ))}
    </ul>
  )
}

