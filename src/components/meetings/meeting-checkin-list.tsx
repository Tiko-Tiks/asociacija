'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Search, CheckCircle, AlertCircle, Save } from 'lucide-react'
import {
  getMeetingAttendance,
  registerInPersonAttendance,
  unregisterInPersonAttendance,
  type MeetingAttendanceMember,
} from '@/app/actions/meeting-attendance'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'

interface MeetingCheckinListProps {
  meetingId: string
  orgId: string
  isOwner: boolean
  isBoard: boolean
}

export function MeetingCheckinList({
  meetingId,
  orgId,
  isOwner,
  isBoard,
}: MeetingCheckinListProps) {
  const { toast } = useToast()
  const [members, setMembers] = useState<MeetingAttendanceMember[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Track which members are checked (attending in person)
  const [checkedMembers, setCheckedMembers] = useState<Set<string>>(new Set())
  // Track original state to detect changes
  const [originalChecked, setOriginalChecked] = useState<Set<string>>(new Set())

  const canManage = isOwner || isBoard

  useEffect(() => {
    loadAttendance()
  }, [meetingId])

  const loadAttendance = async () => {
    try {
      setLoading(true)
      const data = await getMeetingAttendance(meetingId)
      setMembers(data)
      
      // Initialize checked state based on current attendance
      const inPersonIds = new Set(
        data
          .filter(m => m.attendance_type === 'IN_PERSON')
          .map(m => m.membership_id)
      )
      setCheckedMembers(inPersonIds)
      setOriginalChecked(new Set(inPersonIds))
    } catch (error) {
      console.error('Error loading attendance:', error)
      toast({
        title: 'Klaida',
        description: 'Nepavyko įkelti dalyvavimo sąrašo',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle checkbox toggle
  const handleToggle = (membershipId: string, checked: boolean) => {
    setCheckedMembers(prev => {
      const next = new Set(prev)
      if (checked) {
        next.add(membershipId)
      } else {
        next.delete(membershipId)
      }
      return next
    })
  }

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    if (checkedMembers.size !== originalChecked.size) return true
    for (const id of checkedMembers) {
      if (!originalChecked.has(id)) return true
    }
    for (const id of originalChecked) {
      if (!checkedMembers.has(id)) return true
    }
    return false
  }, [checkedMembers, originalChecked])

  // Save all changes
  const handleSaveChanges = async () => {
    if (!canManage) {
      toast({
        title: 'Klaida',
        description: 'Neturite teisių',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    
    try {
      // Find members to add (checked now, wasn't before)
      const toAdd = [...checkedMembers].filter(id => !originalChecked.has(id))
      // Find members to remove (was checked, not anymore)
      const toRemove = [...originalChecked].filter(id => !checkedMembers.has(id))
      
      let successCount = 0
      let errorCount = 0
      
      // Process additions
      for (const membershipId of toAdd) {
        const result = await registerInPersonAttendance(meetingId, membershipId)
        if (result.success) {
          successCount++
        } else {
          errorCount++
          console.error('Failed to register:', membershipId, result.error)
        }
      }
      
      // Process removals
      for (const membershipId of toRemove) {
        const result = await unregisterInPersonAttendance(meetingId, membershipId)
        if (result.success) {
          successCount++
        } else {
          errorCount++
          console.error('Failed to unregister:', membershipId, result.error)
        }
      }
      
      if (errorCount === 0) {
        toast({
          title: 'Išsaugota',
          description: `Sėkmingai atnaujinta ${successCount} narių dalyvavimas`,
        })
        // Update original state to match current
        setOriginalChecked(new Set(checkedMembers))
      } else {
        toast({
          title: 'Dalinė sėkmė',
          description: `Atnaujinta: ${successCount}, klaidų: ${errorCount}`,
          variant: 'destructive',
        })
        // Reload to get actual state
        await loadAttendance()
      }
    } catch (error) {
      console.error('Error saving changes:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko klaida išsaugant pakeitimus',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Filter members by search query
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) {
      return members
    }

    const query = searchQuery.toLowerCase()
    return members.filter(
      (member) =>
        member.member_name?.toLowerCase().includes(query) ||
        member.membership_id.toLowerCase().includes(query)
    )
  }, [members, searchQuery])

  // Count statistics
  const stats = useMemo(() => {
    const present = checkedMembers.size
    const remote = members.filter((m) => m.attendance_type === 'REMOTE').length
    const total = members.length

    return { present, remote, total }
  }, [members, checkedMembers])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Kraunama...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Dalyvavimo registracija</CardTitle>
            <CardDescription>
              Pažymėkite narius, kurie dalyvauja gyvai, ir spauskite "Išsaugoti".
            </CardDescription>
          </div>
          {canManage && hasChanges && (
            <Button
              onClick={handleSaveChanges}
              disabled={saving}
              className="ml-4"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saugoma...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Išsaugoti pakeitimus
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Ieškoti pagal vardą..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Statistics */}
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-gray-600">Iš viso:</span>
            <span className="ml-2 font-semibold">{stats.total}</span>
          </div>
          <div>
            <span className="text-gray-600">Dalyvauja gyvai:</span>
            <span className="ml-2 font-semibold text-green-600">{stats.present}</span>
          </div>
          <div>
            <span className="text-gray-600">Balsavo nuotoliu:</span>
            <span className="ml-2 font-semibold text-blue-600">{stats.remote}</span>
          </div>
          {hasChanges && (
            <div className="text-amber-600 font-medium">
              • Yra neišsaugotų pakeitimų
            </div>
          )}
        </div>

        {/* Members List */}
        <div className="space-y-1 max-h-[600px] overflow-y-auto">
          {filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">
              {searchQuery ? 'Narių nerasta' : 'Narių nėra'}
            </div>
          ) : (
            filteredMembers.map((member) => {
              const isRemote = member.attendance_type === 'REMOTE'
              const isChecked = checkedMembers.has(member.membership_id)
              const isDisabled = isRemote || !canManage

              return (
                <div
                  key={member.membership_id}
                  className={`flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors ${
                    isRemote ? 'bg-blue-50 border-blue-200' : ''
                  } ${isChecked && !isRemote ? 'bg-green-50 border-green-200' : ''}`}
                >
                  {/* Checkbox */}
                  <Checkbox
                    id={`member-${member.membership_id}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => handleToggle(member.membership_id, checked === true)}
                    disabled={isDisabled}
                    className={isDisabled ? 'opacity-50' : ''}
                  />
                  
                  {/* Member info */}
                  <label 
                    htmlFor={`member-${member.membership_id}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">
                        {member.member_name}
                      </p>
                      {isChecked && !isRemote && (
                        <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Gyvai
                        </Badge>
                      )}
                      {isRemote && (
                        <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Nuotoliu
                        </Badge>
                      )}
                    </div>
                  </label>
                  
                  {/* Remote voter info */}
                  {isRemote && (
                    <div className="text-xs text-blue-600">
                      Registruoti gyvai negalima
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Bottom save button for convenience */}
        {canManage && hasChanges && filteredMembers.length > 5 && (
          <div className="pt-4 border-t">
            <Button
              onClick={handleSaveChanges}
              disabled={saving}
              className="w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saugoma...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Išsaugoti pakeitimus ({[...checkedMembers].filter(id => !originalChecked.has(id)).length} pridėti, {[...originalChecked].filter(id => !checkedMembers.has(id)).length} pašalinti)
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
