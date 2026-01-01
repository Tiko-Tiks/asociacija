"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, CreditCard, FolderKanban, Calendar, Activity, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { lt } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"

interface DashboardStats {
  members: {
    totalActive: number
  }
  invoices: {
    unpaidCount: number
    unpaidSum: number
  }
  projects: {
    activeCount: number
  }
  meetings: {
    nextMeeting: {
      id: string
      title: string
      scheduled_at: string
    } | null
  }
  userActions: {
    hasUnpaidInvoices: boolean
    unmarkedAttendance: {
      meetingId: string
      meetingTitle: string
      scheduledAt: string
    } | null
  }
  recentActivity: Array<{
    id: string
    event_type: string
    actor_name: string | null
    created_at: string
  }>
}

interface DashboardClientProps {
  stats: DashboardStats
  orgId: string
  orgSlug: string
  userRole: 'OWNER' | 'ADMIN' | 'CHAIR' | 'MEMBER'
}

export function DashboardClient({ stats, orgId, orgSlug, userRole }: DashboardClientProps) {
  const isMember = userRole === 'MEMBER'

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Apžvalga</h1>
        <p className="mt-1 text-sm text-slate-600">
          Bendruomenės veiklos apžvalga
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Members Card */}
        <Link
          href={`/dashboard/${orgSlug}/members`}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
        >
          <Card className="h-full hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nariai</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.members.totalActive}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Aktyvūs nariai
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Invoices Card - Hide if MEMBER and no invoices */}
        {(!isMember || stats.invoices.unpaidCount > 0) && (
          <Link
            href={`/dashboard/${orgSlug}/invoices`}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
          >
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Biudžetas</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.invoices.unpaidCount}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Neapmokėtos sąskaitos • {stats.invoices.unpaidSum.toFixed(2)} €
                </p>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Projects Card - Hide if MEMBER and no projects */}
        {(!isMember || stats.projects.activeCount > 0) && (
          <Link
            href={`/dashboard/${orgSlug}/projects`}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
          >
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Projektai</CardTitle>
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.projects.activeCount}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Aktyvūs projektai
                </p>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Meetings Card - Hide if MEMBER and no meetings, show for OWNER always */}
        {stats.meetings.nextMeeting ? (
          <Link
            href={`/dashboard/${orgSlug}/governance`}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
          >
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Kvorumas</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium line-clamp-1">
                  {stats.meetings.nextMeeting.title}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(stats.meetings.nextMeeting.scheduled_at), 'PP', { locale: lt })}
                </p>
              </CardContent>
            </Card>
          </Link>
        ) : (
          /* Show for OWNER only when no meetings */
          !isMember && (
            <Link
              href={`/dashboard/${orgSlug}/governance`}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
            >
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Kvorumas</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-medium text-muted-foreground">
                    Nėra artėjančių susirinkimų
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        )}
      </div>

      {/* Action Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* My Actions Widget */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Mano Veiksmai
            </CardTitle>
            <CardDescription>
              Reikalingi jūsų veiksmai
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.userActions.hasUnpaidInvoices && (
              <div className="flex items-start gap-3 p-3 border rounded-lg bg-amber-50 border-amber-200">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900">
                    Jūs turite neapmokėtų sąskaitų!
                  </p>
                  <Link
                    href={`/dashboard/${orgSlug}/invoices`}
                    className="text-xs text-amber-700 hover:underline mt-1 inline-block"
                  >
                    Peržiūrėti sąskaitas →
                  </Link>
                </div>
              </div>
            )}

            {stats.userActions.unmarkedAttendance && (
              <div className="flex items-start gap-3 p-3 border rounded-lg bg-blue-50 border-blue-200">
                <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    Dalyvavimas nežymėtas
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    {stats.userActions.unmarkedAttendance.meetingTitle}
                  </p>
                  <Link
                    href={`/dashboard/${orgSlug}/governance/${stats.userActions.unmarkedAttendance.meetingId}`}
                    className="text-xs text-blue-700 hover:underline mt-1 inline-block"
                  >
                    Pažymėti dalyvavimą →
                  </Link>
                </div>
              </div>
            )}

            {!stats.userActions.hasUnpaidInvoices && !stats.userActions.unmarkedAttendance && !isMember && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nėra reikalingų veiksmų
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Widget - Hide if MEMBER and no activity */}
        {(!isMember || stats.recentActivity.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Naujausi Įvykiai
              </CardTitle>
              <CardDescription>
                Paskutiniai 5 veiksmai sistemoje
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Įvykių nėra
                </p>
              ) : (
                <div className="space-y-3">
                  {stats.recentActivity.map((event) => (
                    <div key={event.id} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {event.event_type}
                          </Badge>
                          {event.actor_name && (
                            <span className="text-xs text-muted-foreground">
                              {event.actor_name}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(event.created_at), 'PPp', { locale: lt })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!isMember && (
                <div className="mt-4 pt-4 border-t">
                  <Link
                    href={`/dashboard/${orgSlug}/history`}
                    className="text-sm text-primary hover:underline"
                  >
                    Peržiūrėti visą istoriją →
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

