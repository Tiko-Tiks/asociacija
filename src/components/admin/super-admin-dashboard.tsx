'use client'

import { useState } from 'react'
import { GlobalStats } from './global-stats'
import { OrgRegistryTable } from './org-registry-table'
import { SystemBroadcast } from './system-broadcast'
import { AIBrainMonitor } from './ai-brain-monitor'
import { BranduolysManagement } from './branduolys-management'
import { SystemCoreSeed } from './system-core-seed'
import { GovernanceQuestionsManager } from './governance-questions-manager'
import { CommunityApplicationsList } from './community-applications-list'
import { UserOrganizationManager } from './user-organization-manager'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Activity, Building2, MessageSquare, Brain, BarChart3, Settings, LogOut, FileQuestion, FileCheck, Users } from 'lucide-react'
import { logout } from '@/app/actions/auth'
import { useRouter } from 'next/navigation'
import type { GlobalStats as GlobalStatsType } from '@/app/actions/admin/global-stats'
import type { OrgAdminView } from '@/app/actions/admin/manage-orgs'

interface SuperAdminDashboardProps {
  globalStats: GlobalStatsType
  organizations: OrgAdminView[]
  applications?: Array<{
    id: string
    communityName: string
    contactPerson: string | null
    email: string
    description: string | null
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
    created_at: string
  }>
}

export function SuperAdminDashboard({
  globalStats,
  organizations,
  applications = [],
}: SuperAdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.refresh()
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                <Activity className="h-6 w-6 text-green-500" />
                Platforma
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Valdymo centras - Branduolys ekosistema
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-xs text-slate-500">
                Super administratoriaus režimas
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Atsijungti
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-900 border border-slate-800">
            <TabsTrigger value="overview" className="data-[state=active]:bg-slate-800">
              <BarChart3 className="h-4 w-4 mr-2" />
              Apžvalga
            </TabsTrigger>
            <TabsTrigger value="communities" className="data-[state=active]:bg-slate-800">
              <Building2 className="h-4 w-4 mr-2" />
              Bendruomenės
            </TabsTrigger>
            <TabsTrigger value="broadcast" className="data-[state=active]:bg-slate-800">
              <MessageSquare className="h-4 w-4 mr-2" />
              Pranešimai
            </TabsTrigger>
            <TabsTrigger value="ai" className="data-[state=active]:bg-slate-800">
              <Brain className="h-4 w-4 mr-2" />
              AI stebėjimas
            </TabsTrigger>
            <TabsTrigger value="branduolys" className="data-[state=active]:bg-slate-800">
              <Settings className="h-4 w-4 mr-2" />
              Branduolys
            </TabsTrigger>
            <TabsTrigger value="governance" className="data-[state=active]:bg-slate-800">
              <FileQuestion className="h-4 w-4 mr-2" />
              Klausimynas
            </TabsTrigger>
            <TabsTrigger value="applications" className="data-[state=active]:bg-slate-800">
              <FileCheck className="h-4 w-4 mr-2" />
              Registracijos
              {applications.length > 0 && (
                <Badge variant="outline" className="ml-2 bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                  {applications.filter((a) => a.status === 'PENDING').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-slate-800">
              <Users className="h-4 w-4 mr-2" />
              Vartotojai
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <GlobalStats stats={globalStats} />
          </TabsContent>

          <TabsContent value="communities" className="space-y-6">
            <OrgRegistryTable organizations={organizations} />
          </TabsContent>

          <TabsContent value="broadcast" className="space-y-6">
            <SystemBroadcast />
          </TabsContent>

          <TabsContent value="ai" className="space-y-6">
            <AIBrainMonitor />
          </TabsContent>

          <TabsContent value="branduolys" className="space-y-6">
            <SystemCoreSeed />
            <BranduolysManagement />
          </TabsContent>

          <TabsContent value="governance" className="space-y-6">
            <GovernanceQuestionsManager />
          </TabsContent>

          <TabsContent value="applications" className="space-y-6">
            <CommunityApplicationsList initialApplications={applications} />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UserOrganizationManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

