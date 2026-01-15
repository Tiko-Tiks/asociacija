/**
 * GA COMPLETION PANEL (FINAL GUARD)
 * 
 * Atsakomybė:
 * - Rodo GACompletionChecklist
 * - Complete meeting button
 * - Blokuoja jei backend sako NO
 * 
 * ❌ UI negali apeiti backend validation
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'

interface GACompletionPanelProps {
  meetingId: string
  orgSlug: string
  completionValidation: {
    ready: boolean
    checks: {
      procedural_items_approved: boolean
      all_votes_closed: boolean
      quorum_met: boolean
      protocol_signed: boolean
    }
    missing: string[]
    ga_mode: 'TEST' | 'PRODUCTION'
  }
}

export function GACompletionPanel({
  meetingId,
  orgSlug,
  completionValidation,
}: GACompletionPanelProps) {
  const [completing, setCompleting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleComplete = async () => {
    if (!completionValidation.ready) {
      toast({
        title: 'Klaida',
        description: 'GA susirinkimas neparuoštas užbaigimui',
        variant: 'destructive',
      })
      return
    }

    setCompleting(true)
    try {
      const response = await fetch(`/api/meetings/${meetingId}/complete`, {
        method: 'POST',
      })

      if (response.ok) {
        toast({
          title: 'Sėkmė',
          description: 'GA susirinkimas užbaigtas',
        })
        router.refresh()
      } else {
        const error = await response.json()
        toast({
          title: 'Klaida',
          description: error.message || 'Nepavyko užbaigti',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Klaida',
        description: 'Įvyko klaida',
        variant: 'destructive',
      })
    } finally {
      setCompleting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>🏁 GA Užbaigimas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Checklist */}
        <div className="space-y-2 rounded-md border p-4">
          <div className="mb-2 font-medium">Reikalavimai:</div>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              {completionValidation.checks.procedural_items_approved ? '✅' : '❌'}
              <span>Procedūriniai klausimai (1-3) patvirtinti</span>
            </div>
            <div className="flex items-center gap-2">
              {completionValidation.checks.all_votes_closed ? '✅' : '❌'}
              <span>Visi balsavimai uždaryti</span>
            </div>
            <div className="flex items-center gap-2">
              {completionValidation.checks.quorum_met ? '✅' : '⚠️'}
              <span>
                Kvorumas pasiektas{' '}
                {completionValidation.ga_mode === 'PRODUCTION' && '(PRIVALOMA)'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {completionValidation.checks.protocol_signed ? '✅' : '⚠️'}
              <span>
                Protokolo PDF įkeltas{' '}
                {completionValidation.ga_mode === 'PRODUCTION' && '(PRIVALOMA)'}
              </span>
            </div>
          </div>
        </div>

        {/* Complete button */}
        <Button
          onClick={handleComplete}
          disabled={!completionValidation.ready || completing}
          className="w-full"
          size="lg"
        >
          {completing ? 'Užbaigiama...' : 'UŽBAIGTI GA SUSIRINKIMĄ'}
        </Button>

        {/* Blocking reason */}
        {!completionValidation.ready && completionValidation.missing.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              <div className="font-medium">❌ Neleidžiama užbaigti:</div>
              <ul className="mt-2 list-inside list-disc text-sm">
                {completionValidation.missing.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* TEST mode warning */}
        {completionValidation.ready && completionValidation.ga_mode === 'TEST' && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertDescription className="text-yellow-800">
              ⚠️ TEST režimas: Rezultatai neturės teisinės galios
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

