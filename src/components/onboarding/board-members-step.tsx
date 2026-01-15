"use client"

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Users, AlertCircle, CheckCircle2, UserPlus } from 'lucide-react'
import { listOrganizationMembers } from '@/app/actions/members'
import { assignBoardMembersOnboarding } from '@/app/actions/board-members'

interface BoardMembersStepProps {
  orgId: string
  membershipId: string
  boardMemberCount: number
  termStart: string
  termEnd: string
  onComplete: () => void
  onBack?: () => void
}

interface MemberOption {
  id: string
  membership_id: string
  user_id: string
  full_name: string
  email: string | null
}

export function BoardMembersStep({
  orgId,
  membershipId,
  boardMemberCount,
  termStart,
  termEnd,
  onComplete,
  onBack,
}: BoardMembersStepProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [availableMembers, setAvailableMembers] = useState<MemberOption[]>([])
  const [selectedMembers, setSelectedMembers] = useState<(string | null)[]>([])

  // Initialize selected members array based on board member count
  useEffect(() => {
    setSelectedMembers(Array(boardMemberCount).fill(null))
  }, [boardMemberCount])

  // Load available members
  useEffect(() => {
    const loadMembers = async () => {
      setLoading(true)
      try {
        const members = await listOrganizationMembers(membershipId, true)
        
        // Filter out the owner (chairman) - they're already assigned
        const filteredMembers = members
          .filter(m => m.role !== 'OWNER' && m.status === 'ACTIVE')
          .map(m => ({
            id: m.id,
            membership_id: m.id,
            user_id: m.user_id,
            full_name: m.full_name || m.email || 'Nežinomas narys',
            email: m.email,
          }))
        
        setAvailableMembers(filteredMembers)
      } catch (error) {
        console.error('Error loading members:', error)
        toast({
          title: 'Klaida',
          description: 'Nepavyko įkelti narių sąrašo',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }
    loadMembers()
  }, [membershipId, toast])

  // Get available options for a specific slot (excluding already selected)
  const getAvailableOptionsForSlot = useCallback((slotIndex: number) => {
    const selectedInOtherSlots = selectedMembers
      .filter((_, idx) => idx !== slotIndex)
      .filter(Boolean) as string[]
    
    return availableMembers.filter(m => !selectedInOtherSlots.includes(m.membership_id))
  }, [availableMembers, selectedMembers])

  // Handle member selection
  const handleMemberSelect = (slotIndex: number, membershipId: string | null) => {
    const newSelected = [...selectedMembers]
    newSelected[slotIndex] = membershipId
    setSelectedMembers(newSelected)
  }

  // Check if all slots are filled
  const allSlotsFilled = useMemo(() => {
    return selectedMembers.every(m => m !== null && m !== '')
  }, [selectedMembers])

  // Check if we have enough members
  const hasEnoughMembers = availableMembers.length >= boardMemberCount

  // Handle submit
  const handleSubmit = async () => {
    if (!allSlotsFilled) {
      toast({
        title: 'Trūksta duomenų',
        description: 'Prašome pasirinkti visus valdybos narius',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      const membershipIds = selectedMembers.filter(Boolean) as string[]
      
      const result = await assignBoardMembersOnboarding(
        orgId,
        membershipIds,
        termStart,
        termEnd
      )

      if (result.success) {
        toast({
          title: 'Sėkmė!',
          description: 'Valdybos nariai sėkmingai priskirti',
        })
        onComplete()
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko priskirti valdybos narių',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error assigning board members:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko netikėta klaida',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto" />
          <p className="text-slate-600 mt-4">Įkeliami nariai...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl">Valdybos/Tarybos Sudėtis</CardTitle>
            <CardDescription>
              Pasirinkite {boardMemberCount} valdybos/tarybos {boardMemberCount === 1 ? 'narį' : 'narius'} iš esamų bendruomenės narių
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Warning if not enough members */}
        {!hasEnoughMembers && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Nepakanka narių
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Pagal įstatus reikia {boardMemberCount} valdybos {boardMemberCount === 1 ? 'nario' : 'narių'}, 
                bet turite tik {availableMembers.length} {availableMembers.length === 1 ? 'narį' : 'narius'} (be pirmininko).
                Prašome pirma pridėti daugiau narių į bendruomenę.
              </p>
            </div>
          </div>
        )}

        {/* Term info */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Kadencijos laikotarpis:</strong> {termStart} — {termEnd}
          </p>
          <p className="text-xs text-blue-700 mt-1">
            Visi pasirinkti nariai bus priskirti šiam kadencijos laikotarpiui.
          </p>
        </div>

        {/* Member selection slots */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">
            Pasirinkite valdybos/tarybos narius
          </Label>
          
          {Array.from({ length: boardMemberCount }).map((_, index) => {
            const availableOptions = getAvailableOptionsForSlot(index)
            const selectedValue = selectedMembers[index]
            const selectedMember = availableMembers.find(m => m.membership_id === selectedValue)
            
            return (
              <div key={index} className="flex items-center gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 text-sm font-medium flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <Select
                    value={selectedValue || ''}
                    onValueChange={(value) => handleMemberSelect(index, value || null)}
                    disabled={!hasEnoughMembers}
                  >
                    <SelectTrigger className={`w-full ${!selectedValue ? 'border-amber-300' : 'border-green-300'}`}>
                      <SelectValue placeholder="Pasirinkite narį...">
                        {selectedMember ? (
                          <span className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            {selectedMember.full_name}
                          </span>
                        ) : (
                          <span className="text-slate-500">Pasirinkite narį...</span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {availableOptions.length === 0 ? (
                        <div className="p-2 text-sm text-slate-500 text-center">
                          Nėra galimų narių
                        </div>
                      ) : (
                        availableOptions.map((member) => (
                          <SelectItem key={member.membership_id} value={member.membership_id}>
                            <div className="flex flex-col">
                              <span>{member.full_name}</span>
                              {member.email && (
                                <span className="text-xs text-slate-500">{member.email}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )
          })}
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <span className="text-sm text-slate-600">
            Pasirinkta: {selectedMembers.filter(Boolean).length} iš {boardMemberCount}
          </span>
          <span className={`text-sm font-medium ${allSlotsFilled ? 'text-green-600' : 'text-amber-600'}`}>
            {allSlotsFilled ? '✓ Visi nariai pasirinkti' : 'Prašome užpildyti visas vietas'}
          </span>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between pt-6 border-t">
          {onBack ? (
            <Button variant="outline" onClick={onBack}>
              Atgal
            </Button>
          ) : (
            <div />
          )}
          <Button
            onClick={handleSubmit}
            disabled={!allSlotsFilled || !hasEnoughMembers || submitting}
            className="min-w-[180px]"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Priskiriama...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Priskirti valdybą
              </>
            )}
          </Button>
        </div>

        {/* Help text */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-sm text-slate-700">
            <strong>Pastaba:</strong> Pasirinkti nariai automatiškai gaus pranešimą apie jų priskyrimą 
            valdybai/tarybai el. paštu. Prisijungę jie matys savo pareigas.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
