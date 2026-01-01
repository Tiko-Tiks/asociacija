import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { lt } from 'date-fns/locale'

interface CommunityNewsProps {
  news: Array<{
    id: string
    title: string
    content: string
    published_at: string
    created_at: string
  }>
}

/**
 * News / Announcements Section
 * 
 * Chronological list of community news:
 * - Title
 * - Date
 * - Short text
 * - "Read more" (expandable)
 * 
 * Purpose:
 * - Community announcements
 * - Events
 * - Decisions
 * - Notices
 */
export function CommunityNews({ news }: CommunityNewsProps) {
  if (news.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-3xl font-bold text-slate-900">Naujienos</h2>
        <div className="rounded-lg border bg-slate-50 p-8 text-center">
          <p className="text-slate-600">
            Naujienų dar nėra. Informacija bus paskelbta netrukus.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-slate-900">Naujienos</h2>
      
      <div className="space-y-4">
        {news.map((item) => {
          const publishedDate = item.published_at || item.created_at
          const formattedDate = publishedDate
            ? format(new Date(publishedDate), 'yyyy-MM-dd', { locale: lt })
            : ''

          return (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <CardTitle className="text-xl">{item.title}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                    <Calendar className="h-4 w-4" />
                    <time dateTime={publishedDate}>{formattedDate}</time>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-slate max-w-none">
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {item.content}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

