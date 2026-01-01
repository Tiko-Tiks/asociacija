"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Gavel, ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { listResolutions, Resolution } from '@/app/actions/resolutions'

interface ResolutionSummary {
  id: string
  title: string
  adopted_at: string | null
}

interface ResolutionsWidgetProps {
  resolutions: ResolutionSummary[]
  orgId: string
}

export function ResolutionsWidget({ resolutions, orgId }: ResolutionsWidgetProps) {
  const [selectedResolution, setSelectedResolution] = useState<Resolution | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nėra datos'
    return new Date(dateString).toLocaleDateString('lt-LT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const handleViewResolution = async (resolutionId: string) => {
    try {
      const allResolutions = await listResolutions(orgId)
      const resolution = allResolutions.find((r) => r.id === resolutionId)
      if (resolution) {
        setSelectedResolution(resolution)
        setIsModalOpen(true)
      }
    } catch (error) {
      console.error('Error fetching resolution:', error)
    }
  }

  if (resolutions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Gavel className="h-5 w-5" />
            Teisė ir Tvarka
          </CardTitle>
          <CardDescription>
            Patvirtinti sprendimai
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nėra patvirtintų sprendimų</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Gavel className="h-5 w-5" />
            Teisė ir Tvarka
          </CardTitle>
          <CardDescription>
            Patvirtinti sprendimai
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {resolutions.map((resolution) => (
              <div
                key={resolution.id}
                className="border rounded-lg p-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 line-clamp-2 mb-1">
                      {resolution.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Patvirtinta: {formatDate(resolution.adopted_at)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewResolution(resolution.id)}
                    className="flex-shrink-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedResolution && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedResolution.title}</DialogTitle>
              <DialogDescription>
                Patvirtinta: {formatDate(selectedResolution.adopted_at)}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap text-slate-700">
                  {selectedResolution.content}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

