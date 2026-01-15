'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { Vote, CheckCircle2, XCircle, Minus, Loader2 } from 'lucide-react'
import { canCastVoteWithSnapshot, castVoteWithValidation } from '@/app/actions/voting'
import { registerRemoteAttendance } from '@/app/actions/meeting-attendance'
import { useToast } from '@/components/ui/use-toast'

interface AgendaItemVotingProps {
  voteId: string
  agendaItemTitle: string
  agendaItemNo: number
  meetingId: string
  onVoteSuccess?: () => void
}

export function AgendaItemVoting({
  voteId,
  agendaItemTitle,
  agendaItemNo,
  meetingId,
  onVoteSuccess,
}: AgendaItemVotingProps) {
  const { toast } = useToast()
  const [canVote, setCanVote] = useState<{ allowed: boolean; reason?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState(false)
  const [hasVoted, setHasVoted] = useState(false)

  useEffect(() => {
    const checkVote = async () => {
      try {
        const result = await canCastVoteWithSnapshot(voteId, 'REMOTE')
        setCanVote(result)
        if (!result.allowed && result.reason === 'ALREADY_VOTED') {
          setHasVoted(true)
        }
      } catch (error) {
        console.error('Error checking vote:', error)
      } finally {
        setLoading(false)
      }
    }

    checkVote()
  }, [voteId])

  const handleVote = async (choice: 'FOR' | 'AGAINST' | 'ABSTAIN') => {
    setVoting(true)
    try {
      console.log('[AgendaItemVoting] Starting vote:', { voteId, choice, meetingId })
      
      // Register remote attendance if first vote
      // This ensures member is registered as participating remotely
      const attendanceResult = await registerRemoteAttendance(meetingId)
      console.log('[AgendaItemVoting] Attendance registration:', attendanceResult)

      // Cast vote
      const result = await castVoteWithValidation({
        vote_id: voteId, // Note: API expects vote_id (snake_case)
        choice,
        channel: 'REMOTE', // REMOTE channel = remote voting
      })

      console.log('[AgendaItemVoting] Vote result:', result)

      if (result.ok) {
        toast({
          title: 'Balsas užregistruotas',
          description: `Jūsų balsas už klausimą #${agendaItemNo} sėkmingai užregistruotas.`,
        })
        setHasVoted(true)
        setCanVote({ allowed: false, reason: 'ALREADY_VOTED' })
        
        // Trigger storage event to notify other components (like ActiveVotesAlert)
        // This allows the alert to refresh automatically after voting
        try {
          localStorage.setItem(`vote-cast-${meetingId}`, Date.now().toString())
          // Also trigger a custom event for same-tab updates
          window.dispatchEvent(new CustomEvent('vote-cast', { detail: { meetingId } }))
        } catch (e) {
          // localStorage might not be available, ignore
          console.log('[AgendaItemVoting] Could not set localStorage:', e)
        }
        
        // Notify parent component
        if (onVoteSuccess) {
          onVoteSuccess()
        }
      } else {
        console.error('[AgendaItemVoting] Vote failed:', result.reason)
        toast({
          title: 'Klaida',
          description: result.reason || 'Nepavyko užregistruoti balso',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('[AgendaItemVoting] Exception during vote:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko klaida balsuojant',
        variant: 'destructive',
      })
    } finally {
      setVoting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!canVote || !canVote.allowed) {
    if (hasVoted || canVote.reason === 'ALREADY_VOTED') {
      return (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Jūs jau balsavote už šį klausimą. Balsavimas užregistruotas.
          </AlertDescription>
        </Alert>
      )
    }

    return (
      <Alert variant="destructive">
        <AlertDescription>
          Negalite balsuoti: {canVote.reason || 'Nežinoma priežastis'}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        <Vote className="h-4 w-4" />
        Jūsų balsas:
      </div>
      
      <div className="flex gap-2">
        <Button
          size="lg"
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
          onClick={() => handleVote('FOR')}
          disabled={voting}
        >
          <CheckCircle2 className="h-5 w-5 mr-2" />
          Už
        </Button>
        <Button
          size="lg"
          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold"
          onClick={() => handleVote('AGAINST')}
          disabled={voting}
        >
          <XCircle className="h-5 w-5 mr-2" />
          Prieš
        </Button>
        <Button
          size="lg"
          className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
          onClick={() => handleVote('ABSTAIN')}
          disabled={voting}
        >
          <Minus className="h-5 w-5 mr-2" />
          Susilaikau
        </Button>
      </div>

      {voting && (
        <div className="flex items-center justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          <span className="ml-2 text-sm text-slate-600">Registruojamas balsas...</span>
        </div>
      )}
    </div>
  )
}

