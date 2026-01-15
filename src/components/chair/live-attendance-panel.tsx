'use client'

/**
 * LIVE ATTENDANCE PANEL
 * 
 * Rodo susirinkimo dalyvius (gyvai + nuotoliniu būdu).
 * 
 * @version 18.8.6
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, UserCheck, Wifi, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface Attendee {
  id: string
  name: string
  mode: 'IN_PERSON' | 'REMOTE'
  registeredAt: string
}

interface LiveAttendancePanelProps {
  meetingId: string
  remoteCount: number
  liveCount: number
  totalMembers: number
}

export function LiveAttendancePanel({
  meetingId,
  remoteCount: initialRemoteCount,
  liveCount: initialLiveCount,
  totalMembers,
}: LiveAttendancePanelProps) {
  const [remoteCount, setRemoteCount] = useState(initialRemoteCount)
  const [liveCount, setLiveCount] = useState(initialLiveCount)
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [loading, setLoading] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const totalParticipants = remoteCount + liveCount
  const participationRate = totalMembers > 0 ? Math.round((totalParticipants / totalMembers) * 100) : 0

  // Fetch detailed attendee list
  const fetchAttendees = async () => {
    if (!showDetails) return

    setLoading(true)
    try {
      const supabase = createClient()

      // Get remote voters with profiles
      const { data: remoteVoters } = await supabase
        .from('meeting_remote_voters')
        .select(`
          id,
          registered_at,
          memberships!inner (
            profiles!inner (
              id,
              full_name
            )
          )
        `)
        .eq('meeting_id', meetingId)

      // Get live attendees with profiles
      const { data: liveAttendees } = await supabase
        .from('meeting_attendance')
        .select(`
          id,
          checked_in_at,
          memberships!inner (
            profiles!inner (
              id,
              full_name
            )
          )
        `)
        .eq('meeting_id', meetingId)
        .eq('present', true)
        .eq('mode', 'IN_PERSON')

      const attendeesList: Attendee[] = []

      // Process remote voters
      if (remoteVoters) {
        remoteVoters.forEach((rv: any) => {
          attendeesList.push({
            id: rv.id,
            name: rv.memberships?.profiles?.full_name || 'Nežinomas',
            mode: 'REMOTE',
            registeredAt: rv.registered_at,
          })
        })
      }

      // Process live attendees
      if (liveAttendees) {
        liveAttendees.forEach((la: any) => {
          attendeesList.push({
            id: la.id,
            name: la.memberships?.profiles?.full_name || 'Nežinomas',
            mode: 'IN_PERSON',
            registeredAt: la.checked_in_at,
          })
        })
      }

      // Sort by registration time
      attendeesList.sort(
        (a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime()
      )

      setAttendees(attendeesList)
      setRemoteCount(remoteVoters?.length || 0)
      setLiveCount(liveAttendees?.length || 0)
    } catch (error) {
      console.error('Error fetching attendees:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (showDetails) {
      fetchAttendees()
    }
  }, [showDetails, meetingId])

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('lt-LT', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Dalyvavimas
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Slėpti' : 'Rodyti sąrašą'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
              <Wifi className="h-4 w-4" />
              <span className="text-sm font-medium">Nuotoliniu</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{remoteCount}</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
              <UserCheck className="h-4 w-4" />
              <span className="text-sm font-medium">Gyvai</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{liveCount}</p>
          </div>
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-slate-600 mb-1">
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">Iš viso</span>
            </div>
            <p className="text-2xl font-bold text-slate-700">
              {totalParticipants}
              <span className="text-sm font-normal text-slate-500">/{totalMembers}</span>
            </p>
          </div>
        </div>

        {/* Participation Rate */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Dalyvavimo lygis</span>
            <span className="font-medium">{participationRate}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                participationRate >= 50 ? 'bg-green-500' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(participationRate, 100)}%` }}
            />
          </div>
        </div>

        {/* Detailed List */}
        {showDetails && (
          <div className="border-t pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-slate-700">Dalyvių sąrašas</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchAttendees}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {attendees.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                {loading ? 'Kraunama...' : 'Nėra užsiregistravusių dalyvių'}
              </p>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-1">
                {attendees.map((attendee) => (
                  <div
                    key={attendee.id}
                    className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={attendee.mode === 'REMOTE' ? 'secondary' : 'default'}
                        className={
                          attendee.mode === 'REMOTE'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }
                      >
                        {attendee.mode === 'REMOTE' ? (
                          <Wifi className="h-3 w-3 mr-1" />
                        ) : (
                          <UserCheck className="h-3 w-3 mr-1" />
                        )}
                        {attendee.mode === 'REMOTE' ? 'Nuotoliu' : 'Gyvai'}
                      </Badge>
                      <span className="text-sm font-medium">{attendee.name}</span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {formatTime(attendee.registeredAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

