"use client"

import Link from 'next/link'
import { 
  Lightbulb, 
  Vote, 
  Calendar, 
  Bell,
  ChevronRight,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { lt } from 'date-fns/locale'

export interface ActivityItem {
  id: string
  type: 'idea' | 'vote' | 'event' | 'resolution' | 'comment'
  title: string
  description?: string
  date: string
  href: string
  isNew?: boolean
  requiresAction?: boolean
  actionLabel?: string
}

interface ActivityFeedProps {
  items: ActivityItem[]
  orgSlug: string
}

const typeConfig = {
  idea: {
    icon: Lightbulb,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    label: 'Nauja idėja',
  },
  vote: {
    icon: Vote,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: 'Balsavimas',
  },
  event: {
    icon: Calendar,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    label: 'Renginys',
  },
  resolution: {
    icon: AlertTriangle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Nutarimas',
  },
  comment: {
    icon: MessageSquare,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    label: 'Komentaras',
  },
}

export function ActivityFeed({ items, orgSlug }: ActivityFeedProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-gray-500" />
            Naujienos
          </CardTitle>
          <CardDescription>
            Bendruomenės veikla ir naujienos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Šiuo metu naujienų nėra
          </p>
        </CardContent>
      </Card>
    )
  }

  // Sort by date descending and limit to 5
  const sortedItems = [...items]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  const actionItems = sortedItems.filter(item => item.requiresAction)
  const otherItems = sortedItems.filter(item => !item.requiresAction)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-5 w-5 text-blue-600" />
          Naujienos ir veiksmai
          {actionItems.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {actionItems.length} reikalauja dėmesio
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Sekite bendruomenės veiklą ir dalyvaukite
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Action Required Items First */}
        {actionItems.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">
              Reikalauja jūsų dėmesio
            </p>
            {actionItems.map((item) => (
              <ActivityItemCard key={item.id} item={item} orgSlug={orgSlug} highlighted />
            ))}
          </div>
        )}

        {/* Other Items */}
        {otherItems.length > 0 && (
          <div className="space-y-2">
            {actionItems.length > 0 && (
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4">
                Kitos naujienos
              </p>
            )}
            {otherItems.map((item) => (
              <ActivityItemCard key={item.id} item={item} orgSlug={orgSlug} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ActivityItemCard({ 
  item, 
  orgSlug,
  highlighted = false 
}: { 
  item: ActivityItem
  orgSlug: string
  highlighted?: boolean 
}) {
  const config = typeConfig[item.type]
  const Icon = config.icon

  return (
    <Link href={item.href}>
      <div 
        className={`
          flex items-center gap-3 p-3 rounded-lg border transition-all
          hover:shadow-md cursor-pointer
          ${highlighted ? 'border-red-200 bg-red-50' : `${config.borderColor} ${config.bgColor}`}
        `}
      >
        <div className={`p-2 rounded-full ${config.bgColor}`}>
          <Icon className={`h-5 w-5 ${config.color}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900 truncate">
              {item.title}
            </p>
            {item.isNew && (
              <Badge variant="secondary" className="text-xs">
                Nauja
              </Badge>
            )}
          </div>
          {item.description && (
            <p className="text-xs text-gray-600 truncate mt-0.5">
              {item.description}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            {formatDistanceToNow(new Date(item.date), { addSuffix: true, locale: lt })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {item.requiresAction && item.actionLabel && (
            <Button size="sm" variant="default" className="text-xs">
              {item.actionLabel}
            </Button>
          )}
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </div>
      </div>
    </Link>
  )
}

