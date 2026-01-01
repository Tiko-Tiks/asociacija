'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, FileText, AlertCircle, User, Loader2, Edit2, Save, X } from 'lucide-react'
import type { OrgAdminView } from '@/app/actions/admin/manage-orgs'
import { activateOrganizationAdmin, suspendOrganization } from '@/app/actions/admin/manage-orgs'
import { updateOrganizationAdmin } from '@/app/actions/admin/update-org'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'

interface OrgDetailsModalProps {
  org: OrgAdminView | null
  isOpen: boolean
  onClose: () => void
  onUpdate?: () => void
}

function getStatusBadge(status: string | null) {
  if (status === 'ACTIVE' || !status) {
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
  if (status === 'SUSPENDED') {
    return (
      <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
        <AlertCircle className="h-3 w-3 mr-1" />
        Sustabdyta
      </Badge>
    )
  }
  return <Badge variant="secondary">{status}</Badge>
}

export function OrgDetailsModal({ org, isOpen, onClose, onUpdate }: OrgDetailsModalProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    name: '',
    slug: '',
    status: '',
  })

  // Initialize editData when org changes
  useEffect(() => {
    if (org) {
      setEditData({
        name: org.name,
        slug: org.slug,
        status: org.status || '',
      })
    }
  }, [org])

  const handleEdit = () => {
    if (!org) return
    setEditData({
      name: org.name,
      slug: org.slug,
      status: org.status || '',
    })
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    if (!org) return
    setIsEditing(false)
    setEditData({
      name: org.name,
      slug: org.slug,
      status: org.status || '',
    })
  }

  const handleSaveEdit = async () => {
    if (!org) return
    setLoading(true)
    try {
      const updateData: any = {}
      if (editData.name !== org.name) updateData.name = editData.name
      if (editData.slug !== org.slug) updateData.slug = editData.slug
      if (editData.status !== org.status) updateData.status = editData.status

      if (Object.keys(updateData).length === 0) {
        setIsEditing(false)
        setLoading(false)
        return
      }

      const result = await updateOrganizationAdmin(org.id, updateData)
      if (result.success) {
        toast({
          title: 'Sėkmė',
          description: 'Organizacijos duomenys sėkmingai atnaujinti',
        })
        setIsEditing(false)
        // Call onUpdate callback to refresh parent component
        onUpdate?.()
        // Force full page reload to ensure data is fresh
        setTimeout(() => {
          window.location.reload()
        }, 300)
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko atnaujinti duomenų',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error updating organization:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko netikėta klaida',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleActivate = async () => {
    if (!org) return
    setLoading(true)
    try {
      const result = await activateOrganizationAdmin(org.id)
      if (result.success) {
        toast({
          title: 'Sėkmė',
          description: `${org.name} sėkmingai patvirtinta ir aktyvuota`,
        })
        // Close modal first
        onClose()
        // Call onUpdate callback to refresh parent component
        onUpdate?.()
        // Force full page reload to ensure data is fresh
        setTimeout(() => {
          window.location.reload()
        }, 300)
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko patvirtinti organizacijos',
          variant: 'destructive',
        })
        setLoading(false)
      }
    } catch (error) {
      console.error('Error activating organization:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko netikėta klaida',
        variant: 'destructive',
      })
      setLoading(false)
    }
  }

  const handleSuspend = async () => {
    if (!org) return
    setLoading(true)
    try {
      const result = await suspendOrganization(org.id)
      if (result.success) {
        toast({
          title: 'Sėkmė',
          description: `${org.name} sėkmingai sustabdyta`,
        })
        // Close modal first
        onClose()
        // Call onUpdate callback to refresh parent component
        onUpdate?.()
        // Force full page reload to ensure data is fresh
        setTimeout(() => {
          window.location.reload()
        }, 300)
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko sustabdyti organizacijos',
          variant: 'destructive',
        })
        setLoading(false)
      }
    } catch (error) {
      console.error('Error suspending organization:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko netikėta klaida',
        variant: 'destructive',
      })
      setLoading(false)
    }
  }

  if (!org) {
    return null
  }

  const canActivate =
    (org.status === 'PENDING_REVIEW' ||
      org.status === 'PENDING_ACTIVATION' ||
      org.status === 'PENDING' ||
      !org.status) &&
    org.hasGovernanceConfig &&
    org.hasProposedRuleset
  const canSuspend = org.status === 'ACTIVE'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-slate-900 border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-slate-100 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {org.name} - Detali informacija
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Peržiūrėkite visą informaciją prieš patvirtinant organizaciją
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto pr-4">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-100">Pagrindinė informacija</h3>
                {!isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEdit}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Redaguoti
                  </Button>
                )}
              </div>
              {isEditing ? (
                <div className="space-y-4 bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <div>
                    <Label htmlFor="edit-name" className="text-slate-400">Pavadinimas</Label>
                    <Input
                      id="edit-name"
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      className="mt-1 bg-slate-900 border-slate-700 text-slate-100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-slug" className="text-slate-400">Slug</Label>
                    <Input
                      id="edit-slug"
                      value={editData.slug}
                      onChange={(e) => setEditData({ ...editData, slug: e.target.value })}
                      className="mt-1 bg-slate-900 border-slate-700 text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-status" className="text-slate-400">Statusas</Label>
                    <select
                      id="edit-status"
                      value={editData.status}
                      onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                      className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-100"
                    >
                      <option value="">PENDING</option>
                      <option value="PENDING_REVIEW">PENDING_REVIEW</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveEdit}
                      disabled={loading}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Išsaugoma...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Išsaugoti
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleCancelEdit}
                      variant="outline"
                      size="sm"
                      disabled={loading}
                      className="border-slate-700"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Atšaukti
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Pavadinimas:</span>
                    <p className="text-slate-100 mt-1">{org.name}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Slug:</span>
                    <p className="text-slate-100 mt-1 font-mono">{org.slug}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Statusas:</span>
                    <div className="mt-1">{getStatusBadge(org.status)}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Sukūrimo data:</span>
                    <p className="text-slate-100 mt-1">
                      {org.created_at
                        ? new Date(org.created_at).toLocaleDateString('lt-LT')
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Narių skaičius:</span>
                    <p className="text-slate-100 mt-1">{org.memberCount}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Pirmininkas:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-slate-100">{org.ownerName || '-'}</p>
                        <p className="text-xs text-slate-500">{org.ownerEmail || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Governance Config */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-100">Valdymo konfigūracija</h3>
                {org.hasGovernanceConfig ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Pateikta
                  </Badge>
                ) : (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Nepateikta
                  </Badge>
                )}
              </div>
              {org.hasGovernanceConfig && org.governanceAnswers ? (
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <div className="space-y-3">
                    {Object.entries(org.governanceAnswers).map(([key, value]) => {
                      // Format key to readable label
                      const label = key
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, (l) => l.toUpperCase())
                      return (
                        <div key={key} className="border-b border-slate-700 pb-2 last:border-0">
                          <div className="text-slate-400 text-xs mb-1">{label}</div>
                          <div className="text-slate-100 text-sm">
                            {typeof value === 'boolean' ? (
                              <Badge className={value ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                                {value ? 'Taip' : 'Ne'}
                              </Badge>
                            ) : typeof value === 'object' ? (
                              <pre className="text-xs font-mono">{JSON.stringify(value, null, 2)}</pre>
                            ) : (
                              String(value)
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 text-sm">
                  Valdymo konfigūracija dar nepateikta arba neegzistuoja.
                </p>
              )}
            </div>

            {/* Ruleset Status */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-100">Ruleset statusas</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm">PROPOSED</span>
                    {org.hasProposedRuleset ? (
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                        Yra
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-700/50 text-slate-500 border-slate-600">
                        Nėra
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm">ACTIVE</span>
                    {org.hasActiveRuleset ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                        Yra
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-700/50 text-slate-500 border-slate-600">
                        Nėra
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              {org.hasProposedRuleset && org.rulesetContent && (
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 mt-4">
                  <h4 className="text-slate-300 font-semibold mb-2">Ruleset turinys:</h4>
                  <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
                    {org.rulesetContent}
                  </pre>
                </div>
              )}
            </div>

            {/* Activation Requirements */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-100">Aktyvacijos reikalavimai</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {org.hasGovernanceConfig ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-400" />
                  )}
                  <span className={`text-sm ${org.hasGovernanceConfig ? 'text-green-400' : 'text-red-400'}`}>
                    Valdymo konfigūracija pateikta
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {org.hasProposedRuleset ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-400" />
                  )}
                  <span className={`text-sm ${org.hasProposedRuleset ? 'text-green-400' : 'text-red-400'}`}>
                    PROPOSED ruleset sukurtas
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {org.status === 'ACTIVE' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-400" />
                  )}
                  <span className={`text-sm ${org.status === 'ACTIVE' ? 'text-green-400' : 'text-yellow-400'}`}>
                    Organizacijos statusas: {org.status || 'PENDING'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="flex gap-2">
            {canActivate && (
              <Button
                onClick={handleActivate}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Patvirtinama...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Patvirtinti ir aktyvuoti
                  </>
                )}
              </Button>
            )}
            {canSuspend && (
              <Button
                onClick={handleSuspend}
                disabled={loading}
                variant="destructive"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sustabdoma...
                  </>
                ) : (
                  <>
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Sustabdyti
                  </>
                )}
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            Uždaryti
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

