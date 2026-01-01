'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import {
  getOnboardingReadiness,
  submitOrgForReview,
  getReviewRequest,
  getOrgStatus,
  type OnboardingReadiness,
  type ReviewRequest,
} from '@/app/actions/onboarding'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface ReadinessChecklistProps {
  orgId: string
}

export function ReadinessChecklist({ orgId }: ReadinessChecklistProps) {
  const { toast } = useToast()
  const [readiness, setReadiness] = useState<OnboardingReadiness | null>(null)
  const [reviewRequest, setReviewRequest] = useState<ReviewRequest | null>(null)
  const [orgStatus, setOrgStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => {
    loadData()
  }, [orgId])

  const loadData = async () => {
    try {
      const [readinessData, requestData, status] = await Promise.all([
        getOnboardingReadiness(orgId),
        getReviewRequest(orgId),
        getOrgStatus(orgId),
      ])
      setReadiness(readinessData)
      setReviewRequest(requestData)
      setOrgStatus(status)
    } catch (error) {
      console.error('Error loading readiness:', error)
      toast({
        title: 'Klaida',
        description: 'Nepavyko įkelti duomenų',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!readiness?.ready_to_submit) {
      toast({
        title: 'Klaida',
        description: 'Negalima pateikti - trūksta reikalingų duomenų',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      const result = await submitOrgForReview(orgId, note || undefined)
      if (result.success) {
        toast({
          title: 'Sėkmė',
          description: 'Bendruomenė pateikta Branduolio admin patvirtinimui',
        })
        setSubmitDialogOpen(false)
        setNote('')
        await loadData()
        // Refresh page to show updated status
        window.location.reload()
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko pateikti bendruomenės',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error submitting:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko netikėta klaida',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
        </CardContent>
      </Card>
    )
  }

  // If already submitted, show status
  if (orgStatus === 'SUBMITTED_FOR_REVIEW' || orgStatus === 'NEEDS_CHANGES' || orgStatus === 'REJECTED') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Registracijos būsena</CardTitle>
          <CardDescription>
            {orgStatus === 'SUBMITTED_FOR_REVIEW' && 'Bendruomenė pateikta Branduolio admin patvirtinimui'}
            {orgStatus === 'NEEDS_CHANGES' && 'Reikia pataisymų registracijoje'}
            {orgStatus === 'REJECTED' && 'Bendruomenės registracija atmesta'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {reviewRequest?.admin_note && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-medium text-amber-900 mb-1">Branduolio admin pastaba:</p>
              <p className="text-sm text-amber-800">{reviewRequest.admin_note}</p>
            </div>
          )}
          {orgStatus === 'NEEDS_CHANGES' && (
            <Button onClick={() => window.location.reload()} variant="outline">
              Atnaujinti duomenis
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  // If already active, don't show checklist
  if (orgStatus === 'ACTIVE') {
    return null
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Registracijos patikra</CardTitle>
          <CardDescription>
            Patikrinkite, ar visi reikalingi duomenys užpildyti prieš pateikiant Branduolio admin patvirtinimui
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                {readiness?.has_required_org_fields ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <div>
                  <p className="font-medium">Bendruomenės duomenys</p>
                  <p className="text-sm text-slate-600">
                    Pavadinimas, slug, kontaktinis el. paštas
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                {readiness?.has_bylaws ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <div>
                  <p className="font-medium">Įstatai</p>
                  <p className="text-sm text-slate-600">
                    Įkelti įstatų PDF dokumentas
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                {readiness?.has_governance_required ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <div>
                  <p className="font-medium">Vidaus taisyklės (klausimynas)</p>
                  <p className="text-sm text-slate-600">
                    Visi privalomi governance klausimai užpildyti
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button
              onClick={() => setSubmitDialogOpen(true)}
              disabled={!readiness?.ready_to_submit}
              className="w-full"
              size="lg"
            >
              Pateikti tvirtinimui
            </Button>
            {!readiness?.ready_to_submit && (
              <p className="text-sm text-slate-500 mt-2 text-center">
                Užbaikite visus reikalingus žingsnius prieš pateikiant
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pateikti tvirtinimui</DialogTitle>
            <DialogDescription>
              Patvirtinkite, kad norite pateikti bendruomenę Branduolio admin patvirtinimui.
              Po pateikimo negalėsite redaguoti duomenų, kol admin nepatvirtins arba neprašys pataisymų.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="note">Pastaba (neprivaloma)</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Pridėkite pastabą Branduolio admin..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSubmitDialogOpen(false)
                setNote('')
              }}
              disabled={submitting}
            >
              Atšaukti
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Pateikiama...
                </>
              ) : (
                'Pateikti'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

