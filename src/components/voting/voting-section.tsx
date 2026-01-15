'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ThumbsUp, ThumbsDown, Minus, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import {
  canCastVoteWithSnapshot,
  castVoteWithValidation,
  createVote,
  getVoteTally,
  getUserBallot,
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
  const [voteMissing, setVoteMissing] = useState(false)

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
        .in('kind', ['GA', 'OPINION'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!voteData) {
        setVoteMissing(true)
        setLoading(false)
        return
      }

      setVoteId(voteData.id)
      setVoteMissing(false)

      // Load can vote check and tally in parallel
      const [canVoteResult, tallyResult] = await Promise.all([
        canCastVoteWithSnapshot(voteData.id, 'REMOTE'),
        getVoteTally(voteData.id),
      ])

      setCanVote(canVoteResult)
      setTally(tallyResult)

      // Get user's existing vote
      if (tallyResult) {
        const ballot = await getUserBallot(voteData.id)
        if (ballot?.choice) {
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
      const result = await castVoteWithValidation({
        vote_id: voteId,
        choice,
        channel: 'REMOTE',
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

  const canCreateVote = isOwner || isBoard

  const handleCreateVote = async () => {
    if (!canCreateVote) return
    setProcessing(true)
    try {
      const result = await createVote({ resolution_id: resolutionId, kind: 'OPINION' })
      if (result.success) {
        toast({
          title: 'Sėkmė',
          description: 'Balsavimas sukurtas',
        })
        await loadVoteData()
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko sukurti balsavimo',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error creating vote:', error)
      toast({
        title: 'Klaida',
        description: 'Nepavyko sukurti balsavimo',
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  if (voteMissing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Balsavimas</CardTitle>
          <CardDescription>Balsavimas dar nepradėtas</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Balsavimas atsiras, kai susirinkime bus sukurtas balsavimas šiam nutarimui.
          </p>
          {canCreateVote && (
            <Button
              onClick={handleCreateVote}
              disabled={processing}
              className="mt-4 w-full"
            >
              {processing ? 'Kuriama...' : 'Sukurti balsavimą'}
            </Button>
          )}
        </CardContent>
      </Card>
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
        {/* Only show voting buttons if vote is OPEN */}
        {isVoteOpen && (
          <>
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
                  Jūs balsavote:{' '}
                  <strong>
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
          </>
        )}

        {/* Show closed message if vote is closed and user hasn't voted */}
        {!isVoteOpen && !userVote && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Balsavimas uždarytas. Rezultatai pateikti žemiau.
            </AlertDescription>
          </Alert>
        )}

        {/* Show user's vote if they voted and vote is closed */}
        {!isVoteOpen && userVote && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Jūsų balsas:{' '}
              <strong>
                {userVote === 'FOR' ? 'PRITARIU' : userVote === 'AGAINST' ? 'NEPRITARIU' : 'SUSILAIKAU'}
              </strong>
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
              <div className="text-sm text-gray-600">SUSILAIKAU</div>
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
