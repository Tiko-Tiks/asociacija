'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ThumbsUp, ThumbsDown, Minus, Loader2, AlertCircle, ExternalLink, FileText } from 'lucide-react'
import { castVoteWithValidation, canCastVoteWithSnapshot, getUserBallot, type Vote as VoteType } from '@/app/actions/voting'
import { getAgendaItems, type AgendaItem } from '@/app/actions/meetings'
import { useToast } from '@/components/ui/use-toast'
import { format } from 'date-fns'
import { lt } from 'date-fns/locale'
import Link from 'next/link'

interface VoteModalProps {
  vote: VoteType & { resolution_title: string; meeting_title: string | null; has_voted: boolean }
  orgId: string
  orgSlug: string
  onClose: () => void
  onVoteSubmitted: () => void
}

export function VoteModal({ vote, orgId, orgSlug, onClose, onVoteSubmitted }: VoteModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([])
  const [canVote, setCanVote] = useState<{ allowed: boolean; reason: string } | null>(null)
  const [userVote, setUserVote] = useState<'FOR' | 'AGAINST' | 'ABSTAIN' | null>(null)
  const [selectedChoice, setSelectedChoice] = useState<'FOR' | 'AGAINST' | 'ABSTAIN' | null>(null)

  useEffect(() => {
    loadData()
  }, [vote.id])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load agenda items if meeting exists
      if (vote.meeting_id) {
        try {
          const items = await getAgendaItems(vote.meeting_id)
          setAgendaItems(items)
        } catch (error) {
          console.error('Error loading agenda:', error)
        }
      }

      // Check if user can vote
      const canVoteResult = await canCastVoteWithSnapshot(vote.id, 'IN_PERSON')
      setCanVote(canVoteResult)

      // Get user's existing vote
      const ballot = await getUserBallot(vote.id)
      if (ballot) {
        setUserVote(ballot.choice as 'FOR' | 'AGAINST' | 'ABSTAIN')
        setSelectedChoice(ballot.choice as 'FOR' | 'AGAINST' | 'ABSTAIN')
      } else {
        setSelectedChoice(null)
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
    if (!canVote?.allowed) {
      const reason = canVote?.details?.can_vote_reason || canVote?.reason || 'Negalite balsuoti'
      toast({
        title: 'Klaida',
        description: reason,
        variant: 'destructive',
      })
      return
    }

    setProcessing(true)
    try {
      const result = await castVoteWithValidation({
        vote_id: vote.id,
        choice,
        channel: 'IN_PERSON', // Default channel
      })

      if (result.ok) {
        toast({
          title: 'Balsas pateiktas',
          description: 'Jūsų balsas sėkmingai užregistruotas',
        })
        setUserVote(choice)
        onVoteSubmitted()
      } else {
        toast({
          title: 'Klaida',
          description: result.reason || 'Nepavyko pateikti balso',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error casting vote:', error)
      toast({
        title: 'Klaida',
        description: 'Nepavyko pateikti balso',
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  const agendaItemForVote = agendaItems.find(item => item.resolution_id === vote.resolution_id)

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{vote.resolution_title}</DialogTitle>
          <DialogDescription>
            {vote.meeting_title && (
              <span>Susirinkimas: {vote.meeting_title}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
            <p className="mt-2 text-sm text-slate-500">Kraunama...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Alert if cannot vote */}
            {canVote && !canVote.allowed && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div>
                      <strong>Negalite balsuoti:</strong> {canVote.reason}
                    </div>
                    {canVote.details?.can_vote_reason && (
                      <div className="text-sm mt-2 p-2 bg-slate-100 rounded">
                        <strong>Priežastis:</strong> {canVote.details.can_vote_reason}
                        {canVote.details.can_vote_details && (
                          <div className="mt-1 text-xs text-slate-600">
                            {JSON.stringify(canVote.details.can_vote_details, null, 2)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Agenda Items */}
            {agendaItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Darbotvarkė
                  </CardTitle>
                  <CardDescription>
                    Susipažinkite su darbotvarkės klausimais prieš balsuodami
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {agendaItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between p-3 border rounded-lg hover:bg-slate-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{item.item_no}</Badge>
                            <h4 className="font-medium">{item.title}</h4>
                            {item.resolution_id === vote.resolution_id && (
                              <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                                Šis klausimas
                              </Badge>
                            )}
                          </div>
                          {item.summary && (
                            <p className="text-sm text-slate-600 mt-1">{item.summary}</p>
                          )}
                          {item.details && (
                            <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                              {item.details}
                            </p>
                          )}
                        </div>
                        <Link
                          href={`/dashboard/${orgSlug}/governance/${vote.meeting_id}#agenda-${item.id}`}
                          target="_blank"
                          className="ml-4"
                        >
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Detaliau
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Vote Options */}
            <Card>
              <CardHeader>
                <CardTitle>Jūsų balsas</CardTitle>
                <CardDescription>
                  Pasirinkite savo poziciją dėl šio klausimo
                </CardDescription>
              </CardHeader>
              <CardContent>
                {userVote ? (
                  <Alert className="bg-green-50 border-green-200">
                    <AlertDescription className="text-green-900">
                      <strong>Jūs jau balsavote:</strong>{' '}
                      {userVote === 'FOR' && 'Už'}
                      {userVote === 'AGAINST' && 'Prieš'}
                      {userVote === 'ABSTAIN' && 'Susilaikau'}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button
                      variant={selectedChoice === 'FOR' ? 'default' : 'outline'}
                      size="lg"
                      className="h-24 flex-col gap-2"
                      onClick={() => {
                        setSelectedChoice('FOR')
                        handleVote('FOR')
                      }}
                      disabled={processing || !canVote?.allowed}
                    >
                      <ThumbsUp className="h-6 w-6" />
                      <span>Už</span>
                    </Button>

                    <Button
                      variant={selectedChoice === 'AGAINST' ? 'default' : 'outline'}
                      size="lg"
                      className="h-24 flex-col gap-2"
                      onClick={() => {
                        setSelectedChoice('AGAINST')
                        handleVote('AGAINST')
                      }}
                      disabled={processing || !canVote?.allowed}
                    >
                      <ThumbsDown className="h-6 w-6" />
                      <span>Prieš</span>
                    </Button>

                    <Button
                      variant={selectedChoice === 'ABSTAIN' ? 'default' : 'outline'}
                      size="lg"
                      className="h-24 flex-col gap-2"
                      onClick={() => {
                        setSelectedChoice('ABSTAIN')
                        handleVote('ABSTAIN')
                      }}
                      disabled={processing || !canVote?.allowed}
                    >
                      <Minus className="h-6 w-6" />
                      <span>Susilaikau</span>
                    </Button>
                  </div>
                )}

                {processing && (
                  <div className="mt-4 text-center">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-400" />
                    <p className="text-sm text-slate-500 mt-2">Apdorojama...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Vote Info */}
            <div className="text-sm text-slate-600 space-y-1">
              <p>
                <strong>Balsavimas pradėtas:</strong>{' '}
                {format(new Date(vote.opens_at), 'yyyy-MM-dd HH:mm', { locale: lt })}
              </p>
              {vote.closes_at && (
                <p>
                  <strong>Balsavimas baigiasi:</strong>{' '}
                  {format(new Date(vote.closes_at), 'yyyy-MM-dd HH:mm', { locale: lt })}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Uždaryti
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

