/**
 * CHAIR MEETING HEADER
 * 
 * Atsakomybė:
 * - Rodo meeting kontekstą (title, date, location)
 * - Tik informacinis
 * 
 * ❌ Jokio veiksmo
 */

import { Card, CardContent } from '@/components/ui/card'
import { Calendar, MapPin, Clock } from 'lucide-react'

interface ChairMeetingHeaderProps {
  title: string
  scheduledAt: string
  location?: string
  isLive: boolean
}

export function ChairMeetingHeader({
  title,
  scheduledAt,
  location,
  isLive,
}: ChairMeetingHeaderProps) {
  const date = new Date(scheduledAt)

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">{title}</h2>
          
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {date.toLocaleDateString('lt-LT')}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {date.toLocaleTimeString('lt-LT', { hour: '2-digit', minute: '2-digit' })}
            </div>
            {location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {location}
              </div>
            )}
          </div>

          {isLive && (
            <div className="inline-flex items-center gap-2 rounded-md bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-600"></div>
              VYKSTA DABAR
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

