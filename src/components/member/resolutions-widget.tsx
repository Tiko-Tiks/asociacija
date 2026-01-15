"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Gavel, ExternalLink, FileText, Calendar, ArrowRight } from 'lucide-react'
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
  orgSlug?: string
}

export function ResolutionsWidget({ resolutions, orgId, orgSlug }: ResolutionsWidgetProps) {
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

  const formatDateShort = (dateString: string | null) => {
    if (!dateString) return 'Nėra datos'
    return new Date(dateString).toLocaleDateString('lt-LT', {
      year: 'numeric',
      month: 'short',
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
            <Gavel className="h-5 w-5 text-slate-600" />
            Nutarimai
          </CardTitle>
          <CardDescription>
            Patvirtinti sprendimai ir nutarimai
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nėra patvirtintų nutarimų</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Gavel className="h-5 w-5 text-slate-600" />
                Nutarimai
              </CardTitle>
              <CardDescription>
                Paskutiniai {resolutions.length} patvirtinti nutarimai
              </CardDescription>
            </div>
            {orgSlug && (
              <Link href={`/dashboard/${orgSlug}/resolutions`}>
                <Button variant="ghost" size="sm" className="text-xs">
                  Visi
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {resolutions.map((resolution, index) => (
              <div
                key={resolution.id}
                className="group border border-slate-200 rounded-lg p-3 hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer"
                onClick={() => handleViewResolution(resolution.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1.5">
                      <Badge variant="outline" className="text-xs font-normal flex-shrink-0 mt-0.5">
                        #{resolutions.length - index}
                      </Badge>
                      <h4 className="text-sm font-semibold text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {resolution.title}
                      </h4>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDateShort(resolution.adopted_at)}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewResolution(resolution.id)
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {orgSlug && resolutions.length >= 3 && (
            <div className="mt-4 pt-4 border-t">
              <Link href={`/dashboard/${orgSlug}/resolutions`}>
                <Button variant="outline" size="sm" className="w-full">
                  Peržiūrėti visus nutarimus
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedResolution && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">{selectedResolution.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 pt-2">
                <Calendar className="h-4 w-4" />
                <span>Patvirtinta: {formatDate(selectedResolution.adopted_at)}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <div className="prose prose-sm max-w-none">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <p className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                    {selectedResolution.content || 'Nėra turinio'}
                  </p>
                </div>
              </div>
            </div>
            {orgSlug && (
              <div className="mt-4 pt-4 border-t">
                <Link href={`/dashboard/${orgSlug}/resolutions`}>
                  <Button variant="outline" className="w-full">
                    Peržiūrėti visus nutarimus
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

