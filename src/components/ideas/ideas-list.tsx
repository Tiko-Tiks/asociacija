'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, MoreVertical, Eye, FileText, MessageSquare, AlertTriangle } from 'lucide-react'
import { listIdeas, type Idea } from '@/app/actions/ideas'
import { PHASE_CONFIG, type IdeaPhase } from '@/lib/ideas-utils'
import { useRouter } from 'next/navigation'
import { CreateIdeaModal } from './create-idea-modal'
import { format } from 'date-fns'
import { lt } from 'date-fns/locale'

interface IdeasListProps {
  orgId: string
  orgSlug: string
  isOwner: boolean
  isBoard: boolean
}

/**
 * PRE-GOVERNANCE Ideas List
 * 
 * Visual constraints:
 * - No green/success colors
 * - No progress bars
 * - No approval indicators
 * - ready_for_vote uses WARNING color (amber)
 */
export function IdeasList({ orgId, orgSlug, isOwner, isBoard }: IdeasListProps) {
  const router = useRouter()
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const canManage = isOwner || isBoard

  useEffect(() => {
    loadIdeas()
  }, [orgId])

  const loadIdeas = async () => {
    try {
      setLoading(true)
      const data = await listIdeas(orgId)
      setIdeas(data)
    } catch (error) {
      console.error('Error loading ideas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleIdeaClick = (ideaId: string) => {
    router.push(`/dashboard/${orgSlug}/ideas/${ideaId}`)
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Kraunama...</div>
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Idėjos</h2>
          <p className="text-sm text-gray-600">
            Bendruomenės idėjų diskusijos ir planavimas
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowCreateModal(true)} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Sukurti idėją
          </Button>
        )}
      </div>

      {/* PRE-GOVERNANCE Disclaimer */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
        <div className="flex items-start gap-2">
          <FileText className="h-4 w-4 mt-0.5 text-gray-500" />
          <div>
            <p className="font-medium text-gray-700">Idėjų modulis – diskusijų erdvė</p>
            <p className="mt-1">
              Idėjos yra diskusijų objektai be teisinės ar procedūrinės galios. 
              Fazės yra tik žymės, ne statusai. Sprendimai priimami Valdymo modulyje.
            </p>
          </div>
        </div>
      </div>

      {/* Ideas List */}
      {ideas.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            Idėjų nėra. {canManage && 'Sukurkite pirmąją idėją.'}
          </CardContent>
        </Card>
      ) : (
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 bg-white">
          {ideas.map((idea) => {
            const phaseConfig = PHASE_CONFIG[idea.phase]

            return (
              <div
                key={idea.id}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div 
                  className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer" 
                  onClick={() => handleIdeaClick(idea.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h4 className="font-medium text-gray-900 truncate">
                        {idea.title}
                      </h4>
                      <PhaseBadge phase={idea.phase} />
                    </div>
                    {idea.summary && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {idea.summary.substring(0, 150)}
                        {idea.summary.length > 150 && '...'}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span>
                        Sukurta: {format(new Date(idea.created_at), 'yyyy-MM-dd', { locale: lt })}
                      </span>
                    </div>
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Atidaryti meniu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleIdeaClick(idea.id)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Peržiūrėti
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          })}
        </div>
      )}

      {showCreateModal && (
        <CreateIdeaModal
          orgId={orgId}
          onClose={() => {
            setShowCreateModal(false)
            loadIdeas()
          }}
        />
      )}
    </div>
  )
}

/**
 * Phase Badge Component
 * 
 * PRE-GOVERNANCE colors:
 * - No green (success)
 * - ready_for_vote uses amber (warning)
 * - No checkmarks
 */
function PhaseBadge({ phase }: { phase: IdeaPhase }) {
  const config = PHASE_CONFIG[phase]
  
  // Special handling for ready_for_vote - warning style
  if (phase === 'ready_for_vote') {
    return (
      <Badge 
        variant="outline" 
        className="border-amber-300 bg-amber-50 text-amber-700 flex items-center gap-1"
      >
        <AlertTriangle className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  return (
    <Badge 
      variant="outline" 
      className={`${config.borderColor} ${config.bgColor} ${config.color}`}
    >
      {config.label}
    </Badge>
  )
}
