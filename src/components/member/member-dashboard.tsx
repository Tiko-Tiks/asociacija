"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, User, Edit, X } from 'lucide-react'
import { EngagementStats } from './engagement-stats'
import { EventsList } from './events-list'
import { ResolutionsWidget } from './resolutions-widget'
import { RequirementsAlert } from './requirements-alert'
import { MemberDashboardData } from '@/app/actions/member-dashboard'
import { MemberRequirement } from '@/app/actions/member-requirements'
import Link from 'next/link'

interface MemberDashboardProps {
  data: MemberDashboardData
  orgId: string
  orgSlug?: string
  requirements: MemberRequirement[]
}

export function MemberDashboard({ data, orgId, requirements }: MemberDashboardProps) {
  const orgSlug = data.orgSlug || ''
  const [showConsentAlert, setShowConsentAlert] = useState(data.needsConsent)

  const getStatusBadge = () => {
    if (data.memberStatus === 'ACTIVE') {
      return (
        <Badge variant="success" className="bg-green-100 text-green-800">
          Aktyvus
        </Badge>
      )
    } else if (data.memberStatus === 'SUSPENDED') {
      return (
        <Badge variant="destructive">
          Sustabdytas
        </Badge>
      )
    }
    return (
      <Badge variant="secondary">
        {data.memberStatus}
      </Badge>
    )
  }

  return (
    <div className="p-6 space-y-6">
        {/* Requirements Alert */}
        <RequirementsAlert requirements={requirements} orgId={orgId} orgSlug={orgSlug} />

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
                Laba diena, {data.userName || 'Narys'}
              </CardTitle>
              <CardDescription>
                Jūsų asmeninė informacija ir statusas
              </CardDescription>
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Engagement Stats */}
          <EngagementStats
            financial={data.engagement.financial}
            labor={data.engagement.labor}
            democracy={data.engagement.democracy}
            unpaidInvoicesCount={data.unpaidInvoicesCount}
          />

          {/* Events List */}
          <EventsList events={data.upcomingEvents} />
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Invoices Quick View */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mano Sąskaitos</CardTitle>
              <CardDescription>
                Finansinė informacija
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nėra sąskaitų</p>
              ) : (
                <div className="space-y-2">
                  {data.invoices.slice(0, 3).map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-2 rounded border"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{invoice.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {invoice.amount.toFixed(2)} €
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
                  {data.invoices.length > 3 && (
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

