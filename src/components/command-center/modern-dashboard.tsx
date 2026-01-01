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
  Settings,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Valdymo centras</h1>
            <p className="text-slate-600 mt-2">Bendruomenės veiklos apžvalga ir valdymas</p>
          </div>
          <Link href={`/dashboard/${orgSlug}/settings`}>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Nustatymai
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Aktyvūs nariai</CardTitle>
              <Users className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.activeMembers}</div>
              <p className="text-xs text-slate-500 mt-1">Bendruomenės nariai</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Laukia patvirtinimo</CardTitle>
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.pendingMembers}</div>
              <p className="text-xs text-slate-500 mt-1">Nauji prašymai</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Aktyvūs nutarimai</CardTitle>
              <FileText className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.activeResolutions}</div>
              <p className="text-xs text-slate-500 mt-1">Patvirtinti nutarimai</p>
            </CardContent>
          </Card>

          {stats.unpaidInvoices !== null && (
            <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Neapmokėtos sąskaitos</CardTitle>
                <TrendingUp className="h-5 w-5 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{stats.unpaidInvoices}</div>
                <p className="text-xs text-slate-500 mt-1">Reikia dėmesio</p>
              </CardContent>
            </Card>
          )}

          <Card className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Atviros idėjos</CardTitle>
              <Vote className="h-5 w-5 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.openIdeas}</div>
              <p className="text-xs text-slate-500 mt-1">Balsuojama</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Aktyvūs projektai</CardTitle>
              <FolderKanban className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.activeProjects}</div>
              <p className="text-xs text-slate-500 mt-1">Finansuojami / Vykdomi</p>
            </CardContent>
          </Card>
        </div>

        {/* Modules Grid */}
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-4">Moduliai</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Resolutions */}
            <Link href={`/dashboard/${orgSlug}/resolutions`}>
              <Card className="h-full hover:shadow-xl transition-all hover:scale-105 cursor-pointer border-2 hover:border-blue-500">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Nutarimai</CardTitle>
                        <CardDescription>Valdyti nutarimus</CardDescription>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">
                    Sukurkite, peržiūrėkite ir valdykite bendruomenės nutarimus. Balsavimas ir patvirtinimas.
                  </p>
                </CardContent>
              </Card>
            </Link>

            {/* Meetings */}
            <Link href={`/dashboard/${orgSlug}/governance`}>
              <Card className="h-full hover:shadow-xl transition-all hover:scale-105 cursor-pointer border-2 hover:border-green-500">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-green-100 rounded-lg">
                        <Calendar className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Susirinkimai</CardTitle>
                        <CardDescription>GA organizavimas</CardDescription>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">
                    Organizuokite bendruomenės susirinkimus, darbotvarkę ir protokolus.
                  </p>
                </CardContent>
              </Card>
            </Link>

            {/* Ideas */}
            <Link href={`/dashboard/${orgSlug}/ideas`}>
              <Card className="h-full hover:shadow-xl transition-all hover:scale-105 cursor-pointer border-2 hover:border-yellow-500">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-yellow-100 rounded-lg">
                        <Vote className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Idėjos</CardTitle>
                        <CardDescription>Bendruomenės idėjos</CardDescription>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">
                    Pateikite idėjas, balsuokite ir pereikite prie projektų finansavimo.
                  </p>
                </CardContent>
              </Card>
            </Link>

            {/* Projects */}
            <Link href={`/dashboard/${orgSlug}/projects`}>
              <Card className="h-full hover:shadow-xl transition-all hover:scale-105 cursor-pointer border-2 hover:border-emerald-500">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-emerald-100 rounded-lg">
                        <FolderKanban className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Projektai</CardTitle>
                        <CardDescription>Projektų valdymas</CardDescription>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">
                    Valdykite projektus, finansavimą ir paramą (pinigai, daiktai, darbas).
                  </p>
                </CardContent>
              </Card>
            </Link>

            {/* Protocols */}
            <Link href={`/dashboard/${orgSlug}/governance`}>
              <Card className="h-full hover:shadow-xl transition-all hover:scale-105 cursor-pointer border-2 hover:border-indigo-500">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-indigo-100 rounded-lg">
                        <FileCheck className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Protokolai</CardTitle>
                        <CardDescription>GA protokolai</CardDescription>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">
                    Peržiūrėkite ir generuokite GA susirinkimų protokolus su PDF eksportu.
                  </p>
                </CardContent>
              </Card>
            </Link>

            {/* Members */}
            <Link href={`/dashboard/${orgSlug}/members`}>
              <Card className="h-full hover:shadow-xl transition-all hover:scale-105 cursor-pointer border-2 hover:border-teal-500">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-teal-100 rounded-lg">
                        <Users className="h-6 w-6 text-teal-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Nariai</CardTitle>
                        <CardDescription>Bendruomenės nariai</CardDescription>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">
                    Valdykite narių sąrašą, teises ir statusus.
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Quick Actions & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                          {format(new Date(item.created_at), 'PPp', { locale: lt })}
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

