'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { closeAllVotesForMeeting } from '@/app/actions/vote-management'
import { useToast } from '@/components/ui/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface CloseVotesButtonProps {
  meetingId: string
  openVotesCount: number
  onSuccess?: () => void
}

export function CloseVotesButton({ meetingId, openVotesCount, onSuccess }: CloseVotesButtonProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const handleClose = async () => {
    setLoading(true)
    try {
      const result = await closeAllVotesForMeeting(meetingId)
      
      if (result.success) {
        toast({
          title: 'Sėkmė',
          description: `Uždaryta ${result.closed} balsavimų ir pritaikyti rezultatai`,
        })
        setOpen(false)
        onSuccess?.()
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko uždaryti balsavimų',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error closing votes:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko nenumatyta klaida',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (openVotesCount === 0) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle className="h-5 w-5" />
        <span className="text-sm font-medium">Visi balsavimai uždaryti</span>
      </div>
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="default" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uždaroma...
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 mr-2" />
              Uždaryti {openVotesCount} balsavimus ir pritaikyti rezultatus
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Uždaryti visus balsavimus?</AlertDialogTitle>
          <AlertDialogDescription>
            Šis veiksmas uždarys {openVotesCount} atvirus balsavimus ir automatiškai pritaikys rezultatus 
            (PATVIRTINTA arba ATMESTA) pagal balsų skaičių.
            <br /><br />
            <strong>Ši operacija negrįžtama.</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Atšaukti</AlertDialogCancel>
          <AlertDialogAction onClick={handleClose} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uždaroma...
              </>
            ) : (
              'Taip, uždaryti'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

