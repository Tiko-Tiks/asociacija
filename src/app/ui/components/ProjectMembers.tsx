'use client'

import { useEffect, useState } from 'react'
import { useProjectMembers } from '../hooks/useProjectMembers'
import { useProjectRole } from '../hooks/useProjectRole'
import {
  canChangeMemberRole,
  canRemoveMember,
} from '@/app/domain/permissions'
import { PROJECT_ROLE } from '@/app/domain/constants'
import type { ProjectRole } from '@/app/domain/types'

interface ProjectMembersProps {
  projectId: string
  membershipId: string
}

export function ProjectMembers({
  projectId,
  membershipId,
}: ProjectMembersProps) {
  const { role: currentUserRole, loading: roleLoading } =
    useProjectRole(projectId)
  const {
    members,
    loading: membersLoading,
    error,
    load,
    addMember,
    updateMemberRole,
    removeMember,
  } = useProjectMembers(projectId, membershipId)

  const [addingMember, setAddingMember] = useState(false)
  const [newMemberUserId, setNewMemberUserId] = useState('')
  const [newMemberRole, setNewMemberRole] = useState<'VIEWER' | 'EDITOR'>(
    PROJECT_ROLE.VIEWER
  )

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const loading = roleLoading || membersLoading

  if (loading) {
    return <p>Loading...</p>
  }

  if (error) {
    return (
      <div>
        <p>{error}</p>
        <button onClick={() => load()}>Retry</button>
      </div>
    )
  }

  if (!currentUserRole) {
    return <p>Unable to load permissions</p>
  }

  const handleAddMember = async () => {
    if (!newMemberUserId.trim()) return
    try {
      await addMember(newMemberUserId.trim(), newMemberRole)
      setNewMemberUserId('')
      setNewMemberRole(PROJECT_ROLE.VIEWER)
      setAddingMember(false)
    } catch {
      // Error handled in hook
    }
  }

  const handleUpdateRole = async (
    userId: string,
    role: 'VIEWER' | 'EDITOR'
  ) => {
    try {
      await updateMemberRole(userId, role)
    } catch {
      // Error handled in hook
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Remove this member from the project?')) return
    try {
      await removeMember(userId)
    } catch {
      // Error handled in hook
    }
  }

  return (
    <div>
      <h2>Project Members</h2>

      {canChangeMemberRole(
        currentUserRole,
        PROJECT_ROLE.EDITOR
      ) && (
        <div>
          {!addingMember ? (
            <button onClick={() => setAddingMember(true)}>Add Member</button>
          ) : (
            <div>
              <input
                type="text"
                placeholder="User ID"
                value={newMemberUserId}
                onChange={(e) => setNewMemberUserId(e.target.value)}
              />
              <select
                value={newMemberRole}
                onChange={(e) =>
                  setNewMemberRole(e.target.value as 'VIEWER' | 'EDITOR')
                }
              >
                <option value={PROJECT_ROLE.VIEWER}>{PROJECT_ROLE.VIEWER}</option>
                <option value={PROJECT_ROLE.EDITOR}>{PROJECT_ROLE.EDITOR}</option>
              </select>
              <button onClick={handleAddMember}>Add</button>
              <button onClick={() => setAddingMember(false)}>Cancel</button>
            </div>
          )}
        </div>
      )}

      <ul>
        {members.map((member) => {
          const canChange = canChangeMemberRole(
            currentUserRole,
            member.role
          )
          const canRemove = canRemoveMember(currentUserRole, member.role)

          return (
            <li key={member.id}>
              <div>
                <span>{member.user_id}</span> —{' '}
                <span>{member.role}</span>
                {canChange && member.role !== PROJECT_ROLE.OWNER && (
                  <div>
                    <button
                      onClick={() =>
                        handleUpdateRole(
                          member.user_id,
                          member.role === PROJECT_ROLE.VIEWER
                            ? PROJECT_ROLE.EDITOR
                            : PROJECT_ROLE.VIEWER
                        )
                      }
                    >
                      Change Role
                    </button>
                  </div>
                )}
                {canRemove && (
                  <button onClick={() => handleRemoveMember(member.user_id)}>
                    Remove
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

