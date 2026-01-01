import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, FileText } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { lt } from 'date-fns/locale'
import { format } from 'date-fns'

interface ActivityFeedItem {
  id: string
  type: 'EVENT' | 'RESOLUTION'
  title: string
  created_at: string
  status?: string
  event_date?: string
}

interface ActivityFeedProps {
  items: ActivityFeedItem[]
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  const formatRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return formatDistanceToNow(date, { addSuffix: true, locale: lt })
    } catch {
      return dateString
    }
  }

  const getStatusBadge = (status?: string) => {
    if (!status) return null

    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      DRAFT: { label: 'Juodraštis', variant: 'outline' },
      PROPOSED: { label: 'Pasiūlytas', variant: 'secondary' },
      APPROVED: { label: 'Patvirtintas', variant: 'default' },
      REJECTED: { label: 'Atmestas', variant: 'destructive' },
    }

    const statusInfo = statusMap[status]
    if (!statusInfo) return null

    return (
      <Badge variant={statusInfo.variant} className="ml-2">
        {statusInfo.label}
      </Badge>
    )
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-slate-500">Nėra veiklos įrašų</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Card key={item.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {/* Type Icon */}
              <div className="flex-shrink-0 mt-1">
                {item.type === 'EVENT' ? (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                    <Calendar className="h-5 w-5" />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <FileText className="h-5 w-5" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-slate-900 mb-1">{item.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{formatRelativeTime(item.created_at)}</span>
                      {item.type === 'EVENT' && item.event_date && (
                        <>
                          <span>•</span>
                          <span>
                            {format(new Date(item.event_date), 'yyyy-MM-dd', { locale: lt })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {item.type === 'RESOLUTION' && getStatusBadge(item.status)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

