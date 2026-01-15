'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  HandHelping, 
  HelpCircle, 
  AlertTriangle, 
  Loader2,
  X,
  Info,
} from 'lucide-react'
import {
  setIdeaPosition,
  removeIdeaPosition,
  getIdeaPositionsSummary,
  getCurrentUserPosition,
  type PositionType,
  type IdeaPosition,
  type PositionsSummary,
} from '@/app/actions/ideas'
import { useToast } from '@/components/ui/use-toast'

interface IdeaPositionsProps {
  ideaId: string
  phase: string
  isSnapshot: boolean
}

/**
 * PRE-GOVERNANCE: Idea Positions (Support Signals)
 * 
 * IMPORTANT CONSTRAINTS:
 * - These are ADVISORY-ONLY signals, NOT votes
 * - NO thresholds, NO quorum, NO pass/fail
 * - NO green "success" colors, NO progress bars
 * - Neutral terminology: "Palaikymo signalai / Pozicijos"
 * - Support signals have NO procedural power
 * - Displayed as analytics only, no ranking
 */
export function IdeaPositions({ ideaId, phase, isSnapshot }: IdeaPositionsProps) {
  const { toast } = useToast()
  const [summary, setSummary] = useState<PositionsSummary | null>(null)
  const [userPosition, setUserPosition] = useState<IdeaPosition | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [pendingType, setPendingType] = useState<PositionType | null>(null)
  const [note, setNote] = useState('')

  // Can set position if not snapshot and not abandoned
  const canSetPosition = !isSnapshot && phase !== 'abandoned'

  useEffect(() => {
    loadData()
  }, [ideaId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [summaryData, positionData] = await Promise.all([
        getIdeaPositionsSummary(ideaId),
        getCurrentUserPosition(ideaId),
      ])
      setSummary(summaryData)
      setUserPosition(positionData)
    } catch (error) {
      console.error('Error loading positions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSetPosition = async (type: PositionType) => {
    // Objection requires note
    if (type === 'objection') {
      setShowNoteInput(true)
      setPendingType(type)
      return
    }

    await submitPosition(type, undefined)
  }

  const submitPosition = async (type: PositionType, noteText?: string) => {
    setProcessing(true)
    try {
      const result = await setIdeaPosition(ideaId, type, noteText)
      
      if (result.success) {
        toast({
          title: 'Pozicija išsaugota',
          description: getPositionLabel(type) + ' (tik signalas, ne balsas)',
        })
        setShowNoteInput(false)
        setPendingType(null)
        setNote('')
        await loadData()
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko išsaugoti pozicijos',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error setting position:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko klaida',
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleRemovePosition = async () => {
    setProcessing(true)
    try {
      const result = await removeIdeaPosition(ideaId)
      
      if (result.success) {
        toast({
          title: 'Pozicija pašalinta',
        })
        await loadData()
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko pašalinti pozicijos',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error removing position:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko klaida',
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleCancelNote = () => {
    setShowNoteInput(false)
    setPendingType(null)
    setNote('')
  }

  const handleSubmitWithNote = () => {
    if (pendingType && note.trim()) {
      submitPosition(pendingType, note.trim())
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
          <Info className="h-5 w-5 text-gray-500" />
          Palaikymo signalai
        </CardTitle>
        <CardDescription>
          Signalai yra tik nuomonės indikatoriai. Jie NETURI procedūrinės galios ir nėra balsai.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Analytics (neutral colors only) */}
        {summary && summary.total > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              Narių signalai (tik analitika)
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-xl font-bold text-gray-600">{summary.support}</div>
                <div className="text-xs text-gray-500">Palaiko</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-xl font-bold text-gray-600">{summary.concern}</div>
                <div className="text-xs text-gray-500">Turi abejonių</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-xl font-bold text-gray-600">{summary.objection}</div>
                <div className="text-xs text-gray-500">Prieštarauja</div>
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center italic">
              {summary._disclaimer}
            </p>
          </div>
        )}

        {/* User's Current Position */}
        {userPosition && (
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Jūsų pozicija:</span>
                <PositionBadge type={userPosition.type} />
              </div>
              {canSetPosition && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemovePosition}
                  disabled={processing}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {userPosition.note && (
              <p className="text-xs text-gray-500 mt-2">
                <span className="font-medium">Pastaba:</span> {userPosition.note}
              </p>
            )}
          </div>
        )}

        {/* Position Buttons (only if can set position) */}
        {canSetPosition && !showNoteInput && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              {userPosition ? 'Pakeisti poziciją:' : 'Pareikšti poziciją:'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSetPosition('support')}
                disabled={processing}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <HandHelping className="h-4 w-4 mr-1" />
                Palaikau
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSetPosition('concern')}
                disabled={processing}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <HelpCircle className="h-4 w-4 mr-1" />
                Turiu abejonių
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSetPosition('objection')}
                disabled={processing}
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                Prieštarauju
              </Button>
            </div>
            <p className="text-xs text-gray-400 italic">
              Pozicijos yra tik signalas. Vienas narys – viena pozicija (galima keisti).
            </p>
          </div>
        )}

        {/* Note Input for Objection */}
        {showNoteInput && (
          <div className="space-y-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <Label htmlFor="objection-note" className="text-amber-800">
              Prieštaravimo priežastis *
            </Label>
            <Textarea
              id="objection-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nurodykite, kodėl prieštaraujate..."
              rows={3}
              disabled={processing}
              className="border-amber-300"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelNote}
                disabled={processing}
              >
                Atšaukti
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSubmitWithNote}
                disabled={processing || !note.trim()}
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <AlertTriangle className="h-4 w-4 mr-1" />
                )}
                Išsaugoti prieštaravimą
              </Button>
            </div>
          </div>
        )}

        {/* Snapshot/Abandoned Notice */}
        {(isSnapshot || phase === 'abandoned') && (
          <p className="text-xs text-gray-400 text-center">
            {isSnapshot 
              ? 'Ši idėja yra užfiksuota (snapshot). Pozicijų keisti negalima.'
              : 'Ši idėja yra atsisakyta. Pozicijų keisti negalima.'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Position Badge (neutral colors only)
 */
function PositionBadge({ type }: { type: PositionType }) {
  const config = {
    support: {
      label: 'Palaiko',
      icon: HandHelping,
      className: 'bg-gray-100 text-gray-700 border-gray-300',
    },
    concern: {
      label: 'Turi abejonių',
      icon: HelpCircle,
      className: 'bg-gray-100 text-gray-700 border-gray-300',
    },
    objection: {
      label: 'Prieštarauja',
      icon: AlertTriangle,
      className: 'bg-amber-50 text-amber-700 border-amber-300',
    },
  }

  const cfg = config[type]
  const Icon = cfg.icon

  return (
    <Badge variant="outline" className={cfg.className}>
      <Icon className="h-3 w-3 mr-1" />
      {cfg.label}
    </Badge>
  )
}

/**
 * Get localized position label
 */
function getPositionLabel(type: PositionType): string {
  switch (type) {
    case 'support':
      return 'Palaiko'
    case 'concern':
      return 'Turi abejonių'
    case 'objection':
      return 'Prieštarauja'
    default:
      return ''
  }
}

