"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Users, Clock, DollarSign, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { lt } from "date-fns/locale"

interface Meeting {
  id: string
  title: string
  scheduled_at: string
  quorum_met: boolean | null
  created_at: string
}

interface Ruleset {
  quorum_percentage: number
  notice_period_days: number
  annual_fee: number
}

interface GovernanceDashboardClientProps {
  meetings: Meeting[]
  ruleset: Ruleset | null
  membershipId: string
  orgSlug: string
  userRole: 'OWNER' | 'ADMIN' | 'CHAIR' | 'MEMBER'
  pilotMode?: boolean
}

export function GovernanceDashboardClient({
  meetings,
  ruleset,
  membershipId,
  orgSlug,
  userRole,
  pilotMode = false,
}: GovernanceDashboardClientProps) {
  const router = useRouter()
  const isOwner = userRole === 'OWNER'

  // Separate upcoming and past meetings
  const now = new Date()
  const upcoming = meetings.filter((m) => new Date(m.scheduled_at) >= now)
  const past = meetings.filter((m) => new Date(m.scheduled_at) < now)

  const handleCreateMeeting = () => {
    router.push(`/dashboard/${orgSlug}/governance/new`)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Sprendimai (pagal protokolą)</h1>
            <p className="mt-1 text-sm text-slate-600">
              Susirinkimų valdymas ir protokolų archyvas
            </p>
          </div>
          {/* Pilot Mode Badge */}
          {pilotMode && isOwner && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              PILOT MODE
            </Badge>
          )}
        </div>
        {isOwner && (
          <Button
            onClick={handleCreateMeeting}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Plus className="mr-2 h-4 w-4" />
            Šaukti Susirinkimą
          </Button>
        )}
      </div>

      {/* Active Ruleset Summary */}
      {ruleset && (
        <Card>
          <CardHeader>
            <CardTitle>Aktyvios Taisyklės</CardTitle>
            <CardDescription>
              Dabartinė bendruomenės konstitucijos versija
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Quorum calculation hidden in pilot - protocol is source of truth */}
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Kvorumas</p>
                  <p className="text-2xl font-semibold">{ruleset.quorum_percentage}%</p>
                  <p className="text-xs text-muted-foreground">(informacinis)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Perspėjimo Laikotarpis</p>
                  <p className="text-2xl font-semibold">{ruleset.notice_period_days} d.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Metinis Mokestis</p>
                  <p className="text-2xl font-semibold">{ruleset.annual_fee.toFixed(2)} €</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Meetings */}
      {upcoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Artėjantys Susirinkimai</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcoming.map((meeting) => (
                <Link
                  key={meeting.id}
                  href={`/dashboard/${orgSlug}/governance/${meeting.id}`}
                  className="block p-4 border rounded-lg hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{meeting.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(meeting.scheduled_at), 'PPpp', { locale: lt })}
                        </p>
                      </div>
                    </div>
                    {/* Quorum status hidden in pilot - protocol is source of truth */}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Past Meetings */}
      {past.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Praėję Susirinkimai</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {past.map((meeting) => (
                <Link
                  key={meeting.id}
                  href={`/dashboard/${orgSlug}/governance/${meeting.id}`}
                  className="block p-4 border rounded-lg hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{meeting.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(meeting.scheduled_at), 'PPpp', { locale: lt })}
                        </p>
                      </div>
                    </div>
                    {/* Quorum status hidden in pilot - protocol is source of truth */}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State - Only show for OWNER */}
      {meetings.length === 0 && isOwner && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Susirinkimų nėra
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Paspauskite &quot;Šaukti Susirinkimą&quot; norint sukurti naują susirinkimą.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

