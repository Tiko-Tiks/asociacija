"use client"

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Edit, Lightbulb, User, X } from 'lucide-react'
import { formatDateLT } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MemberDashboardData } from '@/app/actions/member-dashboard'
import { MemberRequirement } from '@/app/actions/member-requirements'
import { ActiveVotesAlert } from './active-votes-alert'
import { ActivityFeed, type ActivityItem } from './activity-feed'
import { EngagementStats } from './engagement-stats'
import { EventsList } from './events-list'
import { RequirementsAlert } from './requirements-alert'
import { ResolutionsWidget } from './resolutions-widget'
import { MemberStatusHint } from '../members/member-status-hint'
import { createGreetingFromFullName } from '@/lib/vocative'

interface MemberDashboardProps {
  data: MemberDashboardData
  orgId: string
  orgSlug?: string
  requirements: MemberRequirement[]
  activityItems?: ActivityItem[]
}

export function MemberDashboard({ data, orgId, requirements, activityItems = [] }: MemberDashboardProps) {
  const orgSlug = data.orgSlug || ''
  const [showConsentAlert, setShowConsentAlert] = useState(data.needsConsent)
  const sortedInvoices = [...data.invoices].sort((a, b) => {
    const statusOrder: Record<string, number> = { OVERDUE: 0, SENT: 1, PAID: 2 }
    const statusDiff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3)
    if (statusDiff !== 0) {
      return statusDiff
    }
    const dateA = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER
    const dateB = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER
    return dateA - dateB
  })
  const unpaidInvoices = sortedInvoices.filter(
    (invoice) => invoice.status === 'SENT' || invoice.status === 'OVERDUE'
  )
  const upcomingEvents = [...data.upcomingEvents]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3)
  const hasActionItems =
    requirements.length > 0 || data.needsConsent || unpaidInvoices.length > 0 || upcomingEvents.length > 0

  const getStatusBadge = () => {
    // Use MemberStatusHint for better status display
    return (
      <MemberStatusHint 
        memberStatus={data.memberStatus as 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'LEFT'}
        metadata={data.memberMetadata}
      />
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Requirements Alert */}
      <RequirementsAlert requirements={requirements} orgId={orgId} orgSlug={orgSlug} />

      {/* Active Votes Alert */}
      <ActiveVotesAlert orgId={orgId} orgSlug={orgSlug} />

      {/* Legal Consent Alert */}
      {showConsentAlert && data.needsConsent && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-destructive mb-1">Atnaujintos taisyklės</h3>
                <p className="text-sm text-slate-700">
                  Prašome peržiūrėti atnaujintas taisykles.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConsentAlert(false)}
                className="flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hero Section - My Identity */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">
                {createGreetingFromFullName(data.userName, true)}
              </CardTitle>
              <CardDescription>Jūsų asmeninė informacija ir statusas</CardDescription>
            </div>
            <Link href={`/dashboard/${orgSlug}/profile`}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-1" />
                Redaguoti profilį
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Statusas:</span>
              {getStatusBadge()}
            </div>
            {data.position && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Pareigos:</span>
                <Badge variant="outline" className="text-sm">
                  {data.position}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activity Feed - Naujienos ir veiksmai */}
      {activityItems.length > 0 && (
        <ActivityFeed items={activityItems} orgSlug={orgSlug} />
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Action Focus */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Svarbu dabar</CardTitle>
              <CardDescription>Greiti veiksmai ir priminimai</CardDescription>
            </CardHeader>
            <CardContent>
              {!hasActionItems ? (
                <p className="text-sm text-muted-foreground">Šiandien viskas tvarkoje</p>
              ) : (
                <div className="space-y-3">
                  {requirements.length > 0 && (
                    <div className="flex items-center justify-between gap-3 rounded border p-3">
                      <div>
                        <p className="text-sm font-medium">Trūksta profilio duomenų</p>
                        <p className="text-xs text-muted-foreground">
                          {requirements.length} privalomi laukai
                        </p>
                      </div>
                      <Link href={`/dashboard/${orgSlug}/profile`}>
                        <Button size="sm" variant="outline">Atnaujinti</Button>
                      </Link>
                    </div>
                  )}
                  {data.needsConsent && (
                    <div className="flex items-center justify-between gap-3 rounded border p-3">
                      <div>
                        <p className="text-sm font-medium">Atnaujintos taisyklės</p>
                        <p className="text-xs text-muted-foreground">Reikia patvirtinti</p>
                      </div>
                      <Link href={`/dashboard/${orgSlug}/profile`}>
                        <Button size="sm" variant="outline">Peržiūrėti</Button>
                      </Link>
                    </div>
                  )}
                  {unpaidInvoices.length > 0 && (
                    <div className="flex items-center justify-between gap-3 rounded border p-3">
                      <div>
                        <p className="text-sm font-medium">Neapmokėtos sąskaitos</p>
                        <p className="text-xs text-muted-foreground">
                          {unpaidInvoices.length} laukia
                        </p>
                      </div>
                      <Link href={`/dashboard/${orgSlug}/invoices`}>
                        <Button size="sm" variant="outline">Apmokėti</Button>
                      </Link>
                    </div>
                  )}
                  {upcomingEvents.length > 0 && (
                    <div className="flex items-center justify-between gap-3 rounded border p-3">
                      <div>
                        <p className="text-sm font-medium">Artimiausi renginiai</p>
                        <p className="text-xs text-muted-foreground">
                          {upcomingEvents.length} suplanuoti
                        </p>
                      </div>
                      <Button size="sm" variant="outline" disabled>Peržiūrėti</Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Events List */}
          <EventsList events={upcomingEvents} />

          {/* Engagement Stats */}
          <EngagementStats
            financial={data.engagement.financial}
            labor={data.engagement.labor}
            democracy={data.engagement.democracy}
            unpaidInvoicesCount={data.unpaidInvoicesCount}
          />
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Ideas Quick Access */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Idėjos
              </CardTitle>
              <CardDescription>
                Bendruomenės idėjos ir diskusijos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Dalyvaukite diskusijose ir siūlykite idėjas bendruomenei.
              </p>
              <Link href={`/dashboard/${orgSlug}/ideas`}>
                <Button variant="outline" className="w-full">
                  Peržiūrėti idėjas
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Voting Quick Access */}
          <Card>
            <CardHeader>
          <CardTitle className="text-lg">Balsavimai</CardTitle>
          <CardDescription>
                Peržiūrėkite aktyvius balsavimus
          </CardDescription>
        </CardHeader>
        <CardContent>
              <Link href={`/dashboard/${orgSlug}/voting`}>
                <Button variant="outline" className="w-full">
                  Eiti į balsavimus
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Invoices Quick View */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mano Sąskaitos</CardTitle>
              <CardDescription>Finansinė informacija</CardDescription>
            </CardHeader>
            <CardContent>
              {sortedInvoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nėra sąskaitų</p>
              ) : (
                <div className="space-y-2">
                  {sortedInvoices.slice(0, 3).map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-2 rounded border"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{invoice.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {invoice.amount.toFixed(2)} €
                          {invoice.due_date && (
                            <span className="ml-2">
                              - {formatDateLT(invoice.due_date, 'medium')}
                            </span>
                          )}
                        </p>
                      </div>
                      <Badge
                        variant={
                          invoice.status === 'PAID'
                            ? 'success'
                            : invoice.status === 'OVERDUE'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className="ml-2"
                      >
                        {invoice.status === 'PAID'
                          ? 'Apmokėta'
                          : invoice.status === 'OVERDUE'
                          ? 'Vėluoja'
                          : 'Laukia'}
                      </Badge>
                    </div>
                  ))}
                  {sortedInvoices.length > 3 && (
                    <Link href={`/dashboard/${orgSlug}/invoices`}>
                      <Button variant="outline" size="sm" className="w-full mt-2">
                        Peržiūrėti visas
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resolutions Widget */}
          <ResolutionsWidget resolutions={data.resolutions} orgId={orgId} />
        </div>
      </div>
    </div>
  )
}


