'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ThumbsUp, ThumbsDown, Minus, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import {
  canCastVote,
  castVote,
  getVoteTally,
  type CanCastVoteResult,
  type VoteTally,
} from '@/app/actions/voting'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'

interface VotingSectionProps {
  resolutionId: string
  orgId: string
  isOwner: boolean
  isBoard: boolean
  onResolutionStatusChanged?: () => void
}

export function VotingSection({
  resolutionId,
  orgId,
  isOwner,
  isBoard,
  onResolutionStatusChanged,
}: VotingSectionProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [canVote, setCanVote] = useState<CanCastVoteResult | null>(null)
  const [tally, setTally] = useState<VoteTally | null>(null)
  const [userVote, setUserVote] = useState<'FOR' | 'AGAINST' | 'ABSTAIN' | null>(null)
  const [voteId, setVoteId] = useState<string | null>(null)

  useEffect(() => {
    loadVoteData()
  }, [resolutionId])

  const loadVoteData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      // Get vote ID from resolution
      const { data: voteData } = await supabase
        .from('votes')
        .select('id, status')
        .eq('resolution_id', resolutionId)
        .eq('kind', 'RESOLUTION')
        .maybeSingle()

      if (!voteData) {
        setLoading(false)
        return
      }

      setVoteId(voteData.id)

      // Load can vote check and tally in parallel
      const [canVoteResult, tallyResult] = await Promise.all([
        canCastVote(voteData.id, user.id),
        getVoteTally(voteData.id),
      ])

      setCanVote(canVoteResult)
      setTally(tallyResult)

      // Get user's existing vote
      if (canVoteResult.allowed && tallyResult) {
        const { data: ballot } = await supabase
          .from('ballots')
          .select('choice')
          .eq('vote_id', voteData.id)
          .eq('user_id', user.id)
          .maybeSingle()

        if (ballot) {
          setUserVote(ballot.choice as 'FOR' | 'AGAINST' | 'ABSTAIN')
        }
      }
    } catch (error) {
      console.error('Error loading vote data:', error)
      toast({
        title: 'Klaida',
        description: 'Nepavyko įkelti balsavimo duomenų',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleVote = async (choice: 'FOR' | 'AGAINST' | 'ABSTAIN') => {
    if (!voteId || !canVote?.allowed) return

    setProcessing(true)
    try {
      const result = await castVote({
        voteId,
        choice,
        channel: 'WEB',
      })

      if (result.ok) {
        toast({
          title: 'Sėkmė',
          description: 'Balsas užfiksuotas',
        })
        setUserVote(choice)
        await loadVoteData()
        if (onResolutionStatusChanged) {
          onResolutionStatusChanged()
        }
      } else {
        const errorMessage =
          result.reason === 'VOTE_CLOSED'
            ? 'Balsavimas jau baigtas'
            : result.reason === 'ALREADY_VOTED'
              ? 'Jūs jau balsavote'
              : result.reason === 'CAN_VOTE_BLOCKED'
                ? 'Neturite teisės balsuoti'
                : 'Nepavyko užfiksuoti balso'

        toast({
          title: 'Klaida',
          description: errorMessage,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error casting vote:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko klaida',
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!voteId || !tally) {
    return null
  }

  const isVoteOpen = tally.status === 'OPEN'
  const canUserVote = isVoteOpen && canVote?.allowed && !userVote && !processing

  return (
    <Card>
      <CardHeader>
        <CardTitle>Balsavimas</CardTitle>
        <CardDescription>
          {isVoteOpen ? 'Balsuokite dėl šio nutarimo' : 'Balsavimas baigtas'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!userVote ? (
          <div className="flex gap-2">
            <Button
              onClick={() => handleVote('FOR')}
              disabled={!canUserVote}
              className="flex-1"
              size="lg"
            >
              <ThumbsUp className="h-5 w-5 mr-2" />
              PRITARIU
            </Button>
            <Button
              onClick={() => handleVote('AGAINST')}
              disabled={!canUserVote}
              variant="destructive"
              className="flex-1"
              size="lg"
            >
              <ThumbsDown className="h-5 w-5 mr-2" />
              NEPRITARIU
            </Button>
            <Button
              onClick={() => handleVote('ABSTAIN')}
              disabled={!canUserVote}
              variant="outline"
              className="flex-1"
              size="lg"
            >
              <Minus className="h-5 w-5 mr-2" />
              SUSILAIKAU
            </Button>
          </div>
        ) : (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Jūs balsavote: <strong>
                {userVote === 'FOR' ? 'PRITARIU' : userVote === 'AGAINST' ? 'NEPRITARIU' : 'SUSILAIKAU'}
              </strong>
            </AlertDescription>
          </Alert>
        )}

        {!canVote?.allowed && canVote?.reason && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {canVote.reason === 'VOTE_CLOSED'
                ? 'Balsavimas jau baigtas'
                : canVote.reason === 'ALREADY_VOTED'
                  ? 'Jūs jau balsavote'
                  : canVote.reason === 'CAN_VOTE_BLOCKED'
                    ? canVote.details?.can_vote_reason || 'Neturite teisės balsuoti'
                    : 'Negalite balsuoti'}
            </AlertDescription>
          </Alert>
        )}

        {tally && (
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{tally.votes_for || 0}</div>
              <div className="text-sm text-gray-600">PRITARIU</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{tally.votes_against || 0}</div>
              <div className="text-sm text-gray-600">NEPRITARIU</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{tally.votes_abstain || 0}</div>
              <div className="text-sm text-gray-600">SUSILAIKĖ</div>
            </div>
          </div>
        )}

        {tally && (
          <div className="text-center text-sm text-gray-600">
            Iš viso balsavo: <strong>{tally.votes_total || 0}</strong>
            {tally.total_eligible && ` / ${tally.total_eligible} narių`}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

