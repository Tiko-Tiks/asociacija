"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Gavel, 
  Calendar, 
  FileText, 
  FolderKanban,
  TrendingUp,
  Wallet,
  Info,
  AlertCircle
} from 'lucide-react'
import { Resolution } from '@/app/actions/resolutions'
import { 
  initializeProjectMetadata, 
  ProjectPhase,
  hasProjectMetadata as checkHasProjectMetadata 
} from '@/app/actions/project-indicators'
import { format } from 'date-fns'
import { lt } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'

interface ResolutionDetailClientProps {
  resolution: Resolution
  orgSlug: string
  hasProjectMetadata?: boolean
}

const PHASE_OPTIONS: { value: ProjectPhase; label: string }[] = [
  { value: 'planned', label: 'Planuojamas' },
  { value: 'active', label: 'Vykdomas' },
  { value: 'paused', label: 'Sustabdytas' },
  { value: 'completed', label: 'Užbaigtas' },
  { value: 'cancelled', label: 'Atšauktas' },
]

export function ResolutionDetailClient({ 
  resolution, 
  orgSlug,
  hasProjectMetadata: initialHasProject = false
}: ResolutionDetailClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  
  const [isInitDialogOpen, setIsInitDialogOpen] = useState(false)
  const [initLoading, setInitLoading] = useState(false)
  const [hasProject, setHasProject] = useState(initialHasProject)
  
  // Form state for project initialization
  const [phase, setPhase] = useState<ProjectPhase>('planned')
  const [code, setCode] = useState('')
  const [budgetPlanned, setBudgetPlanned] = useState('')

  const handleInitializeProject = async () => {
    setInitLoading(true)
    
    try {
      const result = await initializeProjectMetadata({
        resolutionId: resolution.id,
        phase,
        code: code.trim() || undefined,
        budgetPlanned: budgetPlanned ? parseFloat(budgetPlanned) : undefined,
      })

      if (result.success) {
        toast({
          title: 'Projektas inicializuotas',
          description: 'Projekto metadata sėkmingai pridėta prie rezoliucijos.',
        })
        setHasProject(true)
        setIsInitDialogOpen(false)
        router.refresh()
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko inicializuoti projekto',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Klaida',
        description: 'Nepavyko inicializuoti projekto',
        variant: 'destructive',
      })
    } finally {
      setInitLoading(false)
    }
  }

  const getStatusBadge = () => {
    switch (resolution.status) {
      case 'APPROVED':
        return (
          <Badge variant="default" className="bg-green-50 text-green-700 border-green-200">
            <Gavel className="h-3 w-3 mr-1" />
            Patvirtintas
          </Badge>
        )
      case 'REJECTED':
        return <Badge variant="destructive">Atmestas</Badge>
      case 'PROPOSED':
        return <Badge variant="default">Pateiktas</Badge>
      case 'DRAFT':
        return <Badge variant="outline">Juodraštis</Badge>
      default:
        return <Badge variant="outline">{resolution.status}</Badge>
    }
  }

  const getVisibilityBadge = () => {
    switch (resolution.visibility) {
      case 'PUBLIC':
        return <Badge variant="outline">Viešas</Badge>
      case 'MEMBERS':
        return <Badge variant="outline">Nariams</Badge>
      case 'INTERNAL':
        return <Badge variant="outline">Vidaus</Badge>
      default:
        return <Badge variant="outline">{resolution.visibility}</Badge>
    }
  }

  // Check if this is a project (has project metadata)
  const metadata = resolution.metadata as Record<string, any> | null
  const projectPhase = metadata?.['project.phase'] || metadata?.project?.phase
  const projectCode = metadata?.['project.code'] || metadata?.project?.code
  const indicatorProgress = metadata?.['indicator.progress'] ?? metadata?.indicator?.progress
  const indicatorBudgetPlanned = metadata?.['indicator.budget_planned'] ?? metadata?.indicator?.budget_planned
  const indicatorBudgetSpent = metadata?.['indicator.budget_spent'] ?? metadata?.indicator?.budget_spent

  const isProject = !!projectPhase || hasProject
  const isDraft = resolution.status === 'DRAFT'
  const canInitializeProject = isDraft && !isProject

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/dashboard/${orgSlug}/resolutions`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Grįžti į nutarimus
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              {getStatusBadge()}
              {getVisibilityBadge()}
              {isProject && (
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                  <FolderKanban className="h-3 w-3 mr-1" />
                  Projektas
                </Badge>
              )}
            </div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">
              {resolution.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>
                  Sukurta: {format(new Date(resolution.created_at), 'yyyy-MM-dd HH:mm', { locale: lt })}
                </span>
              </div>
              {resolution.adopted_at && (
                <div className="flex items-center gap-1">
                  <Gavel className="h-4 w-4" />
                  <span>
                    Patvirtinta: {format(new Date(resolution.adopted_at), 'yyyy-MM-dd HH:mm', { locale: lt })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Project Section (if initialized) */}
      {isProject && resolution.status === 'APPROVED' && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <FolderKanban className="h-5 w-5" />
              Projekto informacija
            </CardTitle>
            <CardDescription>
              Ši rezoliucija yra projektas v19.0 registre
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Phase */}
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Fazė</p>
                <Badge variant="outline" className="text-sm">
                  {PHASE_OPTIONS.find(p => p.value === projectPhase)?.label || projectPhase}
                </Badge>
              </div>

              {/* Code */}
              {projectCode && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Kodas</p>
                  <p className="font-mono text-sm">{projectCode}</p>
                </div>
              )}

              {/* Progress */}
              {typeof indicatorProgress === 'number' && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Progresas
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-full bg-gray-200 rounded-full h-2 max-w-[100px]">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${Math.round(indicatorProgress * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{Math.round(indicatorProgress * 100)}%</span>
                  </div>
                </div>
              )}

              {/* Budget */}
              {typeof indicatorBudgetPlanned === 'number' && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <Wallet className="h-3 w-3" />
                    Biudžetas
                  </p>
                  <p className="text-sm">
                    {typeof indicatorBudgetSpent === 'number' && (
                      <span className="font-medium">{indicatorBudgetSpent.toLocaleString('lt-LT')} € / </span>
                    )}
                    {indicatorBudgetPlanned.toLocaleString('lt-LT')} €
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Initialize as Project (DRAFT only) */}
      {canInitializeProject && (
        <Card className="border-dashed border-gray-300">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <FolderKanban className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Inicializuoti kaip projektą</p>
                  <p className="text-sm text-gray-500">
                    Pridėkite projekto metadata šiai rezoliucijai. Kai rezoliucija bus APPROVED, 
                    ji automatiškai atsiras projektų registre.
                  </p>
                </div>
              </div>
              
              <Dialog open={isInitDialogOpen} onOpenChange={setIsInitDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <FolderKanban className="h-4 w-4 mr-2" />
                    Inicializuoti
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Inicializuoti projektą</DialogTitle>
                    <DialogDescription>
                      Pridėkite projekto metadata. Kai rezoliucija bus patvirtinta, 
                      ji atsiras projektų registre.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    {/* Phase */}
                    <div className="space-y-2">
                      <Label htmlFor="phase">Pradinė fazė *</Label>
                      <Select value={phase} onValueChange={(v) => setPhase(v as ProjectPhase)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pasirinkite fazę" />
                        </SelectTrigger>
                        <SelectContent>
                          {PHASE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Code */}
                    <div className="space-y-2">
                      <Label htmlFor="code">Projekto kodas (neprivaloma)</Label>
                      <Input
                        id="code"
                        placeholder="Pvz.: PRJ-2026-001"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                      />
                    </div>

                    {/* Budget */}
                    <div className="space-y-2">
                      <Label htmlFor="budget">Planuojamas biudžetas, € (neprivaloma)</Label>
                      <Input
                        id="budget"
                        type="number"
                        min="0"
                        placeholder="Pvz.: 5000"
                        value={budgetPlanned}
                        onChange={(e) => setBudgetPlanned(e.target.value)}
                      />
                    </div>

                    {/* Warning */}
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700">
                        <strong>Svarbu:</strong> Kai rezoliucija bus patvirtinta (APPROVED), 
                        projekto metadata taps immutable. Tik indikatoriai (progresas, biudžetas) 
                        galės būti atnaujinami.
                      </p>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsInitDialogOpen(false)}>
                      Atšaukti
                    </Button>
                    <Button onClick={handleInitializeProject} disabled={initLoading}>
                      {initLoading ? 'Inicializuojama...' : 'Inicializuoti projektą'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Turinys
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {resolution.content || 'Nėra turinio'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Governance Info */}
      {isProject && (
        <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <Info className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-gray-700 font-medium">v19.0 Projekto registras</p>
            <p className="text-xs text-gray-500 mt-1">
              Šis projektas valdomas per rezoliucijos metadata. Projekto fazė ir kiti 
              parametrai yra tik indikatoriai – jie NETURI teisinio ar procedūrinio 
              poveikio rezoliucijos statusui.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
