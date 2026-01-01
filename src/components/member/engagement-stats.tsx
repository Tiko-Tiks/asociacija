"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Wrench, Vote, DollarSign, AlertTriangle } from 'lucide-react'

interface EngagementStatsProps {
  financial: number
  labor: number
  democracy: number
  unpaidInvoicesCount: number
}

export function EngagementStats({
  financial,
  labor,
  democracy,
  unpaidInvoicesCount,
}: EngagementStatsProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-1">Mano Indėlis</h2>
        <p className="text-sm text-slate-600">
          Jūsų indėlis stiprina bendruomenę
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Finansai */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">Finansai</CardTitle>
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            {unpaidInvoicesCount > 0 ? (
              <div className="space-y-2">
                <Badge variant="destructive" className="w-full justify-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Laukia apmokėjimas
                </Badge>
                <p className="text-xs text-muted-foreground text-center">
                  {unpaidInvoicesCount} {unpaidInvoicesCount === 1 ? 'sąskaita' : 'sąskaitos'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Badge variant="success" className="w-full justify-center bg-green-100 text-green-800">
                  Pareigos vykdytos
                </Badge>
                <p className="text-xs text-muted-foreground text-center">
                  Apmokėta: {financial} {financial === 1 ? 'sąskaita' : 'sąskaitų'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Talkos (Work) */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">Talkos</CardTitle>
              <Wrench className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{labor}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {labor === 0 ? 'Nėra dalyvavimo' : labor === 1 ? 'Dalyvavimas' : 'Dalyvavimai'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Balsai (Votes) */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">Balsai</CardTitle>
              <Vote className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{democracy}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {democracy === 0 ? 'Nėra dalyvavimo' : democracy === 1 ? 'Posėdis' : 'Posėdžiai'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

