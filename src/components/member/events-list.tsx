"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin } from 'lucide-react'

interface Event {
  id: string
  title: string
  date: string
  location: string | null
  type: string
}

interface EventsListProps {
  events: Event[]
}

export function EventsList({ events }: EventsListProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('lt-LT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('lt-LT', {
      day: 'numeric',
      month: 'short',
    })
  }

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'MEETING':
        return 'Posėdis'
      case 'WORK':
        return 'Talka'
      case 'CELEBRATION':
        return 'Šventė'
      default:
        return type
    }
  }

  const getEventTypeVariant = (type: string) => {
    switch (type) {
      case 'MEETING':
        return 'default'
      case 'WORK':
        return 'secondary'
      case 'CELEBRATION':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  if (events.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-1">Artimiausi Renginiai</h2>
          <p className="text-sm text-slate-600">
            Būsimi bendruomenės renginiai
          </p>
        </div>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Nėra artimiausių renginių</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-1">Artimiausi Renginiai</h2>
        <p className="text-sm text-slate-600">
          Būsimi bendruomenės renginiai
        </p>
      </div>

      <div className="space-y-3">
        {events.map((event) => (
          <Card key={event.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-slate-100 border">
                    <span className="text-xs font-medium text-slate-600">
                      {formatDateShort(event.date)}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <CardTitle className="text-base font-medium line-clamp-2">
                      {event.title}
                    </CardTitle>
                    <Badge variant={getEventTypeVariant(event.type) as any} className="flex-shrink-0">
                      {getEventTypeLabel(event.type)}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(event.date)}</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

