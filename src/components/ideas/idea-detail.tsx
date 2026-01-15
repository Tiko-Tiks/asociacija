'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertTriangle,
  FileText,
  Send,
  Loader2,
  User,
  ChevronRight,
  Info,
} from 'lucide-react'
import { IdeaPositions } from './idea-positions'
import {
  getIdea,
  getIdeaComments,
  getIdeaIndicators,
  updateIdeaPhase,
  addIdeaComment,
  promoteToResolutionDraft,
  type Idea,
  type IdeaComment,
  type IdeaIndicators,
} from '@/app/actions/ideas'
import {
  getAllowedTransitions,
  PHASE_CONFIG,
  type IdeaPhase,
} from '@/lib/ideas-utils'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { format, formatDistanceToNow } from 'date-fns'
import { lt } from 'date-fns/locale'
import { formatNameForDiscussion } from '@/lib/vocative'

interface IdeaDetailProps {
  ideaId: string
  orgId: string
  orgSlug: string
  isOwner: boolean
  isBoard: boolean
}

/**
 * PRE-GOVERNANCE Idea Detail
 * 
 * Architectural constraints:
 * - No green/success colors
 * - No approval indicators
 * - Phases are labels only
 * - ready_for_vote uses WARNING color
 * - Promote to resolution requires explicit confirmation
 */
export function IdeaDetail({ ideaId, orgId, orgSlug, isOwner, isBoard }: IdeaDetailProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [idea, setIdea] = useState<Idea | null>(null)
  const [comments, setComments] = useState<IdeaComment[]>([])
  const [indicators, setIndicators] = useState<IdeaIndicators | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  
  // Comment form
  const [newComment, setNewComment] = useState('')
  const [isObjection, setIsObjection] = useState(false)
  const [objectionReason, setObjectionReason] = useState('')
  
  // Promote modal
  const [showPromoteModal, setShowPromoteModal] = useState(false)
  const [promoteConfirmed, setPromoteConfirmed] = useState(false)

  const canManage = isOwner || isBoard

  useEffect(() => {
    loadData()
  }, [ideaId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [ideaData, commentsData, indicatorsData] = await Promise.all([
        getIdea(ideaId),
        getIdeaComments(ideaId),
        getIdeaIndicators(ideaId),
      ])
      setIdea(ideaData)
      setComments(commentsData)
      setIndicators(indicatorsData)
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

  const handlePhaseChange = async (newPhase: IdeaPhase) => {
    if (!idea) return
    
    setProcessing(true)
    try {
      const result = await updateIdeaPhase(idea.id, newPhase)
      if (result.success) {
        toast({
          title: 'Fazė pakeista',
          description: `Idėjos fazė pakeista į "${PHASE_CONFIG[newPhase].label}". Tai yra tik žymė, ne statusas.`,
        })
        await loadData()
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko pakeisti fazės',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error updating phase:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko klaida',
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleAddComment = async () => {
    if (!idea || !newComment.trim()) return

    if (isObjection && !objectionReason.trim()) {
      toast({
        title: 'Klaida',
        description: 'Prieštaravimo priežastis yra privaloma',
        variant: 'destructive',
      })
      return
    }

    setProcessing(true)
    try {
      // v19.0 COMPLIANT: objectionReason is a simple string, not metadata object
      const result = await addIdeaComment(
        idea.id,
        newComment.trim(),
        isObjection,
        isObjection ? objectionReason.trim() : undefined
      )

      if (result.success) {
        toast({
          title: isObjection ? 'Prieštaravimas pridėtas' : 'Komentaras pridėtas',
          description: 'Komentarai yra diskusijos dalis, ne balsai.',
        })
        setNewComment('')
        setIsObjection(false)
        setObjectionReason('')
        await loadData()
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko pridėti komentaro',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error adding comment:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko klaida',
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  const handlePromoteToResolution = async () => {
    if (!idea || !promoteConfirmed) return

    setProcessing(true)
    try {
      const result = await promoteToResolutionDraft(idea.id)
      if (result.success) {
        toast({
          title: 'Rezoliucijos juodraštis sukurtas',
          description: 'Sukurtas DRAFT rezoliucija. Ji neturi teisinės galios iki patvirtinimo Valdymo modulyje.',
        })
        setShowPromoteModal(false)
        // Navigate to resolution
        if (result.resolution_id) {
          router.push(`/dashboard/${orgSlug}/resolutions/${result.resolution_id}`)
        }
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko sukurti rezoliucijos',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error promoting to resolution:', error)
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
        <CardContent className="p-6 text-center text-gray-500">
          Idėja nerasta
        </CardContent>
      </Card>
    )
  }

  const phaseConfig = PHASE_CONFIG[idea.phase]
  const allowedTransitions = getAllowedTransitions(idea.phase)

  return (
    <div className="space-y-6">
      {/* PRE-GOVERNANCE Banner */}
      <Alert className="border-gray-200 bg-gray-50">
        <Info className="h-4 w-4 text-gray-600" />
        <AlertDescription className="text-gray-600 text-sm">
          <strong>Idėjų modulis</strong> – diskusijų erdvė be teisinės ar procedūrinės galios. 
          Fazės yra tik žymės. Sprendimai priimami Valdymo modulyje.
        </AlertDescription>
      </Alert>

      {/* Idea Content */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-2xl text-gray-900">{idea.title}</CardTitle>
              <CardDescription className="mt-2">
                Sukurta: {format(new Date(idea.created_at), 'yyyy-MM-dd HH:mm', { locale: lt })}
              </CardDescription>
            </div>
            <PhaseBadge phase={idea.phase} large />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {idea.summary && (
            <div>
              <h3 className="font-semibold mb-2 text-gray-900">Trumpas aprašymas:</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{idea.summary}</p>
            </div>
          )}
          {idea.details && (
            <div>
              <h3 className="font-semibold mb-2 text-gray-900">Išsamus aprašymas:</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{idea.details}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Phase Management */}
      {canManage && !idea.is_snapshot && idea.phase !== 'abandoned' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Fazės valdymas</CardTitle>
            <CardDescription>
              Fazės yra tik žymės ir neturi procedūrinės reikšmės.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {allowedTransitions.map((phase) => (
                <Button
                  key={phase}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePhaseChange(phase)}
                  disabled={processing}
                  className={phase === 'abandoned' ? 'text-gray-500' : ''}
                >
                  <ChevronRight className="h-4 w-4 mr-1" />
                  {PHASE_CONFIG[phase].label}
                </Button>
              ))}
            </div>

            {/* Promote to Resolution (only for ready_for_vote) */}
            {idea.phase === 'ready_for_vote' && (
              <div className="pt-4 border-t border-gray-200">
                {idea.promoted_to_resolution_id ? (
                  // Already promoted - show link to resolution
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-blue-600">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm font-medium">Rezoliucija jau sukurta</span>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/dashboard/${orgSlug}/resolutions/${idea.promoted_to_resolution_id}`)}
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Peržiūrėti rezoliuciją
                    </Button>
                    <p className="text-xs text-gray-500">
                      Idėja jau konvertuota į DRAFT rezoliuciją.
                    </p>
                  </div>
                ) : (
                  // Not yet promoted - show button
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setShowPromoteModal(true)}
                      disabled={processing}
                      className="border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Sukurti rezoliucijos juodraštį
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">
                      Sukurs DRAFT rezoliuciją be teisinės galios.
                    </p>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Positions / Support Signals (PRE-GOVERNANCE: Advisory Only) */}
      <IdeaPositions 
        ideaId={idea.id} 
        phase={idea.phase} 
        isSnapshot={idea.is_snapshot} 
      />

      {/* Indicators (Analytics Only) */}
      {indicators && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Diskusijos statistika</CardTitle>
            <CardDescription>
              Analitiniai duomenys. Tai NĖRA balsai ar paramos rodikliai.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-700">{indicators.comment_count}</div>
                <div className="text-xs text-gray-500">Komentarai</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-700">{indicators.objection_count}</div>
                <div className="text-xs text-gray-500">Prieštaravimai</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-700">{indicators.participant_count}</div>
                <div className="text-xs text-gray-500">Dalyviai</div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">
              {indicators._disclaimer}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-gray-900">Diskusija</CardTitle>
          <CardDescription>
            Komentarai yra diskusijos dalis, ne balsai ar paramos išraiškos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Comment List */}
          {comments.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Komentarų nėra. Pradėkite diskusiją.
            </p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`p-3 rounded-lg border ${
                    comment.is_objection
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">
                      {formatNameForDiscussion(comment.author_name)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(comment.created_at), { locale: lt, addSuffix: true })}
                    </span>
                    {comment.is_objection && (
                      <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Prieštaravimas
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">{comment.content}</p>
                  {comment.is_objection && comment.reason && (
                    <p className="text-xs text-amber-700 mt-2">
                      <strong>Priežastis:</strong> {comment.reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Comment Form */}
          <div className="pt-4 border-t border-gray-200 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="comment">Naujas komentaras</Label>
              <Textarea
                id="comment"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Parašykite komentarą..."
                rows={3}
                disabled={processing}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="objection"
                checked={isObjection}
                onCheckedChange={(checked) => setIsObjection(checked as boolean)}
                disabled={processing}
              />
              <Label htmlFor="objection" className="text-sm text-gray-600">
                Pažymėti kaip prieštaravimą (tik žymė, ne blokavimas)
              </Label>
            </div>

            {isObjection && (
              <div className="space-y-2">
                <Label htmlFor="objection-reason">Prieštaravimo priežastis *</Label>
                <Textarea
                  id="objection-reason"
                  value={objectionReason}
                  onChange={(e) => setObjectionReason(e.target.value)}
                  placeholder="Nurodykite prieštaravimo priežastį..."
                  rows={2}
                  disabled={processing}
                />
              </div>
            )}

            <Button
              onClick={handleAddComment}
              disabled={processing || !newComment.trim()}
              variant="outline"
            >
              {processing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Pridėti komentarą
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Promote to Resolution Modal */}
      <PromoteToResolutionModal
        open={showPromoteModal}
        onOpenChange={setShowPromoteModal}
        ideaTitle={idea.title}
        confirmed={promoteConfirmed}
        onConfirmChange={setPromoteConfirmed}
        onPromote={handlePromoteToResolution}
        processing={processing}
      />
    </div>
  )
}

/**
 * Phase Badge Component
 */
function PhaseBadge({ phase, large = false }: { phase: IdeaPhase; large?: boolean }) {
  const config = PHASE_CONFIG[phase]
  
  if (phase === 'ready_for_vote') {
    return (
      <Badge 
        variant="outline" 
        className={`border-amber-300 bg-amber-50 text-amber-700 flex items-center gap-1 ${large ? 'text-sm px-3 py-1' : ''}`}
      >
        <AlertTriangle className={large ? 'h-4 w-4' : 'h-3 w-3'} />
        {config.label}
      </Badge>
    )
  }

  return (
    <Badge 
      variant="outline" 
      className={`${config.borderColor} ${config.bgColor} ${config.color} ${large ? 'text-sm px-3 py-1' : ''}`}
    >
      {config.label}
    </Badge>
  )
}

/**
 * Promote to Resolution Modal
 * 
 * PRE-GOVERNANCE: Requires explicit confirmation.
 * Creates DRAFT only, no approval.
 */
function PromoteToResolutionModal({
  open,
  onOpenChange,
  ideaTitle,
  confirmed,
  onConfirmChange,
  onPromote,
  processing,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  ideaTitle: string
  confirmed: boolean
  onConfirmChange: (confirmed: boolean) => void
  onPromote: () => void
  processing: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <FileText className="h-5 w-5" />
            Sukurti rezoliucijos juodraštį
          </DialogTitle>
          <DialogDescription>
            Šis veiksmas sukurs DRAFT rezoliuciją iš idėjos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning Alert */}
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 text-sm">
              <strong>Svarbu:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Rezoliucija bus sukurta su DRAFT statusu</li>
                <li>Jokio sprendimo, patvirtinimo ar įsigaliojimo neįvyksta</li>
                <li>Rezoliucija neturi teisinės ar procedūrinės galios</li>
                <li>Valdymo veiksmai reikalauja aiškaus žmogaus veiksmo</li>
                <li>Rezoliucija turi pereiti Valdymo procesą</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Idėja:</p>
            <p className="font-medium text-gray-900">&quot;{ideaTitle}&quot;</p>
          </div>

          {/* Confirmation Checkbox */}
          <div className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg">
            <Checkbox
              id="confirm-promote"
              checked={confirmed}
              onCheckedChange={(checked) => onConfirmChange(checked as boolean)}
              disabled={processing}
              className="mt-0.5"
            />
            <Label htmlFor="confirm-promote" className="text-sm text-gray-700 leading-relaxed">
              Suprantu, kad sukuriamas TIK DRAFT rezoliucija be teisinės ar procedūrinės galios.
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
            Atšaukti
          </Button>
          <Button
            onClick={onPromote}
            disabled={!confirmed || processing}
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Kuriama...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Sukurti juodraštį
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
