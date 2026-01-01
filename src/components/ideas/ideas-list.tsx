'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Clock, CheckCircle, XCircle, AlertCircle, Archive } from 'lucide-react'
import { listIdeas, type Idea } from '@/app/actions/ideas'
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

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
  DRAFT: { label: 'Juodraštis', variant: 'outline', icon: Archive },
  OPEN: { label: 'Balsuojama', variant: 'default', icon: Clock },
  PASSED: { label: 'Pritarta', variant: 'default', icon: CheckCircle },
  FAILED: { label: 'Nepritarta', variant: 'destructive', icon: XCircle },
  NOT_COMPLETED: { label: 'Neįvykdyta', variant: 'secondary', icon: AlertCircle },
  ARCHIVED: { label: 'Archyvuota', variant: 'outline', icon: Archive },
}

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
      const data = await listIdeas(orgId, canManage) // includeDraft if can manage
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Idėjos</h2>
          <p className="text-sm text-gray-600">Bendruomenės idėjos ir balsavimai</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Sukurti idėją
          </Button>
        )}
      </div>

      {ideas.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            Idėjų nėra. {canManage && 'Sukurkite pirmąją idėją.'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {ideas.map((idea) => {
            const statusInfo = statusConfig[idea.status] || statusConfig.DRAFT
            const StatusIcon = statusInfo.icon

            return (
              <Card
                key={idea.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleIdeaClick(idea.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{idea.title}</CardTitle>
                      {idea.summary && (
                        <CardDescription className="mt-2">{idea.summary}</CardDescription>
                      )}
                    </div>
                    <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                      <StatusIcon className="h-3 w-3" />
                      {statusInfo.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>
                      Sukurta: {format(new Date(idea.created_at), 'PP', { locale: lt })}
                    </span>
                    {idea.opened_at && (
                      <span>
                        Balsavimas pradėtas: {format(new Date(idea.opened_at), 'PP', { locale: lt })}
                      </span>
                    )}
                    {idea.public_visible && (
                      <Badge variant="outline" className="text-xs">
                        Vieša
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
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

