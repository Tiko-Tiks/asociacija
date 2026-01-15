'use client'

import Link from 'next/link'
import { Calendar, MapPin, FileText, ChevronRight, Clock, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Meeting, AgendaItem } from '@/app/actions/meetings'

interface PublishedMeetingCardProps {
  meeting: Meeting
  agendaItems: AgendaItem[]
  orgSlug: string
  isAuthenticated: boolean
  pendingVotes?: number
}

export function PublishedMeetingCard({
  meeting,
  agendaItems,
  orgSlug,
  isAuthenticated,
  pendingVotes = 0,
}: PublishedMeetingCardProps) {
  const hasCompletedVoting = pendingVotes === 0 && agendaItems.length > 0
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('lt-LT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('lt-LT', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Show only first 3 agenda items for preview
  const previewItems = agendaItems.slice(0, 3)
  const hasMore = agendaItems.length > 3

  return (
    <Card className={hasCompletedVoting 
      ? "border-2 border-green-200 bg-green-50/50 dark:bg-green-900/10" 
      : "border-2 border-blue-200 bg-blue-50/50 dark:bg-blue-900/10"
    }>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {hasCompletedVoting ? (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Balsavimas užbaigtas
                </Badge>
              ) : (
                <Badge variant="default" className="bg-blue-600">
                  Naujas susirinkimas
                </Badge>
              )}
              {meeting.published_at && (
                <span className="text-xs text-slate-500">
                  Paskelbta: {new Date(meeting.published_at).toLocaleDateString('lt-LT')}
                </span>
              )}
            </div>
            <CardTitle className="text-xl mb-2">{meeting.title}</CardTitle>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(meeting.scheduled_at)}</span>
              </div>
              {meeting.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  <span>{meeting.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Agenda Preview */}
        {agendaItems.length > 0 ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-slate-600" />
              <h4 className="font-semibold text-slate-900">Darbotvarkė ({agendaItems.length} klausimai)</h4>
            </div>
            <div className="space-y-2">
              {previewItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-2 rounded bg-white dark:bg-slate-800 border border-slate-200"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-semibold flex items-center justify-center">
                    {item.item_no}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {item.title}
                    </p>
                    {item.summary && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                        {item.summary}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {hasMore && (
                <p className="text-xs text-slate-500 text-center py-1">
                  + {agendaItems.length - 3} daugiau klausimų...
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Darbotvarkė dar nėra suformuota</p>
        )}

        {/* Action Button */}
        {isAuthenticated ? (
          hasCompletedVoting ? (
            <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded text-center">
              <p className="text-sm text-green-800 dark:text-green-300 font-medium">
                <CheckCircle2 className="h-4 w-4 inline mr-2" />
                Ačiū! Jūsų balsai užregistruoti. Laukite susirinkimo rezultatų.
              </p>
              <Link 
                href={`/dashboard/${orgSlug}/meetings/${meeting.id}`}
                className="text-xs text-green-600 hover:text-green-700 underline mt-1 inline-block"
              >
                Peržiūrėti savo balsus
              </Link>
            </div>
          ) : (
            <Button asChild className="w-full" variant="default">
              <Link href={`/dashboard/${orgSlug}/meetings/${meeting.id}`}>
                Susipažinti su darbotvarke ir balsuoti
                <ChevronRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          )
        ) : (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded">
            <p className="text-sm text-amber-800 dark:text-amber-300 text-center">
              <Clock className="h-4 w-4 inline mr-1" />
              Prisijunkite, kad galėtumėte susipažinti su darbotvarke ir balsuoti
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

