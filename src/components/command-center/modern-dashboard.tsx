"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  FileText, 
  Calendar, 
  Vote, 
  FileCheck, 
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Plus,
  ClipboardList,
  FolderKanban
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { lt } from "date-fns/locale"

interface ModernDashboardProps {
  orgId: string
  orgSlug: string
  stats: {
    activeMembers: number
    pendingMembers: number
    activeResolutions: number
    unpaidInvoices: number | null
    openIdeas: number
    activeProjects: number
  }
  recentActivity: Array<{
    id: string
    type: 'EVENT' | 'RESOLUTION' | 'IDEA' | 'PROJECT'
    title: string
    created_at: string
    status?: string
    event_date?: string
  }>
  canPublish: boolean
}

export function ModernDashboard({
  orgId,
  orgSlug,
  stats,
  recentActivity,
  canPublish,
}: ModernDashboardProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header - Optimized */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Valdymo centras</h1>
          <p className="text-slate-600 mt-1 text-sm sm:text-base">Bendruomenės veiklos apžvalga ir valdymas</p>
        </div>

        {/* Unified Dashboard - Stats and Modules Combined */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {/* Active Members - Compact with link */}
          <Link href={`/dashboard/${orgSlug}/members`}>
            <Card className="h-full border-l-4 border-l-blue-500 hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer group">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Nariai</CardTitle>
                      <CardDescription className="text-xs">Bendruomenės nariai</CardDescription>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-3xl font-bold text-slate-900">{stats.activeMembers}</div>
                  <span className="text-sm text-slate-500">aktyvūs</span>
                </div>
                {stats.pendingMembers > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm text-amber-700 font-medium">{stats.pendingMembers} laukia patvirtinimo</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>

          {/* Resolutions - Enhanced */}
          <Link href={`/dashboard/${orgSlug}/resolutions`}>
            <Card className="h-full border-l-4 border-l-green-500 hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer group">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                      <FileText className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Nutarimai</CardTitle>
                      <CardDescription className="text-xs">Valdyti nutarimus</CardDescription>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-green-600 transition-colors" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2 mb-2">
                  <div className="text-3xl font-bold text-slate-900">{stats.activeResolutions}</div>
                  <span className="text-sm text-slate-500">aktyvūs</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Sukurkite, peržiūrėkite ir valdykite bendruomenės nutarimus. Balsavimas ir patvirtinimas.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Ideas - Enhanced */}
          <Link href={`/dashboard/${orgSlug}/ideas`}>
            <Card className="h-full border-l-4 border-l-yellow-500 hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer group">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-yellow-100 rounded-lg group-hover:bg-yellow-200 transition-colors">
                      <Vote className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Idėjos</CardTitle>
                      <CardDescription className="text-xs">Bendruomenės idėjos</CardDescription>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-yellow-600 transition-colors" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2 mb-2">
                  <div className="text-3xl font-bold text-slate-900">{stats.openIdeas}</div>
                  <span className="text-sm text-slate-500">{stats.openIdeas === 1 ? 'aktyvi' : 'aktyvios'}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Pateikite idėjas, balsuokite ir pereikite prie projektų finansavimo.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Projects - Enhanced */}
          <Link href={`/dashboard/${orgSlug}/projects`}>
            <Card className="h-full border-l-4 border-l-emerald-500 hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer group">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors">
                      <FolderKanban className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Projektai</CardTitle>
                      <CardDescription className="text-xs">Projektų valdymas</CardDescription>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2 mb-2">
                  <div className="text-3xl font-bold text-slate-900">{stats.activeProjects}</div>
                  <span className="text-sm text-slate-500">aktyvūs</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Valdykite projektus, finansavimą ir paramą (pinigai, daiktai, darbas).
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Meetings */}
          <Link href={`/dashboard/${orgSlug}/governance`}>
            <Card className="h-full border-l-4 border-l-indigo-500 hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer group">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                      <Calendar className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Susirinkimai</CardTitle>
                      <CardDescription className="text-xs">GA organizavimas</CardDescription>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Organizuokite bendruomenės susirinkimus, darbotvarkę ir protokolus.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Unpaid Invoices - Compact (if available) */}
          {stats.unpaidInvoices !== null && (
            <Link href={`/dashboard/${orgSlug}/invoices`}>
              <Card className="h-full border-l-4 border-l-red-500 hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer group">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                        <TrendingUp className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold">Sąskaitos</CardTitle>
                        <CardDescription className="text-xs">Finansų valdymas</CardDescription>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-red-600 transition-colors" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <div className="text-3xl font-bold text-slate-900">{stats.unpaidInvoices}</div>
                    <span className="text-sm text-slate-500">neapmokėtos</span>
                  </div>
                  {stats.unpaidInvoices > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-red-700 font-medium">Reikia dėmesio</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          )}
        </div>

        {/* Quick Actions & Recent Activity - Optimized */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Greitieji veiksmai
              </CardTitle>
              <CardDescription>Dažniausiai naudojamos funkcijos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {canPublish && (
                <>
                  <Link href={`/dashboard/${orgSlug}/resolutions?new=true`}>
                    <Button variant="outline" className="w-full justify-start">
                      <Plus className="h-4 w-4 mr-2" />
                      Sukurti naują nutarimą
                    </Button>
                  </Link>
                  <Link href={`/dashboard/${orgSlug}/governance?new=true`}>
                    <Button variant="outline" className="w-full justify-start">
                      <Plus className="h-4 w-4 mr-2" />
                      Organizuoti susirinkimą
                    </Button>
                  </Link>
                </>
              )}
              <Link href={`/dashboard/${orgSlug}/ideas?new=true`}>
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Sukurti idėją
                </Button>
              </Link>
              <Link href={`/dashboard/${orgSlug}/members`}>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Valdyti narius
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Naujausi įvykiai
              </CardTitle>
              <CardDescription>Paskutiniai veiksmai sistemoje</CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  Įvykių nėra
                </p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-slate-50 transition-colors"
                    >
                      <div className="mt-0.5">
                        {item.type === 'EVENT' ? (
                          <Calendar className="h-4 w-4 text-green-600" />
                        ) : item.type === 'IDEA' ? (
                          <Vote className="h-4 w-4 text-yellow-600" />
                        ) : item.type === 'PROJECT' ? (
                          <FolderKanban className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <FileText className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {item.title}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {item.type === 'EVENT' ? 'Renginys' : item.type === 'IDEA' ? 'Idėja' : item.type === 'PROJECT' ? 'Projektas' : 'Nutarimas'}
                          </Badge>
                          {item.status && (
                            <Badge variant="secondary" className="text-xs">
                              {item.status}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {format(new Date(item.created_at), 'yyyy-MM-dd HH:mm', { locale: lt })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {recentActivity.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <Link
                    href={`/dashboard/${orgSlug}/history`}
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    Peržiūrėti visą istoriją
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

