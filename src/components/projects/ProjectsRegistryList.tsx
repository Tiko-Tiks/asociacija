'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  listProjectsRegistry,
  ProjectRegistryItem,
} from '@/app/actions/projects-registry'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  FileText, 
  FolderOpen, 
  AlertCircle, 
  TrendingUp, 
  Wallet, 
  ArrowRight,
  Info
} from 'lucide-react'

/**
 * Phase display configuration
 */
const PHASE_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  planned: { label: 'Planuojamas', variant: 'secondary' },
  active: { label: 'Vykdomas', variant: 'default' },
  paused: { label: 'Sustabdytas', variant: 'outline' },
  completed: { label: 'Užbaigtas', variant: 'secondary' },
  cancelled: { label: 'Atšauktas', variant: 'destructive' },
}

interface ProjectsRegistryListProps {
  orgId: string
  orgSlug?: string
}

export default function ProjectsRegistryList({ orgId, orgSlug }: ProjectsRegistryListProps) {
  const [projects, setProjects] = useState<ProjectRegistryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const data = await listProjectsRegistry(orgId)
        if (mounted) setProjects(data)
      } catch (err) {
        if (mounted) setError('Nepavyko užkrauti projektų')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [orgId])

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Projektų registras</h1>
        <p className="text-gray-600 mt-1">
          Projektai iš patvirtintų rezoliucijų
        </p>
      </div>

      {/* Governance Disclaimer */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-blue-800 font-medium">
            v19.0 Projektų registras
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Projektai atsiranda tik iš APPROVED rezoliucijų su project metadata. 
            Tai yra read-only registras – projektų kurti ar redaguoti tiesiogiai negalima.
          </p>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-6">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && projects.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12">
            <div className="text-center">
              <FolderOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Projektų nėra
              </h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Projektai atsiranda tik po patvirtintų sprendimų (rezoliucijų) su project metadata.
                Sukurkite rezoliuciją susirinkime ir ją patvirtinkite.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Projects List */}
      {!loading && !error && projects.length > 0 && (
        <div className="grid gap-4">
          {projects.map((p) => {
            const phaseConfig = PHASE_CONFIG[p.project.phase ?? ''] || { 
              label: p.project.phase ?? 'Nenurodyta', 
              variant: 'outline' as const 
            }
            const progressPercent = typeof p.indicator?.progress === 'number' 
              ? Math.round(p.indicator.progress * 100) 
              : null
            const budgetPlanned = p.indicator?.budget_planned
            const budgetSpent = p.indicator?.budget_spent

            return (
              <Card key={p.resolution_id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold text-gray-900 truncate">
                        {p.title}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <FileText className="h-3.5 w-3.5" />
                        <span>
                          Rezoliucija patvirtinta:{' '}
                          {new Date(p.approved_at).toLocaleDateString('lt-LT')}
                        </span>
                        {p.project.tag && (
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                            #{p.project.tag}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <Badge variant={phaseConfig.variant}>
                      {phaseConfig.label}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Progress Indicator */}
                  {progressPercent !== null && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-gray-600">
                          <TrendingUp className="h-4 w-4" />
                          Progresas
                        </span>
                        <span className="font-medium">{progressPercent}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Budget Info */}
                  {(typeof budgetPlanned === 'number' || typeof budgetSpent === 'number') && (
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Wallet className="h-4 w-4" />
                        Biudžetas:
                      </div>
                      {typeof budgetPlanned === 'number' && (
                        <span>
                          Planuota: <strong>{budgetPlanned.toLocaleString('lt-LT')} €</strong>
                        </span>
                      )}
                      {typeof budgetSpent === 'number' && (
                        <span>
                          Panaudota: <strong>{budgetSpent.toLocaleString('lt-LT')} €</strong>
                        </span>
                      )}
                    </div>
                  )}

                  {/* View Resolution Link */}
                  {orgSlug && (
                    <div className="pt-2 border-t border-gray-100">
                      <Link href={`/dashboard/${orgSlug}/resolutions/${p.resolution_id}`}>
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                          Peržiūrėti rezoliuciją
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Summary Stats */}
      {!loading && !error && projects.length > 0 && (
        <Card className="bg-gray-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Iš viso projektų: <strong>{projects.length}</strong></span>
              <span className="text-xs text-gray-400 italic">
                Registras paremtas APPROVED rezoliucijomis
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
