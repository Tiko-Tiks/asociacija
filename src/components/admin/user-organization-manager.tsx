'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Users, Building2, ArrowRight, Loader2, X, Plus } from 'lucide-react'
import {
  getAllUsersWithOrgs,
  changeUserOrganization,
  removeUserFromOrganization,
  addUserToOrganization,
  checkMembershipDependencies,
  getMembershipId,
  type UserWithOrgs,
  type MembershipDependencies,
} from '@/app/actions/admin/manage-members'
import { getAllOrganizationsAdmin, type OrgAdminView } from '@/app/actions/admin/manage-orgs'

export function UserOrganizationManager() {
  const { toast } = useToast()
  const [users, setUsers] = useState<UserWithOrgs[]>([])
  const [organizations, setOrganizations] = useState<OrgAdminView[]>([])
  const [loading, setLoading] = useState(true)
  const [changing, setChanging] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [adding, setAdding] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserWithOrgs | null>(null)
  const [selectedOldOrg, setSelectedOldOrg] = useState<string>('')
  const [selectedNewOrg, setSelectedNewOrg] = useState<string>('')
  const [selectedRole, setSelectedRole] = useState<'OWNER' | 'MEMBER'>('MEMBER')
  const [preserveRole, setPreserveRole] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState<'change' | 'remove' | 'add'>('change')
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false)
  const [removeOrgId, setRemoveOrgId] = useState<string>('')
  const [removeOrgName, setRemoveOrgName] = useState<string>('')
  const [removeMembershipId, setRemoveMembershipId] = useState<string>('')
  const [dependencies, setDependencies] = useState<MembershipDependencies | null>(null)
  const [checkingDependencies, setCheckingDependencies] = useState(false)
  const [forceRemove, setForceRemove] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [usersData, orgsData] = await Promise.all([
        getAllUsersWithOrgs(),
        getAllOrganizationsAdmin(),
      ])
      setUsers(usersData)
      setOrganizations(orgsData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: 'Klaida',
        description: 'Nepavyko užkrauti duomenų',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChangeDialog = (user: UserWithOrgs, oldOrgId: string) => {
    setSelectedUser(user)
    setSelectedOldOrg(oldOrgId)
    setSelectedNewOrg('')
    setPreserveRole(false)
    setDialogType('change')
    setDialogOpen(true)
  }

  const handleOpenAddDialog = (user: UserWithOrgs) => {
    setSelectedUser(user)
    setSelectedOldOrg('')
    setSelectedNewOrg('')
    setSelectedRole('MEMBER')
    setDialogType('add')
    setDialogOpen(true)
  }

  const handleOpenRemoveConfirm = async (user: UserWithOrgs, orgId: string) => {
    setSelectedUser(user)
    setRemoveOrgId(orgId)
    setRemoveOrgName(getOrgName(orgId))
    setDependencies(null)
    setForceRemove(false)
    setRemoveConfirmOpen(true)
    
    // Get membership ID and check dependencies
    setCheckingDependencies(true)
    try {
      const membershipId = await getMembershipId(user.id, orgId)
      if (membershipId) {
        setRemoveMembershipId(membershipId)
        const deps = await checkMembershipDependencies(membershipId)
        setDependencies(deps)
      }
    } catch (error) {
      console.error('Error checking dependencies:', error)
    } finally {
      setCheckingDependencies(false)
    }
  }

  const handleChangeOrganization = async () => {
    if (!selectedUser || !selectedOldOrg || !selectedNewOrg) {
      toast({
        title: 'Klaida',
        description: 'Pasirinkite visus reikalingus laukus',
        variant: 'destructive',
      })
      return
    }

    if (selectedOldOrg === selectedNewOrg) {
      toast({
        title: 'Klaida',
        description: 'Nauja organizacija turi skirtis nuo senos',
        variant: 'destructive',
      })
      return
    }

    setChanging(true)
    try {
      const result = await changeUserOrganization(
        selectedUser.id,
        selectedOldOrg,
        selectedNewOrg,
        preserveRole
      )

      if (result.success) {
        toast({
          title: 'Sėkmė',
          description: 'Vartotojo organizacija sėkmingai pakeista',
        })
        setDialogOpen(false)
        loadData()
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko pakeisti organizacijos',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error changing organization:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko netikėta klaida',
        variant: 'destructive',
      })
    } finally {
      setChanging(false)
    }
  }

  const handleRemoveFromOrganization = async () => {
    if (!selectedUser || !removeOrgId) {
      return
    }

    setRemoving(true)
    try {
      const result = await removeUserFromOrganization(
        selectedUser.id,
        removeOrgId,
        forceRemove
      )

      if (result.success) {
        toast({
          title: 'Sėkmė',
          description: forceRemove
            ? 'Vartotojas sėkmingai pašalintas iš organizacijos su priklausomybėmis'
            : 'Vartotojas sėkmingai pašalintas iš organizacijos',
        })
        setRemoveConfirmOpen(false)
        setDependencies(null)
        setForceRemove(false)
        loadData()
      } else {
        // If dependencies were returned, update state
        if (result.dependencies) {
          setDependencies(result.dependencies)
        }
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko pašalinti vartotojo',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error removing user from organization:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko netikėta klaida',
        variant: 'destructive',
      })
    } finally {
      setRemoving(false)
    }
  }

  const handleAddToOrganization = async () => {
    if (!selectedUser || !selectedNewOrg) {
      toast({
        title: 'Klaida',
        description: 'Pasirinkite organizaciją',
        variant: 'destructive',
      })
      return
    }

    setAdding(true)
    try {
      const result = await addUserToOrganization(selectedUser.id, selectedNewOrg, selectedRole)

      if (result.success) {
        toast({
          title: 'Sėkmė',
          description: 'Vartotojas sėkmingai pridėtas prie organizacijos',
        })
        setDialogOpen(false)
        loadData()
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko pridėti vartotojo',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error adding user to organization:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko netikėta klaida',
        variant: 'destructive',
      })
    } finally {
      setAdding(false)
    }
  }

  const getOrgName = (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId)
    return org?.name || orgId
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Vartotojų organizacijų valdymas
          </CardTitle>
          <CardDescription>
            Peržiūrėkite ir pakeiskite vartotojų organizacijas. Vartotojas gali turėti kelias
            organizacijas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-800">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800">
                  <TableHead>Vartotojas</TableHead>
                  <TableHead>El. paštas</TableHead>
                  <TableHead>Organizacijos</TableHead>
                  <TableHead>Veiksmai</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-slate-400 py-8">
                      Nėra vartotojų
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} className="border-slate-800">
                      <TableCell>
                        <div className="font-medium">
                          {user.full_name || user.email || 'Nėra vardo'}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400">{user.email || '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {user.current_orgs.length === 0 ? (
                            <Badge variant="outline" className="bg-slate-800 text-slate-400">
                              Nėra organizacijų
                            </Badge>
                          ) : (
                            user.current_orgs.map((org) => (
                              <Badge
                                key={org.org_id}
                                variant="outline"
                                className="bg-slate-800 text-slate-300"
                              >
                                <Building2 className="h-3 w-3 mr-1" />
                                {org.org_name}
                                <span className="ml-1 text-slate-500">({org.role})</span>
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 flex-wrap">
                          {user.current_orgs.length > 0 ? (
                            <>
                              {user.current_orgs.map((org) => (
                                <div key={org.org_id} className="flex gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenChangeDialog(user, org.org_id)}
                                    className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                                  >
                                    <ArrowRight className="h-3 w-3 mr-1" />
                                    Pakeisti
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenRemoveConfirm(user, org.org_id)}
                                    className="bg-red-900/20 border-red-800 text-red-400 hover:bg-red-900/30"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenAddDialog(user)}
                                className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Pridėti
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenAddDialog(user)}
                              className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Pridėti organizaciją
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Change/Add Organization Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'change'
                ? 'Pakeisti vartotojo organizaciją'
                : 'Pridėti vartotoją prie organizacijos'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedUser && (
                <>
                  Vartotojas: <span className="text-slate-200">{selectedUser.full_name || selectedUser.email}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {dialogType === 'change' && selectedOldOrg && (
              <div className="space-y-2">
                <Label>Sena organizacija</Label>
                <div className="p-3 bg-slate-800 rounded-md text-slate-300">
                  {getOrgName(selectedOldOrg)}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="new-org">
                {dialogType === 'change' ? 'Nauja organizacija *' : 'Organizacija *'}
              </Label>
              <Select value={selectedNewOrg} onValueChange={setSelectedNewOrg}>
                <SelectTrigger id="new-org" className="bg-slate-800 border-slate-700">
                  <SelectValue placeholder="Pasirinkite organizaciją" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {organizations
                    .filter((org) => {
                      if (dialogType === 'change') {
                        return org.id !== selectedOldOrg
                      }
                      // For add: filter out orgs where user already has active membership
                      return !selectedUser?.current_orgs.some((o) => o.org_id === org.id)
                    })
                    .map((org) => (
                      <SelectItem
                        key={org.id}
                        value={org.id}
                        className="text-slate-200 focus:bg-slate-700"
                      >
                        {org.name} ({org.slug})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {dialogType === 'add' && (
              <div className="space-y-2">
                <Label htmlFor="role">Rolė *</Label>
                <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as 'OWNER' | 'MEMBER')}>
                  <SelectTrigger id="role" className="bg-slate-800 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="MEMBER" className="text-slate-200 focus:bg-slate-700">
                      MEMBER
                    </SelectItem>
                    <SelectItem value="OWNER" className="text-slate-200 focus:bg-slate-700">
                      OWNER
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {dialogType === 'change' && selectedOldOrg && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="preserve-role"
                  checked={preserveRole}
                  onCheckedChange={(checked) => setPreserveRole(checked === true)}
                  className="border-slate-700"
                />
                <Label
                  htmlFor="preserve-role"
                  className="text-sm font-normal text-slate-300 cursor-pointer"
                >
                  Išlaikyti rolę iš senos organizacijos
                </Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
            >
              Atšaukti
            </Button>
            <Button
              onClick={dialogType === 'change' ? handleChangeOrganization : handleAddToOrganization}
              disabled={
                (dialogType === 'change' ? changing : adding) || !selectedNewOrg
              }
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {dialogType === 'change' ? (
                changing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Keičiama...
                  </>
                ) : (
                  'Pakeisti'
                )
              ) : adding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Pridedama...
                </>
              ) : (
                'Pridėti'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <Dialog open={removeConfirmOpen} onOpenChange={setRemoveConfirmOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle>Pašalinti vartotoją iš organizacijos</DialogTitle>
            <DialogDescription className="text-slate-400">
              Ar tikrai norite pašalinti{' '}
              <span className="text-slate-200">
                {selectedUser?.full_name || selectedUser?.email}
              </span>{' '}
              iš organizacijos <span className="text-slate-200">{removeOrgName}</span>?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {checkingDependencies ? (
              <div className="flex items-center gap-2 text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Tikrinamos priklausomybės...</span>
              </div>
            ) : dependencies && dependencies.total > 0 ? (
              <div className="space-y-3">
                <div className="p-3 bg-yellow-900/20 border border-yellow-800 rounded-md">
                  <p className="text-sm font-medium text-yellow-400 mb-2">
                    ⚠️ Narystė turi priklausomybių:
                  </p>
                  <div className="space-y-1 text-sm text-slate-300">
                    {dependencies.invoices > 0 && (
                      <div>Sąskaitos: {dependencies.invoices}</div>
                    )}
                    {dependencies.votes > 0 && (
                      <div>Balsavimai: {dependencies.votes}</div>
                    )}
                    {dependencies.positions > 0 && (
                      <div>Pareigos: {dependencies.positions}</div>
                    )}
                    {dependencies.project_contributions > 0 && (
                      <div>Projektų indėliai: {dependencies.project_contributions}</div>
                    )}
                    <div className="font-medium mt-2">
                      Iš viso: {dependencies.total} įrašų
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="force-remove"
                    checked={forceRemove}
                    onCheckedChange={(checked) => setForceRemove(checked === true)}
                    className="border-slate-700"
                  />
                  <Label
                    htmlFor="force-remove"
                    className="text-sm font-normal text-slate-300 cursor-pointer"
                  >
                    Pašalinti su priklausomybėmis (visi susiję įrašai bus pašalinti)
                  </Label>
                </div>
                <p className="text-xs text-slate-400">
                  Jei pažymėsite, visi susiję įrašai (sąskaitos, balsavimai, pareigos, projektų
                  indėliai) bus automatiškai pašalinti kartu su naryste.
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-300">
                Vartotojas bus pašalintas iš organizacijos, bet jo duomenys bus išsaugoti. Jei
                vartotojas yra OWNER ir tai paskutinis OWNER organizacijoje, operacija bus
                atmesta.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRemoveConfirmOpen(false)
                setDependencies(null)
                setForceRemove(false)
              }}
              className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
            >
              Atšaukti
            </Button>
            <Button
              onClick={handleRemoveFromOrganization}
              disabled={removing || checkingDependencies}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {removing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Pašalinama...
                </>
              ) : dependencies && dependencies.total > 0 && !forceRemove ? (
                'Pašalinti su priklausomybėmis'
              ) : (
                'Pašalinti'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

