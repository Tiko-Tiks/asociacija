'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, FileText, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { lt } from 'date-fns/locale'
import type { SystemNewsItem } from '@/app/actions/system-news'
import Link from 'next/link'

interface SystemNewsWidgetProps {
  news: SystemNewsItem[]
}

/**
 * System News Widget
 * 
 * Displays official announcements from the Branduolys platform organization.
 * Styled with gold border and "Official" badge to distinguish from local news.
 */
export function SystemNewsWidget({ news }: SystemNewsWidgetProps) {
  if (news.length === 0) {
    return null
  }

  return (
    <Card className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-amber-900 flex items-center gap-2">
            <span className="text-2xl">📢</span>
            Sistemos Naujienos
          </CardTitle>
          <Badge className="bg-amber-600 text-white border-amber-700">
            Oficialus
          </Badge>
        </div>
        <p className="text-sm text-amber-700 mt-1">
          Oficialūs pranešimai iš Lietuvos Branduolys platformos
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {news.map((item) => {
          const displayDate = item.adopted_at || item.event_date || item.created_at
          const dateObj = new Date(displayDate)

          return (
            <div
              key={item.id}
              className="border border-amber-200 rounded-lg p-3 bg-white hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {item.type === 'EVENT' ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                      <Calendar className="h-4 w-4" />
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                      <FileText className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-slate-900 text-sm leading-tight">
                      {item.title}
                    </h4>
                    <Badge
                      variant="outline"
                      className="bg-amber-50 text-amber-700 border-amber-300 text-xs flex-shrink-0"
                    >
                      {item.type === 'EVENT' ? 'Renginys' : 'Nutarimas'}
                    </Badge>
                  </div>
                  {item.content && (
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                      {item.content}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-amber-700">
                      {format(dateObj, 'yyyy-MM-dd', { locale: lt })}
                    </span>
                    <Link
                      href={`/c/branduolys`}
                      className="text-xs text-amber-700 hover:text-amber-900 underline flex items-center gap-1"
                    >
                      Skaityti daugiau
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        <div className="pt-2 border-t border-amber-200">
          <Link
            href="/c/branduolys"
            className="text-xs text-amber-700 hover:text-amber-900 font-medium flex items-center gap-1 justify-center"
          >
            Visos sistemos naujienos
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

