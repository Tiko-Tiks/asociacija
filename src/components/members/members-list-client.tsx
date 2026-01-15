"use client"

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Settings, UserPlus, MoreVertical, Plus, XCircle, Edit } from 'lucide-react'
import { MemberStatusModal } from './member-status-modal'
import { AssignPositionModal } from './assign-position-modal'
import { EditMemberNameModal } from './edit-member-name-modal'
import { MemberStatusHint } from './member-status-hint'
import { inviteMember } from '@/app/actions/invite-member'
import { approveMemberV2, rejectMemberV2 } from '@/app/actions/member-decision-v2'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'

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
  metadata?: any
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
  const { toast } = useToast()
  const router = useRouter()
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

  // Edit member name state
  const [selectedMemberForEdit, setSelectedMemberForEdit] = useState<{
    userId: string
    fullName: string | null
    firstName: string | null
    lastName: string | null
  } | null>(null)
  const [isEditNameModalOpen, setIsEditNameModalOpen] = useState(false)

  // Invite member state
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [isInviting, setIsInviting] = useState(false)

  // Approve/Reject member state
  const [isApproving, setIsApproving] = useState<string | null>(null)
  const [isRejecting, setIsRejecting] = useState<string | null>(null)

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
        return 'Uždarytas'
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

  const handleEditMemberName = (member: Member) => {
    setSelectedMemberForEdit({
      userId: member.user_id,
      fullName: member.full_name,
      firstName: member.first_name,
      lastName: member.last_name,
    })
    setIsEditNameModalOpen(true)
  }

  const handleApproveMember = async (member: Member) => {
    if (member.member_status !== 'PENDING') {
      toast({
        title: 'Klaida',
        description: 'Galima patvirtinti tik laukiančius narius',
        variant: 'destructive',
      })
      return
    }

    // Validate member.id exists and is a valid UUID format
    if (!member.id || typeof member.id !== 'string' || member.id.trim().length === 0) {
      toast({
        title: 'Klaida',
        description: 'Narystės ID nerastas',
        variant: 'destructive',
      })
      console.error('Invalid member.id:', member)
      return
    }


    setIsApproving(member.id)
    try {
      
      // Log to console for debugging
      console.log('[APPROVE MEMBER] Full member object:', member)
      console.log('[APPROVE MEMBER] Membership ID being sent:', member.id)
      console.log('[APPROVE MEMBER] User ID:', member.user_id)
      console.log('[APPROVE MEMBER] Org ID:', orgId)
      
      const result = await approveMemberV2({
        membershipId: member.id,
        approvalNote: 'Patvirtinta per narių sąrašą',
      })
      
      console.log('[APPROVE MEMBER] Result:', result)
      

      if (result.success) {
        toast({
          title: 'Sėkmė',
          description: `${member.full_name || 'Narys'} sėkmingai patvirtintas`,
        })
        // Refresh page to show updated status
        // Use router.refresh() first, then fallback to window.location.reload() after delay
        router.refresh()
        // Force full page reload after a short delay to ensure data is updated
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko patvirtinti nario',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error approving member:', error)
      toast({
        title: 'Klaida',
        description: error instanceof Error ? error.message : 'Įvyko klaida patvirtinant narį',
        variant: 'destructive',
      })
    } finally {
      setIsApproving(null)
    }
  }

  const handleRejectMember = async (member: Member) => {
    if (member.member_status !== 'PENDING') {
      toast({
        title: 'Klaida',
        description: 'Galima atmesti tik laukiančius narius',
        variant: 'destructive',
      })
      return
    }

    if (!member.id || typeof member.id !== 'string' || member.id.trim().length === 0) {
      toast({
        title: 'Klaida',
        description: 'Narystės ID nerastas',
        variant: 'destructive',
      })
      return
    }

    setIsRejecting(member.id)
    try {
      const result = await rejectMemberV2({
        membershipId: member.id,
        approvalNote: 'Atmesta per narių sąrašą',
      })

      if (result.success) {
        toast({
          title: 'Sėkmė',
          description: `${member.full_name || 'Narys'} sėkmingai atmestas`,
        })
        router.refresh()
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko atmesti nario',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error rejecting member:', error)
      toast({
        title: 'Klaida',
        description: error instanceof Error ? error.message : 'Įvyko klaida atmetant narį',
        variant: 'destructive',
      })
    } finally {
      setIsRejecting(null)
    }
  }

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      toast({
        title: 'Klaida',
        description: 'Prašome įvesti teisingą el. pašto adresą',
        variant: 'destructive',
      })
      return
    }

    setIsInviting(true)
    try {
      const result = await inviteMember(orgId, inviteEmail.trim())
      if (result.success) {
        toast({
          title: 'Sėkmė',
          description: `Kvietimas išsiųstas į ${inviteEmail}. Kvietimo nuoroda: ${result.inviteUrl}`,
        })
        setIsInviteDialogOpen(false)
        setInviteEmail('')
        // Refresh page to show new member if they accept immediately
        window.location.reload()
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko sukurti kvietimo',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error inviting member:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko klaida kuriant kvietimą',
        variant: 'destructive',
      })
    } finally {
      setIsInviting(false)
    }
  }

  // Helper function to render member row
  const renderMemberRow = (member: Member) => {
    const positions = positionsMap.get(member.user_id) || []
    const canChangeStatus = isOwner && currentUserId !== member.user_id
    
    // Dizainas pagal asociacija.net gaires v2026-01 – minimalistinis, audit-safe, institutional, vientisas visiems komponentams
    // Pataisytas vardo/pavardės rodymas - naudoja first_name + last_name jei full_name nėra
    // NOTE: listOrganizationMembers išskleidžia first_name ir last_name iš full_name
    // NOTE: first_name ir last_name dabar visada grąžinami (ne tik OWNER), nes jie išskleidžiami iš full_name
    // NOTE: Jei full_name yra null, tai first_name ir last_name taip pat bus null
    let displayName = member.full_name
    
    // Debug: log member data if name is missing (only in development)
    if ((!displayName || displayName.trim() === '') && process.env.NODE_ENV === 'development') {
      console.log('[MembersListClient] Member without full_name:', {
        id: member.id,
        user_id: member.user_id,
        full_name: member.full_name,
        first_name: member.first_name,
        last_name: member.last_name,
        email: member.email,
        isOwner,
      })
    }
    
    // Jei full_name nėra, bandome naudoti first_name ir last_name (jei jie yra)
    if (!displayName || displayName.trim() === '') {
      if (member.first_name && member.last_name) {
        displayName = `${member.first_name} ${member.last_name}`.trim()
      } else if (member.first_name) {
        displayName = member.first_name.trim()
      } else if (member.last_name) {
        displayName = member.last_name.trim()
      }
    }
    
    // Jei vis dar nieko nėra, rodomi email arba "N/A"
    if (!displayName || displayName.trim() === '') {
      displayName = member.email || 'N/A'
    }

    return (
      <div
        key={member.id}
        className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-200 dark:border-gray-700 last:border-b-0"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {displayName}
              </h4>
              <Badge variant={getStatusBadgeVariant(member.member_status)}>
                {getStatusLabel(member.member_status)}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400 flex-wrap">
              {/* Email visada rodomas, jei yra (OWNER gali matyti) */}
              {member.email ? (
                <span className="truncate flex items-center gap-1">
                  <span className="font-medium">El. paštas:</span>
                  <span>{member.email}</span>
                </span>
              ) : (
                // Jei email nėra, bet yra user_id, galime rodyti placeholder
                <span className="text-gray-400 dark:text-gray-500 italic text-xs">
                  El. paštas nerodomas
                </span>
              )}
              {positions.length > 0 && (
                <span className="flex items-center gap-1">
                  <span className="font-medium">Pareigos:</span>
                  <span>{positions.join(', ')}</span>
                </span>
              )}
            </div>
          </div>
        </div>
        
        {isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Atidaryti meniu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canChangeStatus ? (
                <>
                  {/* Show Approve/Reject options for PENDING members */}
                  {member.member_status === 'PENDING' && (
                    <>
                      <DropdownMenuItem 
                        onClick={() => handleApproveMember(member)}
                        disabled={isApproving === member.id || isRejecting === member.id}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                        {isApproving === member.id ? 'Patvirtinama...' : 'Patvirtinti narį'}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleRejectMember(member)}
                        disabled={isApproving === member.id || isRejecting === member.id}
                        className="text-red-600 focus:text-red-600"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        {isRejecting === member.id ? 'Atmetama...' : 'Atmesti narį'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={() => handleEditMemberName(member)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Redaguoti vardą
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange(member)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Keisti statusą
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleAssignPosition(member)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Priskirti pareigas
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem disabled>
                  <span className="text-gray-500 dark:text-gray-400">
                    Negalima keisti savo statuso
                  </span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Nariai</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Bendruomenės narių sąrašas
            </p>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
              Visi nariai su statusais ir pareigomis. {isOwner && 'OWNER gali keisti narių statusus.'}
            </p>
          </div>
          {isOwner && (
            <Button onClick={() => setIsInviteDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Pakviesti narį
            </Button>
          )}
        </div>

        {(() => {
          // Filter out LEFT status members and sort by status priority
          const statusPriority: Record<string, number> = {
            'PENDING': 1,
            'ACTIVE': 2,
            'SUSPENDED': 3,
          }
          
          const filteredAndSortedMembers = members
            .filter(member => member.member_status !== 'LEFT')
            .sort((a, b) => {
              const priorityA = statusPriority[a.member_status] || 999
              const priorityB = statusPriority[b.member_status] || 999
              if (priorityA !== priorityB) {
                return priorityA - priorityB
              }
              // If same status, sort by name
              const nameA = (a.full_name || '').toLowerCase()
              const nameB = (b.full_name || '').toLowerCase()
              return nameA.localeCompare(nameB)
            })

          // Group by status for better organization
          const groupedMembers = {
            PENDING: filteredAndSortedMembers.filter(m => m.member_status === 'PENDING'),
            ACTIVE: filteredAndSortedMembers.filter(m => m.member_status === 'ACTIVE'),
            SUSPENDED: filteredAndSortedMembers.filter(m => m.member_status === 'SUSPENDED'),
          }

          if (filteredAndSortedMembers.length === 0) {
            return (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800">
                Narių nėra
              </div>
            )
          }

          return (
            <div className="space-y-6">
              {/* PENDING Members Section */}
              {groupedMembers.PENDING.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                    Laukia patvirtinimo ({groupedMembers.PENDING.length})
                  </h2>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                    {groupedMembers.PENDING.map((member) => {
                      return renderMemberRow(member)
                    })}
                  </div>
                </div>
              )}

              {/* ACTIVE Members Section */}
              {groupedMembers.ACTIVE.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                    Aktyvūs nariai ({groupedMembers.ACTIVE.length})
                  </h2>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                    {groupedMembers.ACTIVE.map((member) => {
                      return renderMemberRow(member)
                    })}
                  </div>
                </div>
              )}

              {/* SUSPENDED Members Section */}
              {groupedMembers.SUSPENDED.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500"></span>
                    Sustabdyti nariai ({groupedMembers.SUSPENDED.length})
                  </h2>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                    {groupedMembers.SUSPENDED.map((member) => {
                      return renderMemberRow(member)
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })()}
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

      {selectedMemberForEdit && (
        <EditMemberNameModal
          open={isEditNameModalOpen}
          onOpenChange={setIsEditNameModalOpen}
          orgId={orgId}
          userId={selectedMemberForEdit.userId}
          currentFullName={selectedMemberForEdit.fullName}
          currentFirstName={selectedMemberForEdit.firstName}
          currentLastName={selectedMemberForEdit.lastName}
        />
      )}

      {/* Invite Member Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pakviesti naują narį</DialogTitle>
            <DialogDescription>
              Įveskite el. pašto adresą, į kurį bus išsiųstas kvietimas prisijungti prie bendruomenės.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="invite-email">El. pašto adresas</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="vardas@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isInviting) {
                    handleInviteMember()
                  }
                }}
                disabled={isInviting}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsInviteDialogOpen(false)
                setInviteEmail('')
              }}
              disabled={isInviting}
            >
              Atšaukti
            </Button>
            <Button onClick={handleInviteMember} disabled={isInviting}>
              {isInviting ? 'Siunčiama...' : 'Siųsti kvietimą'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

