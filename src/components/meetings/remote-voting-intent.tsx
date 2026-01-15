'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Vote, CheckCircle2, Loader2 } from 'lucide-react'
import { registerRemoteAttendance } from '@/app/actions/meeting-attendance'
import { useToast } from '@/components/ui/use-toast'

interface RemoteVotingIntentProps {
  meetingId: string
  meetingDate: string
  onConfirmed: () => void
}

export function RemoteVotingIntent({
  meetingId,
  meetingDate,
  onConfirmed,
}: RemoteVotingIntentProps) {
  const { toast } = useToast()
  const [showDialog, setShowDialog] = useState(false)
  const [registering, setRegistering] = useState(false)

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('lt-LT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleRegister = async () => {
    setRegistering(true)
    try {
      const result = await registerRemoteAttendance(meetingId)
      if (result.success) {
        toast({
          title: 'Registracija patvirtinta',
          description: 'Jūsų noras balsuoti nuotoliu užregistruotas. Dabar galite prabalsuoti už kiekvieną klausimą.',
        })
        setShowDialog(false)
        onConfirmed()
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko užregistruoti',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error registering remote attendance:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko klaida registruojant',
        variant: 'destructive',
      })
    } finally {
      setRegistering(false)
    }
  }

  return (
    <>
      <Card className="bg-amber-50 dark:bg-amber-900/10 border-amber-200">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                <Vote className="h-5 w-5 text-amber-600" />
                Balsavimas nuotoliu
              </h4>
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
                Jei negalite atvykti į susirinkimą <strong>{formatDate(meetingDate)}</strong>, galite
                išreikšti norą balsuoti nuotoliu. Po patvirtinimo galėsite prabalsuoti už kiekvieną
                darbotvarkės klausimą.
              </p>
            </div>

            <Button
              onClick={() => setShowDialog(true)}
              className="w-full"
              variant="default"
            >
              Išreikšti norą balsuoti nuotoliu
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Patvirtinkite norą balsuoti nuotoliu</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2">
                <p>
                  Patvirtindami, jūs nurodote, kad <strong>negaliate atvykti</strong> į susirinkimą{' '}
                  <strong>{formatDate(meetingDate)}</strong>.
                </p>
                <div>
                  <p className="mb-2">Po patvirtinimo:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Galėsite prabalsuoti už kiekvieną darbotvarkės klausimą</li>
                    <li>Jūsų balsai bus automatiškai užregistruoti</li>
                    <li>Būsite registruotas kaip dalyvaujantis susirinkime nuotoliu</li>
                  </ul>
                </div>
                <p className="text-amber-600 dark:text-amber-400 font-medium mt-3">
                  ⚠️ Atminkite: jei balsavote nuotoliu, negalėsite registruotis kaip dalyvaujantis
                  gyvame susirinkime.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={registering}>Atšaukti</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleRegister()
              }}
              disabled={registering}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {registering ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Registruojama...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Patvirtinti
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

