"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, XCircle, Loader2, Clock, Users } from 'lucide-react'
import { getPreOnboardingReadiness, type ReadinessCheckItem } from '@/app/actions/pre-onboarding-readiness'
import { useToast } from '@/components/ui/use-toast'

interface ReadinessChecklistProps {
  orgSlug: string
  orgName: string
}

export function ReadinessChecklist({ orgSlug, orgName }: ReadinessChecklistProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [readiness, setReadiness] = useState<{
    checklist: ReadinessCheckItem[]
    allReady: boolean
    lastUpdated?: string
  } | null>(null)

  useEffect(() => {
    const loadReadiness = async () => {
      setLoading(true)
      try {
        const result = await getPreOnboardingReadiness(orgSlug)
        
        if (result.success && result.checklist) {
          setReadiness({
            checklist: result.checklist,
            allReady: result.allReady || false,
            lastUpdated: result.lastUpdated,
          })
        } else {
          toast({
            title: 'Klaida',
            description: result.error || 'Nepavyko įkelti būsenos',
            variant: 'destructive',
          })
        }
      } catch (error) {
        console.error('Error loading readiness:', error)
        toast({
          title: 'Klaida',
          description: 'Įvyko netikėta klaida',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }
    loadReadiness()
  }, [orgSlug, toast])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto" />
          <p className="text-slate-600 mt-4">Tikrinama būsena...</p>
        </CardContent>
      </Card>
    )
  }

  if (!readiness) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-slate-600">Nepavyko įkelti būsenos</p>
        </CardContent>
      </Card>
    )
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    try {
      const date = new Date(dateString)
      return date.toLocaleString('lt-LT', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl">Registracijos būsena</CardTitle>
            <CardDescription>
              Patikrinkite, ar visi reikalingi duomenys pateikti
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Readiness Checklist */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-900 mb-3">Patikros sąrašas</h3>
          {readiness.checklist.map((item) => (
            <div
              key={item.key}
              className={`flex items-start gap-4 p-4 rounded-lg border-2 ${
                item.status === 'PASS'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}
            >
              <div className="flex-shrink-0 mt-1">
                {item.status === 'PASS' ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                ) : (
                  <XCircle className="h-6 w-6 text-yellow-600" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-1">{item.label}</h4>
                {item.details && (
                  <p className="text-sm text-slate-600">{item.details}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Status Message */}
        {readiness.allReady ? (
          <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Clock className="h-6 w-6 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">
                  Laukiama gyvos patvirtinimo sprendimo
                </h3>
                <p className="text-sm text-blue-800 mb-3">
                  Visi reikalingi duomenys pateikti. Jūsų prašymas peržiūrimas administracijos.
                  Sprendimas bus priimtas gyvame posėdyje arba valdybos sprendimu.
                </p>
                <p className="text-sm text-blue-700 font-medium">
                  Būsite informuoti el. paštu, kai registracija bus patvirtinta.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <XCircle className="h-6 w-6 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 mb-2">
                  Trūksta duomenų
                </h3>
                <p className="text-sm text-yellow-800">
                  Kai kurie reikalingi duomenys dar nėra pateikti. Prašome užpildyti visus
                  privalomus laukus prieš pateikiant prašymą peržiūrai.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Last Updated Timestamp */}
        {readiness.lastUpdated && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Clock className="h-4 w-4" />
              <span>
                Paskutinis atnaujinimas: {formatDate(readiness.lastUpdated) || readiness.lastUpdated}
              </span>
            </div>
          </div>
        )}

        {/* Approval Info */}
        {readiness.allReady && (
          <div className="pt-4 border-t">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <h4 className="font-semibold text-slate-900 mb-2">
                Kas patvirtins registraciją?
              </h4>
              <p className="text-sm text-slate-700">
                Registraciją patvirtins Platformos administracija gyvame posėdyje arba
                valdybos sprendimu. Patvirtinimo procesas gali užtrukti kelias dienas.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
