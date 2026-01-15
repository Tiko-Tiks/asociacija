'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  MoreVertical,
  User,
  FileText,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  suspendOrganization,
  activateOrganizationAdmin,
} from '@/app/actions/admin/manage-orgs'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import type { OrgAdminView } from '@/app/actions/admin/manage-orgs'
import { OrgDetailsModal } from './org-details-modal'

interface OrgRegistryTableProps {
  organizations: OrgAdminView[]
}

export function OrgRegistryTable({ organizations }: OrgRegistryTableProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState<string | null>(null)
  const [viewingOrg, setViewingOrg] = useState<OrgAdminView | null>(null)

  const handleUpdate = () => {
    router.refresh()
  }

  const handleSuspend = async (orgId: string, orgName: string) => {
    setLoading(orgId)
    try {
      const result = await suspendOrganization(orgId)
      if (result.success) {
        toast({
          title: 'Sėkmė',
          description: `${orgName} sėkmingai sustabdyta`,
        })
        // Force full page reload to ensure data is fresh
        setTimeout(() => {
          window.location.reload()
        }, 500)
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko sustabdyti organizacijos',
          variant: 'destructive',
        })
        setLoading(null)
      }
    } catch (error) {
      console.error('Error suspending organization:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko netikėta klaida',
        variant: 'destructive',
      })
      setLoading(null)
    }
  }

  const handleActivate = async (orgId: string, orgName: string) => {
    setLoading(orgId)
    try {
      const result = await activateOrganizationAdmin(orgId)
      if (result.success) {
        toast({
          title: 'Sėkmė',
          description: `${orgName} sėkmingai patvirtinta ir aktyvuota`,
        })
        // Force full page reload to ensure data is fresh
        setTimeout(() => {
          window.location.reload()
        }, 500)
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko patvirtinti organizacijos',
          variant: 'destructive',
        })
        setLoading(null)
      }
    } catch (error) {
      console.error('Error activating organization:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko netikėta klaida',
        variant: 'destructive',
      })
      setLoading(null)
    }
  }

  const handleGhostLogin = (slug: string) => {
    // Redirect to dashboard as if admin is the owner
    // Note: This requires special session handling - for now, just redirect
    router.push(`/dashboard/${slug}`)
  }

  const getStatusBadge = (status: string | null) => {
    if (status === 'ACTIVE') {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Aktyvi
        </Badge>
      )
    }
    if (status === 'PENDING_REVIEW' || status === 'PENDING_ACTIVATION') {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
          Laukia patvirtinimo
        </Badge>
      )
    }
    if (status === 'PENDING') {
      return (
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
          Laukia
        </Badge>
      )
    }
    if (status === 'SUSPENDED') {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Sustabdyta
        </Badge>
      )
    }
    // Default: if no status, check if it should be PENDING_REVIEW
    return (
      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
        Laukia patvirtinimo
      </Badge>
    )
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100">Bendruomenių registras</CardTitle>
        <p className="text-sm text-slate-400 mt-1">
          Valdyti visas platformos organizacijas
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-slate-800">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-slate-900/50">
                <TableHead className="text-slate-400">Pavadinimas</TableHead>
                <TableHead className="text-slate-400">Sukurta</TableHead>
                <TableHead className="text-slate-400">Nariai</TableHead>
                <TableHead className="text-slate-400">Statusas</TableHead>
                <TableHead className="text-slate-400">Savininkas</TableHead>
                <TableHead className="text-slate-400 text-right">Veiksmai</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                    Organizacijų nerasta
                  </TableCell>
                </TableRow>
              ) : (
                organizations.map((org) => (
                  <TableRow
                    key={org.id}
                    className="border-slate-800 hover:bg-slate-900/50"
                  >
                    <TableCell className="font-medium text-slate-100">
                      <div>
                        <div>{org.name}</div>
                        <div className="text-xs text-slate-500">{org.slug}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {org.created_at
                        ? new Date(org.created_at).toISOString().split('T')[0]
                        : '-'}
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {org.memberCount}
                    </TableCell>
                    <TableCell>{getStatusBadge(org.status)}</TableCell>
                    <TableCell className="text-slate-400">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        <div className="text-xs">
                          {org.ownerEmail || 'Nėra savininko'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-slate-100"
                            disabled={loading === org.id}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-slate-900 border-slate-800"
                        >
                          <DropdownMenuItem
                            onClick={() => setViewingOrg(org)}
                            className="text-slate-100 hover:bg-slate-800"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Peržiūrėti detales
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleGhostLogin(org.slug)}
                            className="text-slate-100 hover:bg-slate-800"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Peržiūrėti kaip narys
                          </DropdownMenuItem>
                          {org.status !== 'SUSPENDED' && (
                            <DropdownMenuItem
                              onClick={() => handleSuspend(org.id, org.name)}
                              className="text-red-400 hover:bg-red-500/20"
                              disabled={loading === org.id}
                            >
                              <AlertTriangle className="h-4 w-4 mr-2" />
                              Suspenduoti
                            </DropdownMenuItem>
                          )}
                          {(org.status === 'PENDING_REVIEW' ||
                            org.status === 'PENDING_ACTIVATION' ||
                            org.status === 'PENDING' ||
                            org.status === 'ONBOARDING' ||
                            !org.status) && (
                            <DropdownMenuItem
                              onClick={() => handleActivate(org.id, org.name)}
                              className="text-green-400 hover:bg-green-500/20"
                              disabled={loading === org.id}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Patvirtinti
                            </DropdownMenuItem>
                          )}
                          {org.status === 'SUSPENDED' && (
                            <DropdownMenuItem
                              onClick={() => handleActivate(org.id, org.name)}
                              className="text-green-400 hover:bg-green-500/20"
                              disabled={loading === org.id}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Reactivate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Org Details Modal */}
      {viewingOrg && (
        <OrgDetailsModal
          org={viewingOrg}
          isOpen={!!viewingOrg}
          onClose={() => setViewingOrg(null)}
          onUpdate={handleUpdate}
        />
      )}
    </Card>
  )
}

