import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { lt } from 'date-fns/locale'
import { Calendar, FileText, FolderKanban, Users } from 'lucide-react'

interface ActivityItem {
  id: string
  event_type: string
  actor_name: string | null
  created_at: string
  title?: string
  type?: 'project' | 'invoice' | 'member' | 'other'
}

interface ActivityFeedProps {
  activities: ActivityItem[]
  projects?: Array<{
    id: string
    title: string
    created_at: string
  }>
  invoices?: Array<{
    id: string
    amount: number
    description: string | null
    created_at: string
  }>
}

/**
 * Activity Feed Component
 * 
 * Displays recent activity from projects and invoices.
 * Shows last 5 items sorted by created_at desc.
 * 
 * Empty State: Friendly illustration if no data.
 */
export function ActivityFeed({ activities, projects = [], invoices = [] }: ActivityFeedProps) {
  // Combine and sort all activities
  const allActivities: ActivityItem[] = [
    ...activities.map((a) => ({ ...a, type: 'other' as const })),
    ...projects.map((p) => ({
      id: p.id,
      event_type: 'project_created',
      actor_name: null,
      created_at: p.created_at,
      title: p.title,
      type: 'project' as const,
    })),
    ...invoices.map((i) => ({
      id: i.id,
      event_type: 'invoice_created',
      actor_name: null,
      created_at: i.created_at,
      title: i.description || `Sąskaita €${i.amount.toFixed(2)}`,
      type: 'invoice' as const,
    })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  const getActivityIcon = (type?: string) => {
    switch (type) {
      case 'project':
        return <FolderKanban className="h-4 w-4 text-blue-600" />
      case 'invoice':
        return <FileText className="h-4 w-4 text-green-600" />
      case 'member':
        return <Users className="h-4 w-4 text-purple-600" />
      default:
        return <Calendar className="h-4 w-4 text-slate-600" />
    }
  }

  const getActivityLabel = (item: ActivityItem) => {
    if (item.title) {
      return item.title
    }
    switch (item.event_type) {
      case 'project_created':
        return 'Sukurtas naujas projektas'
      case 'invoice_created':
        return 'Sukurta nauja sąskaita'
      case 'member_invited':
        return 'Pakviestas naujas narys'
      default:
        return 'Veikla atnaujinta'
    }
  }

  if (allActivities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Paskutinė Veikla</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Calendar className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-slate-600 mb-2 font-medium">
              Čia bus jūsų bendruomenės istorija
            </p>
            <p className="text-sm text-slate-500">
              Pradėkite sukurdami pirmą projektą arba sąskaitą
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paskutinė Veikla</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {allActivities.map((item) => {
            const formattedDate = format(new Date(item.created_at), 'yyyy-MM-dd HH:mm', { locale: lt })
            
            return (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="mt-0.5 shrink-0">
                  {getActivityIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {getActivityLabel(item)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {item.actor_name && (
                      <span className="text-xs text-slate-600">
                        {item.actor_name}
                      </span>
                    )}
                    <span className="text-xs text-slate-500">
                      {formattedDate}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

