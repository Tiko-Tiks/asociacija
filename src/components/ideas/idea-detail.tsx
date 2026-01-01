'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Play,
  CheckSquare,
  FileText,
} from 'lucide-react'
import {
  getIdea,
  getIdeaVoteTally,
  getUserIdeaVote,
  openIdeaForVoting,
  castIdeaVote,
  closeIdeaVote,
  evaluateIdeaVoteAndTransition,
  type Idea,
  type IdeaVoteTally,
} from '@/app/actions/ideas'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { format, formatDistanceToNow } from 'date-fns'
import { lt } from 'date-fns/locale'
import { CreateProjectModal } from '../projects/create-project-modal'
import { checkBoardPosition } from '@/app/actions/check-board-position'
import { createClient } from '@/lib/supabase/client'

interface IdeaDetailProps {
  ideaId: string
  orgId: string
  orgSlug: string
  isOwner: boolean
  isBoard: boolean
}

export function IdeaDetail({ ideaId, orgId, orgSlug, isOwner, isBoard }: IdeaDetailProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [idea, setIdea] = useState<Idea | null>(null)
  const [tally, setTally] = useState<IdeaVoteTally | null>(null)
  const [userVote, setUserVote] = useState<'FOR' | 'AGAINST' | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showCreateProject, setShowCreateProject] = useState(false)

  const canManage = isOwner || isBoard

  useEffect(() => {
    loadData()
  }, [ideaId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [ideaData, tallyData] = await Promise.all([
        getIdea(ideaId),
        getIdeaVoteTally(ideaId),
      ])

      setIdea(ideaData)
      setTally(tallyData)

      // Get user's vote if vote exists
      if (tallyData?.vote_id) {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          const vote = await getUserIdeaVote(tallyData.vote_id, user.id)
          setUserVote(vote)
        }
      }
    } catch (error) {
      console.error('Error loading idea:', error)
      toast({
        title: 'Klaida',
        description: 'Nepavyko įkelti idėjos',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenVoting = async () => {
    if (!idea) return

    setProcessing(true)
    try {
      const result = await openIdeaForVoting(idea.id)
      if (result.ok) {
        toast({
          title: 'Sėkmė',
          description: 'Balsavimas pradėtas',
        })
        await loadData()
      } else {
        toast({
          title: 'Klaida',
          description: result.reason === 'FORBIDDEN' ? 'Neturite teisių' : 'Nepavyko pradėti balsavimo',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error opening voting:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko klaida',
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleVote = async (choice: 'FOR' | 'AGAINST') => {
    if (!tally?.vote_id) return

    setProcessing(true)
    try {
      const result = await castIdeaVote(tally.vote_id, choice)
      if (result.ok) {
        toast({
          title: 'Sėkmė',
          description: 'Balsas užfiksuotas',
        })
        setUserVote(choice)
        await loadData()
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

  const handleCloseAndEvaluate = async () => {
    if (!tally?.vote_id) return

    setProcessing(true)
    try {
      const result = await closeIdeaVote(tally.vote_id)
      if (result.ok) {
        // Then evaluate
        const evalResult = await evaluateIdeaVoteAndTransition(tally.vote_id, false, 0)
        if (evalResult.ok) {
          toast({
            title: 'Sėkmė',
            description: `Idėja: ${evalResult.outcome}`,
          })
          await loadData()
        } else {
          toast({
            title: 'Klaida',
            description: 'Nepavyko įvertinti rezultato',
            variant: 'destructive',
          })
        }
      } else {
        toast({
          title: 'Klaida',
          description: 'Nepavyko uždaryti balsavimo',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error closing vote:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko klaida',
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleCreateProject = async (budgetEur: number) => {
    if (!tally?.vote_id) return

    setProcessing(true)
    try {
      const result = await evaluateIdeaVoteAndTransition(tally.vote_id, true, budgetEur)
      if (result.ok && result.outcome === 'PASSED') {
        toast({
          title: 'Sėkmė',
          description: 'Projektas sukurtas',
        })
        setShowCreateProject(false)
        await loadData()
        if (result.project_id) {
          router.push(`/dashboard/${orgSlug}/projects/${result.project_id}`)
        }
      } else {
        toast({
          title: 'Klaida',
          description: result.reason || 'Nepavyko sukurti projekto',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error creating project:', error)
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
    return <div className="text-sm text-gray-500">Kraunama...</div>
  }

  if (!idea) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">Idėja nerasta</CardContent>
      </Card>
    )
  }

  const isVoteOpen = tally?.effective_status === 'OPEN' && idea.status === 'OPEN'
  const isVoteClosed = tally?.effective_status === 'CLOSED' || idea.status !== 'OPEN'
  const canVote = isVoteOpen && !userVote && !processing

  // Calculate participation
  const participationPercent =
    tally && tally.total_active_members > 0
      ? Math.round((tally.votes_total / tally.total_active_members) * 100)
      : 0

  return (
    <div className="space-y-6">
      {/* Idea Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <CardTitle className="text-2xl">{idea.title}</CardTitle>
              {idea.summary && <CardDescription className="mt-2">{idea.summary}</CardDescription>}
            </div>
            <Badge variant={idea.status === 'OPEN' ? 'default' : 'secondary'}>
              {idea.status === 'OPEN' ? 'Balsuojama' : idea.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {idea.details && (
            <div>
              <h3 className="font-semibold mb-2">Išsamus aprašymas:</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{idea.details}</p>
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Sukurta: {format(new Date(idea.created_at), 'PPpp', { locale: lt })}</span>
            {idea.opened_at && (
              <span>Balsavimas pradėtas: {format(new Date(idea.opened_at), 'PPpp', { locale: lt })}</span>
            )}
            {idea.public_visible && <Badge variant="outline">Vieša</Badge>}
          </div>
        </CardContent>
      </Card>

      {/* Voting Section */}
      {idea.status === 'DRAFT' && canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Balsavimo valdymas</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={handleOpenVoting} disabled={processing}>
              <Play className="h-4 w-4 mr-2" />
              {processing ? 'Vykdoma...' : 'Pradėti balsavimą'}
            </Button>
          </CardContent>
        </Card>
      )}

      {isVoteOpen && (
        <Card>
          <CardHeader>
            <CardTitle>Balsavimas</CardTitle>
            <CardDescription>
              {tally?.closes_at &&
                `Balsavimas baigiasi: ${format(new Date(tally.closes_at), 'PPpp', { locale: lt })}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!userVote ? (
              <div className="flex gap-4">
                <Button
                  onClick={() => handleVote('FOR')}
                  disabled={!canVote}
                  className="flex-1"
                  size="lg"
                >
                  <ThumbsUp className="h-5 w-5 mr-2" />
                  PRITARIU
                </Button>
                <Button
                  onClick={() => handleVote('AGAINST')}
                  disabled={!canVote}
                  variant="destructive"
                  className="flex-1"
                  size="lg"
                >
                  <ThumbsDown className="h-5 w-5 mr-2" />
                  NEPRITARIU
                </Button>
              </div>
            ) : (
              <Alert>
                <CheckSquare className="h-4 w-4" />
                <AlertDescription>
                  Jūs balsavote: <strong>{userVote === 'FOR' ? 'PRITARIU' : 'NEPRITARIU'}</strong>
                </AlertDescription>
              </Alert>
            )}

            {tally && (
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{tally.votes_for}</div>
                  <div className="text-sm text-gray-600">PRITARIU</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{tally.votes_against}</div>
                  <div className="text-sm text-gray-600">NEPRITARIU</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{tally.votes_total}</div>
                  <div className="text-sm text-gray-600">
                    Dalyvavo ({participationPercent}%)
                  </div>
                </div>
              </div>
            )}

            {canManage && (
              <Button onClick={handleCloseAndEvaluate} disabled={processing} variant="outline">
                <CheckSquare className="h-4 w-4 mr-2" />
                {processing ? 'Vykdoma...' : 'Uždaryti ir įvertinti'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {isVoteClosed && tally && (
        <Card>
          <CardHeader>
            <CardTitle>Balsavimo rezultatai</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{tally.votes_for}</div>
                <div className="text-sm text-gray-600">PRITARIU</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{tally.votes_against}</div>
                <div className="text-sm text-gray-600">NEPRITARIU</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{tally.votes_total}</div>
                <div className="text-sm text-gray-600">
                  Dalyvavo ({participationPercent}% / {tally.total_active_members} narių)
                </div>
              </div>
            </div>

            {idea.status === 'PASSED' && canManage && (
              <div className="mt-4">
                <Button onClick={() => setShowCreateProject(true)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Sukurti projektą
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showCreateProject && (
        <CreateProjectModal
          ideaId={idea.id}
          ideaTitle={idea.title}
          orgId={orgId}
          onClose={() => setShowCreateProject(false)}
          onSubmit={handleCreateProject}
        />
      )}
    </div>
  )
}

