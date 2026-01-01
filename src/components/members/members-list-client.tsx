"use client"

import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Settings, UserPlus } from 'lucide-react'
import { MemberStatusModal } from './member-status-modal'
import { AssignPositionModal } from './assign-position-modal'

interface Member {
  id: string
  user_id: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  role: string
  status: string
  member_status: string
  created_at: string
}

interface MembersListClientProps {
  members: Member[]
  positionsObject: Record<string, string[]>
  orgId: string
  isOwner: boolean
  currentUserId: string | null
}

export function MembersListClient({
  members,
  positionsObject,
  orgId,
  isOwner,
  currentUserId,
}: MembersListClientProps) {
  // Convert positionsObject back to Map for easier lookup
  const positionsMap = new Map<string, string[]>()
  Object.entries(positionsObject).forEach(([userId, positions]) => {
    positionsMap.set(userId, positions)
  })
  const [selectedMember, setSelectedMember] = useState<{
    userId: string
    userName: string | null
    currentStatus: string
  } | null>(null)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  
  const [selectedMemberForPosition, setSelectedMemberForPosition] = useState<{
    userId: string
    userName: string | null
  } | null>(null)
  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false)

  // Helper function to get status badge variant
  const getStatusBadgeVariant = (memberStatus: string) => {
    switch (memberStatus) {
      case 'PENDING':
        return 'secondary' // gray
      case 'ACTIVE':
        return 'success' // green
      case 'SUSPENDED':
        return 'destructive' // red
      case 'LEFT':
        return 'outline' // muted
      default:
        return 'secondary'
    }
  }

  // Helper function to get status label
  const getStatusLabel = (memberStatus: string) => {
    switch (memberStatus) {
      case 'PENDING':
        return 'Laukiama'
      case 'ACTIVE':
        return 'Aktyvus'
      case 'SUSPENDED':
        return 'Sustabdytas'
      case 'LEFT':
        return 'Išėjęs'
      default:
        return memberStatus
    }
  }

  const handleStatusChange = (member: Member) => {
    setSelectedMember({
      userId: member.user_id,
      userName: member.full_name,
      currentStatus: member.member_status,
    })
    setIsStatusModalOpen(true)
  }

  const handleAssignPosition = (member: Member) => {
    setSelectedMemberForPosition({
      userId: member.user_id,
      userName: member.full_name,
    })
    setIsPositionModalOpen(true)
  }

  return (
    <>
      <div className="p-6">
        <div className="mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Nariai</h1>
            <p className="mt-1 text-sm text-slate-600">
              Bendruomenės narių sąrašas
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Visi nariai su statusais ir pareigomis. {isOwner && 'OWNER gali keisti narių statusus.'}
            </p>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vardas ir pavardė</TableHead>
                {isOwner && <TableHead>El. paštas</TableHead>}
                <TableHead>Statusas</TableHead>
                <TableHead>Aktyvumas</TableHead>
                <TableHead>Pareigos</TableHead>
                {isOwner && <TableHead className="w-[200px]">Veiksmai</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isOwner ? 6 : 4} className="text-center text-muted-foreground">
                    Narių nėra
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => {
                  const positions = positionsMap.get(member.user_id) || []
                  const canChangeStatus = isOwner && currentUserId !== member.user_id
                  
                  // Build full name: first_name + last_name, or fallback to full_name
                  const displayName = isOwner && member.first_name && member.last_name
                    ? `${member.first_name} ${member.last_name}`
                    : member.full_name || 'N/A'

                  return (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {displayName}
                      </TableCell>
                      {isOwner && (
                        <TableCell className="text-slate-600">
                          {member.email || '-'}
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(member.member_status)}>
                          {getStatusLabel(member.member_status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.status === 'ACTIVE' ? 'default' : 'secondary'}>
                          {member.status === 'ACTIVE' ? 'Aktyvus' : member.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {positions.length > 0 ? positions.join(', ') : '-'}
                      </TableCell>
                      {isOwner && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {canChangeStatus ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStatusChange(member)}
                                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                  <Settings className="h-4 w-4 mr-1" />
                                  Statusas
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAssignPosition(member)}
                                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                  <UserPlus className="h-4 w-4 mr-1" />
                                  Pareigos
                                </Button>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {selectedMember && (
        <MemberStatusModal
          open={isStatusModalOpen}
          onOpenChange={setIsStatusModalOpen}
          orgId={orgId}
          userId={selectedMember.userId}
          userName={selectedMember.userName}
          currentStatus={selectedMember.currentStatus}
        />
      )}

      {selectedMemberForPosition && (
        <AssignPositionModal
          open={isPositionModalOpen}
          onOpenChange={setIsPositionModalOpen}
          orgId={orgId}
          userId={selectedMemberForPosition.userId}
          userName={selectedMemberForPosition.userName}
        />
      )}
    </>
  )
}

