'use client'

/**
 * CHAIR AGENDA PANEL
 * 
 * Pilnas darbotvarkės valdymas Chair dashboard.
 * Rodo visus klausimus su balsavimo statusu ir veiksmais.
 * 
 * Funkcionalumas:
 * - Rodo visus agenda items (procedūrinius ir esminius)
 * - Rodo kiekvieno klausimo balsavimo statusą
 * - Leidžia valdyti balsavimus (uždaryti, taikyti rezultatus)
 * - Rodo užrakinimo būseną (procedural sequence)
 * 
 * @version 18.8.6
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Lock,
  Vote,
  ChevronDown,
  ChevronUp,
  XCircle,
} from 'lucide-react'
import { closeVoteAndApplyResults } from '@/app/actions/vote-management'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'

interface AgendaItem {
  id: string
  item_no: string
  title: string
  is_procedural: boolean
  resolution_id: string | null
  resolution_status: string | null
  vote_id: string | null
  vote_status: string | null
  locked: boolean
  lock_reason?: string
}

interface ChairAgendaPanelProps {
  items: AgendaItem[]
  meetingId: string
  orgSlug: string
  proceduralSequenceCompleted: boolean
}

export function ChairAgendaPanel({
  items,
  meetingId,
  orgSlug,
  proceduralSequenceCompleted,
}: ChairAgendaPanelProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [processingItems, setProcessingItems] = useState<Set<string>>(new Set())

  const toggleExpand = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  const handleCloseVote = async (voteId: string, itemId: string) => {
    if (!voteId) return

    setProcessingItems(new Set(processingItems).add(itemId))
    try {
      const result = await closeVoteAndApplyResults(voteId)
      if (result.success) {
        toast({
          title: 'Balsavimas uždarytas',
          description: result.result === 'APPROVED' 
            ? 'Nutarimas patvirtintas' 
            : 'Nutarimas atmestas',
        })
        router.refresh()
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko uždaryti balsavimo',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error closing vote:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko klaida uždarant balsavimą',
        variant: 'destructive',
      })
    } finally {
      const newProcessing = new Set(processingItems)
      newProcessing.delete(itemId)
      setProcessingItems(newProcessing)
    }
  }

  const getStatusBadge = (item: AgendaItem) => {
    if (!item.vote_id) {
      return (
        <Badge variant="outline" className="text-slate-500">
          <AlertCircle className="h-3 w-3 mr-1" />
          Be balsavimo
        </Badge>
      )
    }

    if (item.vote_status === 'CLOSED') {
      if (item.resolution_status === 'APPROVED') {
        return (
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Patvirtinta
          </Badge>
        )
      } else if (item.resolution_status === 'REJECTED') {
        return (
          <Badge className="bg-red-100 text-red-700">
            <XCircle className="h-3 w-3 mr-1" />
            Atmesta
          </Badge>
        )
      } else {
        return (
          <Badge variant="outline" className="text-slate-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Uždarytas
          </Badge>
        )
      }
    }

    if (item.vote_status === 'OPEN') {
      return (
        <Badge className="bg-blue-100 text-blue-700">
          <Vote className="h-3 w-3 mr-1" />
          Balsavimas vyksta
        </Badge>
      )
    }

    return (
      <Badge variant="outline" className="text-slate-500">
        <Clock className="h-3 w-3 mr-1" />
        {item.vote_status || 'Nežinoma'}
      </Badge>
    )
  }

  const proceduralItems = items.filter((item) => item.is_procedural)
  const substantiveItems = items.filter((item) => !item.is_procedural)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Vote className="h-5 w-5" />
          Darbotvarkė ({items.length} klausimai)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Procedural Items Section */}
        <div>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Procedūriniai klausimai
          </h3>
          <div className="space-y-2">
            {proceduralItems.map((item) => (
              <AgendaItemRow
                key={item.id}
                item={item}
                isExpanded={expandedItems.has(item.id)}
                isProcessing={processingItems.has(item.id)}
                onToggleExpand={() => toggleExpand(item.id)}
                onCloseVote={() => handleCloseVote(item.vote_id!, item.id)}
                getStatusBadge={getStatusBadge}
              />
            ))}
          </div>
        </div>

        {/* Substantive Items Section */}
        {substantiveItems.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Esminiai klausimai
              {!proceduralSequenceCompleted && (
                <Badge variant="outline" className="ml-2 text-amber-600">
                  <Lock className="h-3 w-3 mr-1" />
                  Užrakinti
                </Badge>
              )}
            </h3>
            <div className="space-y-2">
              {substantiveItems.map((item) => (
                <AgendaItemRow
                  key={item.id}
                  item={item}
                  isExpanded={expandedItems.has(item.id)}
                  isProcessing={processingItems.has(item.id)}
                  onToggleExpand={() => toggleExpand(item.id)}
                  onCloseVote={() => handleCloseVote(item.vote_id!, item.id)}
                  getStatusBadge={getStatusBadge}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface AgendaItemRowProps {
  item: AgendaItem
  isExpanded: boolean
  isProcessing: boolean
  onToggleExpand: () => void
  onCloseVote: () => void
  getStatusBadge: (item: AgendaItem) => React.ReactNode
}

function AgendaItemRow({
  item,
  isExpanded,
  isProcessing,
  onToggleExpand,
  onCloseVote,
  getStatusBadge,
}: AgendaItemRowProps) {
  const canClose = item.vote_id && item.vote_status === 'OPEN' && !item.locked

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-all ${
        item.locked ? 'opacity-60 bg-slate-50' : ''
      }`}
    >
      {/* Header Row */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={`w-8 h-8 flex items-center justify-center ${
              item.is_procedural ? 'bg-purple-50 text-purple-700 border-purple-200' : ''
            }`}
          >
            {item.item_no}
          </Badge>
          <div>
            <h4 className="font-medium text-slate-900">{item.title}</h4>
            {item.locked && item.lock_reason && (
              <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                <Lock className="h-3 w-3" />
                {item.lock_reason}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(item)}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t bg-slate-50 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Nutarimo statusas:</span>
              <p className="font-medium">
                {item.resolution_status || 'Nėra nutarimo'}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Balsavimo statusas:</span>
              <p className="font-medium">{item.vote_status || 'Nėra balsavimo'}</p>
            </div>
          </div>

          {/* Actions */}
          {canClose && (
            <div className="pt-2 border-t">
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  onCloseVote()
                }}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Uždaroma...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Uždaryti balsavimą
                  </>
                )}
              </Button>
            </div>
          )}

          {item.locked && (
            <div className="pt-2 border-t">
              <p className="text-sm text-amber-600">
                <Lock className="h-4 w-4 inline mr-1" />
                Šis klausimas bus atraktas kai bus patvirtinti visi procedūriniai
                klausimai (1-3).
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

