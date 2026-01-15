"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Calendar, Users, Clock, DollarSign, Plus, MoreVertical, Edit, Trash2, Eye } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { formatDateLT } from "@/lib/utils"
import { deleteMeeting, updateMeeting } from "@/app/actions/meetings"
import { useToast } from "@/components/ui/use-toast"

interface Meeting {
  id: string
  title: string
  scheduled_at: string
  status?: string
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
  const { toast } = useToast()
  const isOwner = userRole === 'OWNER'
  const [deletingMeetingId, setDeletingMeetingId] = useState<string | null>(null)

  // Filter out CANCELLED meetings and categorize
  const activeMeetings = meetings.filter((m) => m.status !== 'CANCELLED')
  
  // DRAFT meetings - at the very top
  const drafts = activeMeetings
    .filter((m) => m.status === 'DRAFT')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  
  // COMPLETED meetings - sorted by date (newest first)
  const completed = activeMeetings
    .filter((m) => m.status === 'COMPLETED')
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
  
  // Upcoming PUBLISHED meetings (future dates)
  const now = new Date()
  const upcoming = activeMeetings
    .filter((m) => m.status === 'PUBLISHED' && new Date(m.scheduled_at) >= now)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
  
  // Past PUBLISHED meetings (not yet marked as COMPLETED)
  const pastPublished = activeMeetings
    .filter((m) => m.status === 'PUBLISHED' && new Date(m.scheduled_at) < now)
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())

  const handleCreateMeeting = () => {
    router.push(`/dashboard/${orgSlug}/governance/new`)
  }

  const handleDelete = async (meetingId: string) => {
    try {
      const result = await deleteMeeting(meetingId)
      if (result.success) {
        toast({
          title: 'Sėkmė',
          description: 'Susirinkimas sėkmingai ištrintas',
        })
        router.refresh()
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko ištrinti susirinkimo',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error deleting meeting:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko klaida trinant susirinkimą',
        variant: 'destructive',
      })
    } finally {
      setDeletingMeetingId(null)
    }
  }

  const handleEdit = (meetingId: string) => {
    router.push(`/dashboard/${orgSlug}/governance/${meetingId}/edit`)
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
            Šaukti susirinkimą
          </Button>
        )}
      </div>

      {/* DRAFT Meetings - At the very top */}
      {drafts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-amber-600" />
              Juodraščiai
            </CardTitle>
            <CardDescription>Susirinkimai, kurie dar nepaskelbti</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg divide-y bg-white">
              {drafts.map((meeting) => (
                <div
                  key={meeting.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <Link
                    href={`/dashboard/${orgSlug}/governance/${meeting.id}`}
                    className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-amber-500 shrink-0" />
                        <h4 className="font-medium text-slate-900 truncate">
                          {meeting.title}
                        </h4>
                        <Badge variant="outline" className="shrink-0 bg-amber-100 text-amber-700 border-amber-300">
                          Juodraštis
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mt-1 ml-8">
                        Planuojama: {formatDateLT(meeting.scheduled_at, 'datetime')}
                      </p>
                    </div>
                  </Link>
                  
                  {isOwner && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Atidaryti meniu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/${orgSlug}/governance/${meeting.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            Peržiūrėti
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEdit(meeting.id)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Redaguoti
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeletingMeetingId(meeting.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Ištrinti
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming PUBLISHED Meetings */}
      {upcoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Artėjantys susirinkimai
            </CardTitle>
            <CardDescription>Paskelbti susirinkimai, kurie įvyks ateityje</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg divide-y bg-white">
              {upcoming.map((meeting) => (
                <div
                  key={meeting.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <Link
                    href={`/dashboard/${orgSlug}/governance/${meeting.id}`}
                    className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-blue-500 shrink-0" />
                        <h4 className="font-medium text-slate-900 truncate">
                          {meeting.title}
                        </h4>
                        <Badge variant="default" className="shrink-0">
                          Paskelbtas
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mt-1 ml-8">
                        {formatDateLT(meeting.scheduled_at, 'datetime')}
                      </p>
                    </div>
                  </Link>
                  
                  {isOwner && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Atidaryti meniu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/${orgSlug}/governance/${meeting.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            Peržiūrėti
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Past PUBLISHED Meetings - Need completion */}
      {pastPublished.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              Laukia užbaigimo
            </CardTitle>
            <CardDescription>Praėję susirinkimai, kuriuos reikia užbaigti</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg divide-y bg-white">
              {pastPublished.map((meeting) => (
                <div
                  key={meeting.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <Link
                    href={`/dashboard/${orgSlug}/governance/${meeting.id}`}
                    className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-orange-500 shrink-0" />
                        <h4 className="font-medium text-slate-900 truncate">
                          {meeting.title}
                        </h4>
                        <Badge variant="outline" className="shrink-0 bg-orange-100 text-orange-700 border-orange-300">
                          Laukia užbaigimo
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mt-1 ml-8">
                        {formatDateLT(meeting.scheduled_at, 'datetime')}
                      </p>
                    </div>
                  </Link>
                  
                  {isOwner && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Atidaryti meniu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/${orgSlug}/governance/${meeting.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            Peržiūrėti ir užbaigti
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* COMPLETED Meetings - Sorted by date, newest first */}
      {completed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-green-600" />
              Užbaigti susirinkimai
            </CardTitle>
            <CardDescription>Protokolų archyvas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg divide-y bg-white">
              {completed.map((meeting) => (
                <div
                  key={meeting.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <Link
                    href={`/dashboard/${orgSlug}/governance/${meeting.id}`}
                    className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-green-500 shrink-0" />
                        <h4 className="font-medium text-slate-900 truncate">
                          {meeting.title}
                        </h4>
                        <Badge variant="outline" className="shrink-0 bg-green-100 text-green-700 border-green-300">
                          Užbaigtas
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mt-1 ml-8">
                        {formatDateLT(meeting.scheduled_at, 'datetime')}
                      </p>
                    </div>
                  </Link>
                  
                  {isOwner && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Atidaryti meniu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/${orgSlug}/governance/${meeting.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            Peržiūrėti protokolą
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State - Only show for OWNER */}
      {activeMeetings.length === 0 && isOwner && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Susirinkimų nėra
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Paspauskite &quot;Šaukti susirinkimą&quot; norint sukurti naują susirinkimą.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletingMeetingId !== null} onOpenChange={(open) => !open && setDeletingMeetingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ištrinti susirinkimą?</AlertDialogTitle>
            <AlertDialogDescription>
              Ar tikrai norite ištrinti šį susirinkimą? Šis veiksmas negrįžtamas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Atšaukti</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingMeetingId && handleDelete(deletingMeetingId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Ištrinti
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
