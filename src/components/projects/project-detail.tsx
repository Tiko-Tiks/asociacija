/**
 * LEGACY (v17–v18): This component is read-only.
 * Projects v19.0+ are derived from APPROVED resolutions.
 */
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Euro,
  Package,
  Hammer,
  CheckCircle,
  Clock,
  XCircle,
  Plus,
  ArrowLeft,
} from 'lucide-react'
import {
  getProject,
  getProjectFundingTotals,
  listProjectContributions,
  pledgeMoney,
  pledgeInKind,
  pledgeWork,
  updateContributionStatus,
  type Project,
  type ProjectFundingTotals,
  type ProjectContribution,
} from '@/app/actions/projects'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { lt } from 'date-fns/locale'
import { PledgeMoneyForm } from './pledge-money-form'
import { PledgeInKindForm } from './pledge-in-kind-form'
import { PledgeWorkForm } from './pledge-work-form'

interface ProjectDetailProps {
  projectId: string
  orgId: string
  orgSlug: string
  isOwner: boolean
  isBoard: boolean
}

export function ProjectDetail({
  projectId,
  orgId,
  orgSlug,
  isOwner,
  isBoard,
}: ProjectDetailProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [totals, setTotals] = useState<ProjectFundingTotals | null>(null)
  const [contributions, setContributions] = useState<ProjectContribution[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'money' | 'inkind' | 'work'>('money')

  const canManage = isOwner || isBoard

  useEffect(() => {
    loadData()
  }, [projectId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [projectData, totalsData, contributionsData] = await Promise.all([
        getProject(projectId),
        getProjectFundingTotals(projectId),
        listProjectContributions(projectId),
      ])

      setProject(projectData)
      setTotals(totalsData)
      setContributions(contributionsData)
    } catch (error) {
      console.error('Error loading project:', error)
      toast({
        title: 'Klaida',
        description: 'Nepavyko įkelti projekto',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePledgeMoney = async (amount: number, note: string | null) => {
    try {
      const result = await pledgeMoney(projectId, amount, note)
      if (result.ok) {
        toast({
          title: 'Sėkmė',
          description: 'Pinigų parama užfiksuota',
        })
        await loadData()
      } else {
        toast({
          title: 'Klaida',
          description: result.reason === 'NOT_A_MEMBER' ? 'Neturite teisių' : 'Nepavyko užfiksuoti',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error pledging money:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko klaida',
        variant: 'destructive',
      })
    }
  }

  const handlePledgeInKind = async (items: any[], note: string | null) => {
    try {
      const result = await pledgeInKind(projectId, items, note)
      if (result.ok) {
        toast({
          title: 'Sėkmė',
          description: 'Daiktinė parama užfiksuota',
        })
        await loadData()
      } else {
        toast({
          title: 'Klaida',
          description: 'Nepavyko užfiksuoti',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error pledging in-kind:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko klaida',
        variant: 'destructive',
      })
    }
  }

  const handlePledgeWork = async (
    work: { type: string; hours: number; available_dates?: string[]; notes?: string },
    note: string | null
  ) => {
    try {
      const result = await pledgeWork(projectId, work, note)
      if (result.ok) {
        toast({
          title: 'Sėkmė',
          description: 'Darbo parama užfiksuota',
        })
        await loadData()
      } else {
        toast({
          title: 'Klaida',
          description: 'Nepavyko užfiksuoti',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error pledging work:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko klaida',
        variant: 'destructive',
      })
    }
  }

  const handleUpdateStatus = async (contributionId: string, status: 'RECEIVED' | 'CANCELLED') => {
    try {
      const result = await updateContributionStatus(contributionId, status)
      if (result.ok) {
        toast({
          title: 'Sėkmė',
          description: 'Statusas atnaujintas',
        })
        await loadData()
      } else {
        toast({
          title: 'Klaida',
          description: 'Nepavyko atnaujinti',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko klaida',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Kraunama...</div>
  }

  if (!project) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">Projektas nerastas</CardContent>
      </Card>
    )
  }

  const progressPercent = totals ? Math.min(totals.progress_ratio, 100) : 0

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Grįžti
      </Button>

      {/* Project Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <CardTitle className="text-2xl">{project.title}</CardTitle>
              {project.description && (
                <CardDescription className="mt-2">{project.description}</CardDescription>
              )}
            </div>
            <Badge variant={project.status === 'FUNDING' ? 'default' : 'secondary'}>
              {project.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Biudžetas:</p>
              <p className="text-2xl font-bold">{project.budget_eur.toFixed(2)} EUR</p>
            </div>

            {totals && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Surinkta:</span>
                  <span className="font-semibold">
                    {totals.received_money_eur.toFixed(2)} EUR / {totals.goal_budget_eur.toFixed(2)} EUR
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                <p className="text-xs text-gray-500">{progressPercent.toFixed(1)}% biudžeto</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contributions */}
      <Card>
        <CardHeader>
          <CardTitle>Paramos</CardTitle>
          <CardDescription>
            Narių paramos projektui: pinigai, daiktai, darbas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList>
              <TabsTrigger value="money">
                <Euro className="h-4 w-4 mr-2" />
                Pinigai
              </TabsTrigger>
              <TabsTrigger value="inkind">
                <Package className="h-4 w-4 mr-2" />
                Daiktai
              </TabsTrigger>
              <TabsTrigger value="work">
                <Hammer className="h-4 w-4 mr-2" />
                Darbas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="money" className="space-y-4">
              <PledgeMoneyForm onSubmit={handlePledgeMoney} />
              <ContributionsList
                contributions={contributions.filter((c) => c.kind === 'MONEY')}
                canManage={canManage}
                onUpdateStatus={handleUpdateStatus}
              />
            </TabsContent>

            <TabsContent value="inkind" className="space-y-4">
              <PledgeInKindForm onSubmit={handlePledgeInKind} />
              <ContributionsList
                contributions={contributions.filter((c) => c.kind === 'IN_KIND')}
                canManage={canManage}
                onUpdateStatus={handleUpdateStatus}
              />
            </TabsContent>

            <TabsContent value="work" className="space-y-4">
              <PledgeWorkForm onSubmit={handlePledgeWork} />
              <ContributionsList
                contributions={contributions.filter((c) => c.kind === 'WORK')}
                canManage={canManage}
                onUpdateStatus={handleUpdateStatus}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function ContributionsList({
  contributions,
  canManage,
  onUpdateStatus,
}: {
  contributions: ProjectContribution[]
  canManage: boolean
  onUpdateStatus: (id: string, status: 'RECEIVED' | 'CANCELLED') => void
}) {
  if (contributions.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-4">Paramų nėra</p>
  }

  return (
    <div className="space-y-2">
      {contributions.map((contrib) => (
        <Card key={contrib.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {/* Render contribution details based on kind */}
                {contrib.kind === 'MONEY' && (
                  <div>
                    <p className="font-semibold">{contrib.money_amount_eur?.toFixed(2)} EUR</p>
                    {contrib.note && <p className="text-sm text-gray-600">{contrib.note}</p>}
                  </div>
                )}
                {contrib.kind === 'IN_KIND' && contrib.in_kind_items && (
                  <div>
                    <p className="font-semibold">Daiktinė parama</p>
                    {Array.isArray(contrib.in_kind_items) && (
                      <ul className="text-sm text-gray-600 list-disc list-inside">
                        {contrib.in_kind_items.map((item: any, idx: number) => (
                          <li key={idx}>
                            {item.name} - {item.qty} {item.unit}
                          </li>
                        ))}
                      </ul>
                    )}
                    {contrib.note && <p className="text-sm text-gray-600 mt-1">{contrib.note}</p>}
                  </div>
                )}
                {contrib.kind === 'WORK' && contrib.work_offer && (
                  <div>
                    <p className="font-semibold">
                      {contrib.work_offer.type} - {contrib.work_offer.hours} val.
                    </p>
                    {contrib.work_offer.notes && (
                      <p className="text-sm text-gray-600">{contrib.work_offer.notes}</p>
                    )}
                    {contrib.note && <p className="text-sm text-gray-600 mt-1">{contrib.note}</p>}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {format(new Date(contrib.created_at), 'yyyy-MM-dd HH:mm', { locale: lt })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    contrib.status === 'RECEIVED'
                      ? 'default'
                      : contrib.status === 'CANCELLED'
                        ? 'destructive'
                        : 'secondary'
                  }
                >
                  {contrib.status === 'RECEIVED' ? 'Gauta' : contrib.status === 'CANCELLED' ? 'Atšaukta' : 'Pažadėta'}
                </Badge>
                {canManage && contrib.status === 'PLEDGED' && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onUpdateStatus(contrib.id, 'RECEIVED')}
                    >
                      <CheckCircle className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onUpdateStatus(contrib.id, 'CANCELLED')}
                    >
                      <XCircle className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

