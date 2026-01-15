import Link from 'next/link'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { Badge } from '@/components/ui/badge'

import { Button } from '@/components/ui/button'

import { Calendar, FileText, MapPin } from 'lucide-react'

import { format } from 'date-fns'

import { lt } from 'date-fns/locale'

import { PublicEvent, PublicResolution } from '@/app/actions/public-community-page'



interface CommunityActivitySectionProps {

  events: PublicEvent[]

  resolutions: PublicResolution[]

  orgSlug: string

}



export function CommunityActivitySection({

  events,

  resolutions,

  orgSlug,

}: CommunityActivitySectionProps) {

  const allItems: Array<{

    id: string

    type: 'EVENT' | 'RESOLUTION'

    title: string

    content: string | null

    date: string

    location?: string | null

  }> = [

    ...events.map((event) => ({

      id: event.id,

      type: 'EVENT' as const,

      title: event.title,

      content: event.description,

      date: event.event_date,

      location: event.location,

    })),

    ...resolutions.map((res) => ({

      id: res.id,

      type: 'RESOLUTION' as const,

      title: res.title,

      content: res.content,

      date: res.adopted_at || res.created_at,

    })),

  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())



  return (

    <section id="activity" className="py-12 md:py-16 bg-slate-50">

      <div className="container mx-auto px-4">

        <div className="max-w-4xl mx-auto space-y-6">

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">

            <div>

              <h2 className="text-2xl md:text-3xl font-bold text-slate-900">

                Vieša veikla

              </h2>

              <p className="text-sm text-slate-600 mt-2">

                Čia skelbiami vieši renginiai ir patvirtinti nutarimai.

              </p>

            </div>

            <Button asChild variant="outline">

              <Link href={`/login?redirect=/dashboard/${orgSlug}`}>

                Prisijungti ir matyti daugiau

              </Link>

            </Button>

          </div>



          {allItems.length === 0 ? (

            <div className="text-center py-12 text-slate-500">

              <p className="text-lg mb-2">Šiuo metu nėra viešos veiklos</p>

              <p className="text-sm">

                Renginiai ir nutarimai bus rodomi čia, kai jie bus paskelbti viešai.

              </p>

            </div>

          ) : (

            <div className="space-y-4">

              {allItems.map((item) => (

                <Card key={item.id} className="hover:shadow-md transition-shadow">

                  <CardHeader className="pb-3">

                    <div className="flex items-start justify-between gap-3">

                      <div className="flex items-start gap-3 flex-1">

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

                        <div className="flex-1 min-w-0">

                          <CardTitle className="text-lg font-semibold text-slate-900 mb-1">

                            {item.title}

                          </CardTitle>

                          <div className="flex items-center gap-2 text-xs text-slate-500">

                            <span>

                              {format(new Date(item.date), 'yyyy-MM-dd', { locale: lt })}

                            </span>

                            {item.type === 'EVENT' && item.location && (

                              <>

                                <span>-</span>

                                <div className="flex items-center gap-1">

                                  <MapPin className="h-3 w-3" />

                                  <span>{item.location}</span>

                                </div>

                              </>

                            )}

                          </div>

                        </div>

                      </div>

                      <div className="flex flex-col gap-1 items-end">

                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">

                          Vieša informacija

                        </Badge>

                        <Badge variant={item.type === 'EVENT' ? 'default' : 'secondary'}>

                          {item.type === 'EVENT' ? 'Renginys' : 'Nutarimas'}

                        </Badge>

                      </div>

                    </div>

                  </CardHeader>

                  {item.content && (

                    <CardContent className="pt-0">

                      <p className="text-sm text-slate-700 line-clamp-3">{item.content}</p>

                    </CardContent>

                  )}

                </Card>

              ))}

            </div>

          )}

        </div>

      </div>

    </section>

  )

}

