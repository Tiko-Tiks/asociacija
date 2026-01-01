"use client"

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface WaitingStepProps {
  orgId: string
  orgName: string
  activationStatus: {
    status: string | null
    hasActiveRuleset: boolean
    isActive: boolean
  }
}

export function WaitingStep({ orgId, orgName, activationStatus }: WaitingStepProps) {
  const router = useRouter()
  const [checking, setChecking] = useState(false)
  const isActiveRef = useRef(activationStatus.isActive)
  const hasRedirectedRef = useRef(false)

  // Update ref when activationStatus changes
  useEffect(() => {
    isActiveRef.current = activationStatus.isActive
  }, [activationStatus.isActive])

  // Auto-refresh every 30 seconds to check if org is active
  // CRITICAL: Only depend on isActive boolean, not the whole object
  useEffect(() => {
    if (activationStatus.isActive) {
      // Don't set up interval if already active
      return
    }

    const interval = setInterval(() => {
      // Check ref to avoid stale closure
      if (!isActiveRef.current) {
        setChecking(true)
        router.refresh()
        setTimeout(() => setChecking(false), 1000)
      }
    }, 30000)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activationStatus.isActive]) // Only depend on isActive, not router

  // If org becomes active (ACTIVE status AND has active ruleset), redirect to dashboard
  // CRITICAL: Only run once, use ref to prevent multiple redirects
  useEffect(() => {
    if (activationStatus.isActive && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true
      
      // Refresh to get updated org slug, then redirect
      router.refresh()
      const timeout = setTimeout(() => {
        // Redirect will be handled by server-side redirect in onboarding page
        window.location.href = '/dashboard'
      }, 2000)
      
      return () => clearTimeout(timeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activationStatus.isActive]) // Only depend on isActive, not router

  // Show warning if org is ACTIVE but missing active ruleset (inconsistent state)
  const isInconsistentState = activationStatus.status === 'ACTIVE' && !activationStatus.hasActiveRuleset

  if (activationStatus.isActive) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
            <div>
              <CardTitle className="text-xl text-green-900">
                Organizacija aktyvuota!
              </CardTitle>
              <CardDescription className="text-green-700">
                Jūsų organizacija sėkmingai aktyvuota
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-green-800">
            Nukreipiame į valdymo pultą...
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl">3. Laukiama patvirtinimo</CardTitle>
            <CardDescription>
              Jūsų pateikti duomenys peržiūrimi CORE komiteto
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Status Items */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-green-900">Valdymo klausimai</p>
                <p className="text-sm text-green-700">Pateikti ir peržiūrimi</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-green-900">Privalomi sutikimai</p>
                <p className="text-sm text-green-700">Visi sutikimai priimti</p>
              </div>
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-lg border ${
              isInconsistentState 
                ? 'bg-red-50 border-red-200' 
                : 'bg-amber-50 border-amber-200'
            }`}>
              <Clock className={`h-5 w-5 flex-shrink-0 ${
                isInconsistentState 
                  ? 'text-red-600' 
                  : 'text-amber-600'
              }`} />
              <div className="flex-1">
                <p className={`font-semibold ${
                  isInconsistentState 
                    ? 'text-red-900' 
                    : 'text-amber-900'
                }`}>
                  CORE patvirtinimas
                </p>
                <p className={`text-sm ${
                  isInconsistentState 
                    ? 'text-red-700' 
                    : 'text-amber-700'
                }`}>
                  {isInconsistentState 
                    ? 'Organizacija aktyvuota, bet trūksta ruleset. Susisiekite su administratoriumi.' 
                    : 'Laukiama patvirtinimo'}
                </p>
              </div>
              {checking && (
                <Badge variant="outline" className="text-xs">
                  Tikrinama...
                </Badge>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-slate-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900 mb-1">
                  Ką daryti toliau?
                </p>
                <p className="text-sm text-slate-700">
                  CORE komitetas peržiūri jūsų pateiktus valdymo atsakymus. Kai organizacija bus
                  patvirtinta, automatiškai būsite nukreipti į valdymo pultą. Šis puslapis
                  automatiškai atnaujinamas kas 30 sekundžių.
                </p>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center justify-center pt-4">
            <Badge variant="outline" className="text-sm px-4 py-2">
              Statusas: {activationStatus.status || 'Laukiama'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

