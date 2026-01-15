"use client"

import { useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { acceptConsent } from '@/app/actions/consents'
import { CONSENT_TYPE, ConsentType, CHAIRMAN_REQUIRED_CONSENTS } from '@/app/domain/constants'
import { CheckCircle2, Circle, FileText, Loader2, Eye } from 'lucide-react'
import { ConsentDocumentViewer } from './consent-document-viewer'

interface ConsentsStepProps {
  orgId: string
  missingConsents: string[]
  onComplete: () => void
}

const CONSENT_LABELS: Record<ConsentType, { title: string; description: string }> = {
  [CONSENT_TYPE.CORE_STATUTES]: {
    title: 'Pagrindiniai statutai',
    description: 'Bendruomenės pagrindiniai statutai ir taisyklės',
  },
  [CONSENT_TYPE.CHARTER]: {
    title: 'Chartija',
    description: 'Bendruomenės chartija ir principai',
  },
  [CONSENT_TYPE.TERMS]: {
    title: 'Naudojimo sąlygos',
    description: 'Platformos naudojimo sąlygos',
  },
  [CONSENT_TYPE.PRIVACY]: {
    title: 'Privatumo politika',
    description: 'Duomenų apsaugos ir privatumo politika',
  },
  [CONSENT_TYPE.INTERNAL_RULES]: {
    title: 'Vidaus taisyklės',
    description: 'Bendruomenės vidaus taisyklės',
  },
}

export function ConsentsStep({ orgId, missingConsents, onComplete }: ConsentsStepProps) {
  const [accepting, setAccepting] = useState<string | null>(null)
  const [accepted, setAccepted] = useState<Set<string>>(
    new Set(CHAIRMAN_REQUIRED_CONSENTS.filter((c) => !missingConsents.includes(c)))
  )
  const [viewingDocument, setViewingDocument] = useState<string | null>(null)
  const { toast } = useToast()
  const hasCompletedRef = useRef(false)
  const onCompleteRef = useRef(onComplete)

  // Update ref when onComplete changes
  onCompleteRef.current = onComplete

  const handleAccept = useCallback(async (consentType: ConsentType) => {
    if (hasCompletedRef.current) {
      return // Prevent multiple calls
    }

    setAccepting(consentType)
    try {
      const result = await acceptConsent(orgId, consentType)

      if (result.success) {
        setAccepted((prev) => {
          const newAccepted = new Set([...prev, consentType])
          
          // Check if all required consents are accepted using the NEW state
          const allAccepted = CHAIRMAN_REQUIRED_CONSENTS.every((c) => newAccepted.has(c))

          if (allAccepted && !hasCompletedRef.current) {
            hasCompletedRef.current = true
            // Small delay to show the last acceptance
            setTimeout(() => {
              onCompleteRef.current()
            }, 500)
          }

          return newAccepted
        })

        toast({
          title: 'Sutikimas priimtas',
          description: `${CONSENT_LABELS[consentType].title} sėkmingai priimtas`,
        })
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko priimti sutikimo',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Klaida',
        description: 'Įvyko netikėta klaida',
        variant: 'destructive',
      })
    } finally {
      setAccepting(null)
    }
  }, [orgId, toast])

  const allAccepted = CHAIRMAN_REQUIRED_CONSENTS.every((c) => accepted.has(c))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl">2. Privalomi sutikimai</CardTitle>
            <CardDescription>
              Turite priimti visus privalomus sutikimus, kad galėtumėte naudoti sistemą
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {CHAIRMAN_REQUIRED_CONSENTS.map((consentType) => {
            const isAccepted = accepted.has(consentType)
            const isAccepting = accepting === consentType
            const label = CONSENT_LABELS[consentType]

            return (
              <div
                key={consentType}
                className={`flex items-start gap-4 p-4 rounded-lg border-2 ${
                  isAccepted
                    ? 'bg-green-50 border-green-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex-shrink-0 mt-1">
                  {isAccepted ? (
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  ) : (
                    <Circle className="h-6 w-6 text-slate-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 mb-1">{label.title}</h3>
                  <p className="text-sm text-slate-600 mb-3">{label.description}</p>
                  {!isAccepted && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setViewingDocument(consentType)}
                        variant="outline"
                        size="sm"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Perskaityti dokumentą
                      </Button>
                      <Button
                        onClick={() => handleAccept(consentType)}
                        disabled={isAccepting}
                        size="sm"
                      >
                        {isAccepting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Priimama...
                          </>
                        ) : (
                          'Priimti sutikimą'
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {allAccepted && (
          <div className="mt-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle2 className="h-5 w-5" />
              <p className="font-semibold">Visi sutikimai priimti!</p>
            </div>
            <p className="text-sm text-green-700 mt-2">
              Dabar laukite Platformos patvirtinimo. Būsite informuoti, kai organizacija bus aktyvuota.
            </p>
          </div>
        )}
      </CardContent>

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <ConsentDocumentViewer
          consentType={viewingDocument}
          isOpen={!!viewingDocument}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </Card>
  )
}

