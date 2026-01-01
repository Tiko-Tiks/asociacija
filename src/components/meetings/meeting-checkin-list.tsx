'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
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
  const [searchQuery, setSearchQuery] = useState('')
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  const canManage = isOwner || isBoard

  useEffect(() => {
    loadAttendance()
  }, [meetingId])

  const loadAttendance = async () => {
    try {
      setLoading(true)
      const data = await getMeetingAttendance(meetingId)
      setMembers(data)
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

  const handleCheckIn = async (membershipId: string) => {
    if (!canManage) {
      toast({
        title: 'Klaida',
        description: 'Neturite teisių',
        variant: 'destructive',
      })
      return
    }

    setProcessingIds((prev) => new Set(prev).add(membershipId))

    try {
      const result = await registerInPersonAttendance(meetingId, membershipId)

      if (result.ok) {
        toast({
          title: 'Sėkmė',
          description: 'Narys sėkmingai pažymėtas kaip dalyvaujantis',
        })
        await loadAttendance()
      } else {
        const errorMessage =
          result.reason === 'REMOTE_ALREADY_VOTED'
            ? 'Balsavo nuotoliu – registruoti gyvai negalima'
            : result.reason === 'FORBIDDEN'
              ? 'Neturite teisių'
              : 'Nepavyko pažymėti nario'

        toast({
          title: 'Klaida',
          description: errorMessage,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error checking in member:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko klaida',
        variant: 'destructive',
      })
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev)
        next.delete(membershipId)
        return next
      })
    }
  }

  const handleCheckOut = async (membershipId: string) => {
    if (!canManage) {
      toast({
        title: 'Klaida',
        description: 'Neturite teisių',
        variant: 'destructive',
      })
      return
    }

    setProcessingIds((prev) => new Set(prev).add(membershipId))

    try {
      const result = await unregisterInPersonAttendance(meetingId, membershipId)

      if (result.ok) {
        toast({
          title: 'Sėkmė',
          description: 'Narys pašalintas iš dalyvaujančių',
        })
        await loadAttendance()
      } else {
        toast({
          title: 'Klaida',
          description: 'Nepavyko pašalinti nario',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error checking out member:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko klaida',
        variant: 'destructive',
      })
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev)
        next.delete(membershipId)
        return next
      })
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
        member.full_name?.toLowerCase().includes(query) ||
        member.membership_id.toLowerCase().includes(query)
    )
  }, [members, searchQuery])

  // Count statistics
  const stats = useMemo(() => {
    const present = filteredMembers.filter((m) => m.present).length
    const remote = filteredMembers.filter((m) => m.voted_remotely).length
    const total = filteredMembers.length

    return { present, remote, total }
  }, [filteredMembers])

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
        <CardTitle>Dalyvavimo registracija</CardTitle>
        <CardDescription>
          Pažymėkite narius, kurie dalyvauja gyvai. Nariai, kurie balsavo nuotoliu, negali būti
          registruoti gyvai.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Ieškoti pagal vardą arba ID..."
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
        </div>

        {/* Members List */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">
              {searchQuery ? 'Narių nerasta' : 'Narių nėra'}
            </div>
          ) : (
            filteredMembers.map((member) => {
              const isProcessing = processingIds.has(member.membership_id)
              const canCheckIn = canManage && !member.present && !member.voted_remotely
              const canCheckOut = canManage && member.present && !member.voted_remotely
              const isDisabled = member.voted_remotely

              return (
                <div
                  key={member.membership_id}
                  className={`flex items-center justify-between p-3 border rounded-lg ${
                    isDisabled ? 'bg-gray-50 opacity-75' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">
                          {member.full_name || 'Nenurodytas vardas'}
                        </p>
                        {member.present && (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Dalyvauja
                          </Badge>
                        )}
                        {member.voted_remotely && (
                          <Badge variant="outline" className="text-blue-600 border-blue-300">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Balsavo nuotoliu
                          </Badge>
                        )}
                      </div>
                      {member.joined_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          Prisijungė: {new Date(member.joined_at).toLocaleString('lt-LT')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isDisabled ? (
                      <div className="text-xs text-gray-500 text-right max-w-[200px]">
                        Balsavo nuotoliu – registruoti gyvai negalima
                      </div>
                    ) : canCheckIn ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCheckIn(member.membership_id)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Pažymėti dalyvauja
                          </>
                        )}
                      </Button>
                    ) : canCheckOut ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCheckOut(member.membership_id)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 mr-1" />
                            Pašalinti
                          </>
                        )}
                      </Button>
                    ) : null}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}

