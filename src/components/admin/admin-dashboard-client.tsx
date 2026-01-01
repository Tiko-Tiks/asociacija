'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Building2, 
  DollarSign, 
  Users, 
  FileText, 
  Search,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Download,
  Filter,
  X,
  LayoutDashboard,
  ArrowLeft,
} from 'lucide-react'
import { getOrgFinances } from '@/app/actions/admin'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Org {
  id: string
  name: string
  slug: string
  status: string | null
  memberCount: number
  created_at: string | null
}

interface OrgFinances {
  totalInvoices: number
  paidInvoices: number
  unpaidInvoices: number
  totalRevenue: number
  unpaidAmount: number
  invoices: Array<{
    id: string
    amount: number
    status: string
    due_date: string | null
    created_at: string
  }>
}

interface AdminDashboardClientProps {
  orgs: Org[]
  dashboardUrl?: string
}

type SortField = 'name' | 'members' | 'created' | 'revenue'
type SortDirection = 'asc' | 'desc'

export function AdminDashboardClient({ orgs, dashboardUrl = '/dashboard' }: AdminDashboardClientProps) {
  const [selectedOrgId, setSelectedOrgId] = useState<string>(orgs.length > 0 ? orgs[0].id : '')
  const [finances, setFinances] = useState<OrgFinances | null>(null)
  const [isLoadingFinances, setIsLoadingFinances] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const router = useRouter()

  const selectedOrg = orgs.find((org) => org.id === selectedOrgId)

  // Load finances when org changes
  useEffect(() => {
    if (selectedOrgId) {
      handleOrgChange(selectedOrgId)
    }
  }, [selectedOrgId])

  const handleOrgChange = async (orgId: string) => {
    setSelectedOrgId(orgId)
    setIsLoadingFinances(true)
    
    try {
      const orgFinances = await getOrgFinances(orgId)
      setFinances(orgFinances)
    } catch (error) {
      console.error('Error loading finances:', error)
      setFinances(null)
    } finally {
      setIsLoadingFinances(false)
    }
  }

  // Filter and sort organizations
  const filteredAndSortedOrgs = useMemo(() => {
    let filtered = [...orgs]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (org) =>
          org.name.toLowerCase().includes(query) ||
          org.slug.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((org) => org.status === statusFilter)
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'members':
          aValue = a.memberCount
          bValue = b.memberCount
          break
        case 'created':
          aValue = a.created_at ? new Date(a.created_at).getTime() : 0
          bValue = b.created_at ? new Date(b.created_at).getTime() : 0
          break
        case 'revenue':
          // For revenue, we'd need to fetch finances for all orgs
          // For now, use member count as proxy
          aValue = a.memberCount
          bValue = b.memberCount
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [orgs, searchQuery, statusFilter, sortField, sortDirection])

  // Calculate platform-wide statistics
  const platformStats = useMemo(() => {
    const totalOrgs = orgs.length
    const totalMembers = orgs.reduce((sum, org) => sum + org.memberCount, 0)
    const avgMembersPerOrg = totalOrgs > 0 ? Math.round(totalMembers / totalOrgs) : 0
    const activeOrgs = orgs.filter((org) => org.status === 'ACTIVE' || !org.status).length

    return {
      totalOrgs,
      totalMembers,
      avgMembersPerOrg,
      activeOrgs,
    }
  }, [orgs])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(field)}
      className="h-8 px-2 hover:bg-slate-100"
    >
      {children}
      <ArrowUpDown className="ml-2 h-3 w-3" />
    </Button>
  )

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Administratoriaus panelė</h1>
          <p className="text-muted-foreground mt-2">
            Valdykite organizacijas, peržiūrėkite finansus ir analizuokite duomenis
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(dashboardUrl)}
          className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <LayoutDashboard className="h-4 w-4" />
          Grįžti į dashboard
        </Button>
      </div>

      {/* Platform Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Viso organizacijų</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformStats.totalOrgs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {platformStats.activeOrgs} aktyvių
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Viso narių</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformStats.totalMembers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Vidutiniškai {platformStats.avgMembersPerOrg} per org
            </p>
          </CardContent>
        </Card>

        {finances && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bendros pajamos</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {finances.totalRevenue.toFixed(2)} €
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {finances.paidInvoices} apmokėtų sąskaitų
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Neapmokėta</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {finances.unpaidAmount.toFixed(2)} €
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {finances.unpaidInvoices} neapmokėtų sąskaitų
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="organizations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="organizations">Organizacijos</TabsTrigger>
          <TabsTrigger value="finances">Finansai</TabsTrigger>
          <TabsTrigger value="applications">Užklausos</TabsTrigger>
        </TabsList>

        {/* Organizations Tab */}
        <TabsContent value="organizations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Organizacijų sąrašas</CardTitle>
                  <CardDescription>
                    {filteredAndSortedOrgs.length} iš {orgs.length} organizacijų
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Eksportuoti
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ieškoti organizacijų..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Statusas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Visi statusai</SelectItem>
                    <SelectItem value="ACTIVE">Aktyvios</SelectItem>
                    <SelectItem value="INACTIVE">Neaktyvios</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Organizations Table */}
              <div className="rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="h-12 px-4 text-left align-middle font-medium text-slate-700">
                          <SortButton field="name">Pavadinimas</SortButton>
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-slate-700">
                          <SortButton field="members">Nariai</SortButton>
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-slate-700">
                          Statusas
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-slate-700">
                          <SortButton field="created">Sukurta</SortButton>
                        </th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-slate-700">
                          Veiksmai
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedOrgs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="h-24 text-center text-muted-foreground">
                            Organizacijų nerasta
                          </td>
                        </tr>
                      ) : (
                        filteredAndSortedOrgs.map((org) => (
                          <tr
                            key={org.id}
                            className={`border-b transition-colors hover:bg-slate-50 cursor-pointer ${
                              selectedOrgId === org.id ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => setSelectedOrgId(org.id)}
                          >
                            <td className="h-12 px-4 align-middle">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">{org.name}</div>
                                  <div className="text-xs text-muted-foreground">{org.slug}</div>
                                </div>
                              </div>
                            </td>
                            <td className="h-12 px-4 align-middle">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{org.memberCount}</span>
                              </div>
                            </td>
                            <td className="h-12 px-4 align-middle">
                              <Badge
                                variant={
                                  org.status === 'ACTIVE' || !org.status
                                    ? 'default'
                                    : 'secondary'
                                }
                              >
                                {org.status || 'ACTIVE'}
                              </Badge>
                            </td>
                            <td className="h-12 px-4 align-middle text-sm text-muted-foreground">
                              {org.created_at
                                ? new Date(org.created_at).toLocaleDateString('lt-LT')
                                : '-'}
                            </td>
                            <td className="h-12 px-4 align-middle text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedOrgId(org.id)
                                }}
                              >
                                Peržiūrėti
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Finances Tab */}
        <TabsContent value="finances" className="space-y-4">
          {selectedOrg ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Finansai: {selectedOrg.name}
                    </CardTitle>
                    <CardDescription>
                      Detali finansinė informacija apie pasirinktą organizaciją
                    </CardDescription>
                  </div>
                  <Select value={selectedOrgId} onValueChange={handleOrgChange}>
                    <SelectTrigger className="w-[250px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {orgs.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingFinances ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    Kraunama...
                  </div>
                ) : finances ? (
                  <div className="space-y-6">
                    {/* Financial Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="rounded-lg border bg-card p-4">
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Viso sąskaitų
                        </div>
                        <div className="text-3xl font-bold">{finances.totalInvoices}</div>
                      </div>
                      <div className="rounded-lg border bg-card p-4">
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Apmokėtos
                        </div>
                        <div className="text-3xl font-bold text-green-600">
                          {finances.paidInvoices}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {finances.totalInvoices > 0
                            ? Math.round((finances.paidInvoices / finances.totalInvoices) * 100)
                            : 0}
                          % visų
                        </div>
                      </div>
                      <div className="rounded-lg border bg-card p-4">
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Neapmokėtos
                        </div>
                        <div className="text-3xl font-bold text-orange-600">
                          {finances.unpaidInvoices}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {finances.totalInvoices > 0
                            ? Math.round((finances.unpaidInvoices / finances.totalInvoices) * 100)
                            : 0}
                          % visų
                        </div>
                      </div>
                      <div className="rounded-lg border bg-card p-4">
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Neapmokėta suma
                        </div>
                        <div className="text-3xl font-bold text-red-600">
                          {finances.unpaidAmount.toFixed(2)} €
                        </div>
                      </div>
                    </div>

                    {/* Revenue Summary */}
                    <div className="rounded-lg border bg-gradient-to-r from-green-50 to-green-100 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-green-800 mb-1">
                            Bendra pajamų suma
                          </div>
                          <div className="text-4xl font-bold text-green-700">
                            {finances.totalRevenue.toFixed(2)} €
                          </div>
                        </div>
                        <TrendingUp className="h-12 w-12 text-green-600" />
                      </div>
                    </div>

                    {/* Invoices List */}
                    {finances.invoices.length > 0 ? (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold">Sąskaitų sąrašas</h3>
                          <Badge variant="outline">{finances.invoices.length} sąskaitų</Badge>
                        </div>
                        <div className="rounded-md border">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b bg-slate-50">
                                  <th className="h-12 px-4 text-left align-middle font-medium text-slate-700">
                                    Suma
                                  </th>
                                  <th className="h-12 px-4 text-left align-middle font-medium text-slate-700">
                                    Statusas
                                  </th>
                                  <th className="h-12 px-4 text-left align-middle font-medium text-slate-700">
                                    Terminas
                                  </th>
                                  <th className="h-12 px-4 text-left align-middle font-medium text-slate-700">
                                    Data
                                  </th>
                                  <th className="h-12 px-4 text-right align-middle font-medium text-slate-700">
                                    Veiksmai
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {finances.invoices.map((invoice) => (
                                  <tr
                                    key={invoice.id}
                                    className="border-b transition-colors hover:bg-slate-50"
                                  >
                                    <td className="h-12 px-4 align-middle font-medium">
                                      {invoice.amount.toFixed(2)} €
                                    </td>
                                    <td className="h-12 px-4 align-middle">
                                      <Badge
                                        variant={
                                          invoice.status === 'PAID'
                                            ? 'default'
                                            : invoice.status === 'OVERDUE'
                                            ? 'destructive'
                                            : 'secondary'
                                        }
                                      >
                                        {invoice.status}
                                      </Badge>
                                    </td>
                                    <td className="h-12 px-4 align-middle text-sm text-muted-foreground">
                                      {invoice.due_date
                                        ? new Date(invoice.due_date).toLocaleDateString('lt-LT')
                                        : '-'}
                                    </td>
                                    <td className="h-12 px-4 align-middle text-sm text-muted-foreground">
                                      {new Date(invoice.created_at).toLocaleDateString('lt-LT')}
                                    </td>
                                    <td className="h-12 px-4 align-middle text-right">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}
                                      >
                                        Peržiūrėti
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Sąskaitų nėra</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>Nepavyko įkelti finansų duomenų</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => handleOrgChange(selectedOrgId)}
                    >
                      Bandyti dar kartą
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Pasirinkite organizaciją, kad peržiūrėtumėte finansus</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Bendruomenių užklausos
              </CardTitle>
              <CardDescription>
                Peržiūrėkite ir tvarkykite naujų bendruomenių registracijos užklausas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Užklausų sistema kuriama</p>
                <p className="text-sm">
                  Kol kas užklausos loguojamos į serverio konsolę.
                  <br />
                  Būsima versija leis peržiūrėti ir patvirtinti užklausas čia.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
