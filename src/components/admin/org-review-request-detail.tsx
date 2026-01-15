'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { format } from 'date-fns'
import { lt } from 'date-fns/locale'
import { CheckCircle2, XCircle, MessageSquare, Loader2 } from 'lucide-react'
import {
  approveOrg,
  rejectOrg,
  requestOrgChanges,
  type OrgReviewRequest,
} from '@/app/actions/admin/org-review'

interface OrgReviewRequestDetailProps {
  request: OrgReviewRequest
  onClose: () => void
  onUpdate: (updated: OrgReviewRequest) => void
}

export function OrgReviewRequestDetail({
  request,
  onClose,
  onUpdate,
}: OrgReviewRequestDetailProps) {
  const { toast } = useToast()
  const [action, setAction] = useState<'approve' | 'reject' | 'changes' | null>(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const handleApprove = async () => {
    setLoading(true)
    try {
      const result = await approveOrg(request.id)
      if (result.success) {
        toast({
          title: 'Sėkmė',
          description: 'Bendruomenė patvirtinta',
        })
        onUpdate({ ...request, status: 'APPROVED', decided_at: new Date().toISOString() })
        setAction(null)
        onClose()
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko patvirtinti',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error approving:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko netikėta klaida',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!note.trim()) {
      toast({
        title: 'Klaida',
        description: 'Būtina pateikti priežastį',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const result = await rejectOrg(request.id, note)
      if (result.success) {
        toast({
          title: 'Sėkmė',
          description: 'Bendruomenė atmesta',
        })
        onUpdate({
          ...request,
          status: 'REJECTED',
          admin_note: note,
          decided_at: new Date().toISOString(),
        })
        setAction(null)
        setNote('')
        onClose()
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko atmesti',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error rejecting:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko netikėta klaida',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRequestChanges = async () => {
    if (!note.trim()) {
      toast({
        title: 'Klaida',
        description: 'Būtina pateikti pastabą apie reikalingus pataisymus',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const result = await requestOrgChanges(request.id, note)
      if (result.success) {
        toast({
          title: 'Sėkmė',
          description: 'Užklausa grąžinta taisymams',
        })
        onUpdate({
          ...request,
          status: 'NEEDS_CHANGES',
          admin_note: note,
          decided_at: new Date().toISOString(),
        })
        setAction(null)
        setNote('')
        onClose()
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko grąžinti taisymams',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error requesting changes:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko netikėta klaida',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="default">Laukia patvirtinimo</Badge>
      case 'NEEDS_CHANGES':
        return <Badge variant="secondary">Reikia pataisymų</Badge>
      case 'APPROVED':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Patvirtinta</Badge>
      case 'REJECTED':
        return <Badge variant="destructive">Atmesta</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{request.org_name}</span>
              {getStatusBadge(request.status)}
            </DialogTitle>
            <DialogDescription>
              Organizacijos registracijos peržiūra
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Request Info */}
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-slate-700">Pateikta</Label>
                <p className="text-sm text-slate-600">
                  {format(new Date(request.created_at), 'yyyy-MM-dd HH:mm', { locale: lt })}
                </p>
              </div>

              {request.requester_name && (
                <div>
                  <Label className="text-sm font-medium text-slate-700">Pateikė</Label>
                  <p className="text-sm text-slate-600">
                    {request.requester_name} ({request.requester_email})
                  </p>
                </div>
              )}

              {request.note && (
                <div>
                  <Label className="text-sm font-medium text-slate-700">Pirmininko pastaba</Label>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{request.note}</p>
                </div>
              )}

              {request.admin_note && (
                <div>
                  <Label className="text-sm font-medium text-slate-700">Admin pastaba</Label>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap bg-amber-50 p-3 rounded border border-amber-200">
                    {request.admin_note}
                  </p>
                </div>
              )}

              {request.decided_at && (
                <div>
                  <Label className="text-sm font-medium text-slate-700">
                    {request.status === 'APPROVED' ? 'Patvirtinta' : 'Nuspręsta'}
                  </Label>
                  <p className="text-sm text-slate-600">
                    {format(new Date(request.decided_at), 'yyyy-MM-dd HH:mm', { locale: lt })}
                  </p>
                </div>
              )}
            </div>

            {/* Actions (only for OPEN or NEEDS_CHANGES) */}
            {request.status === 'OPEN' && (
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={() => setAction('approve')}
                  className="flex-1"
                  variant="default"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Patvirtinti
                </Button>
                <Button
                  onClick={() => setAction('changes')}
                  className="flex-1"
                  variant="secondary"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Prašyti pataisymų
                </Button>
                <Button
                  onClick={() => setAction('reject')}
                  className="flex-1"
                  variant="destructive"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Atmesti
                </Button>
              </div>
            )}

            {request.status === 'NEEDS_CHANGES' && (
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={() => setAction('approve')}
                  className="flex-1"
                  variant="default"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Patvirtinti
                </Button>
                <Button
                  onClick={() => setAction('reject')}
                  className="flex-1"
                  variant="destructive"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Atmesti
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Uždaryti
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation */}
      {action === 'approve' && (
        <Dialog open={true} onOpenChange={() => setAction(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Patvirtinti bendruomenę?</DialogTitle>
              <DialogDescription>
                Ar tikrai norite patvirtinti {request.org_name}? Organizacija bus aktyvuota ir galės naudoti visus sistemos funkcionalumus.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAction(null)} disabled={loading}>
                Atšaukti
              </Button>
              <Button onClick={handleApprove} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Patvirtinama...
                  </>
                ) : (
                  'Patvirtinti'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Reject Dialog */}
      {action === 'reject' && (
        <Dialog open={true} onOpenChange={() => setAction(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Atmesti bendruomenę?</DialogTitle>
              <DialogDescription>
                Įveskite priežastį, kodėl bendruomenė atmetama. Šis pranešimas bus išsiųstas pirmininkui.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reject-note">Priežastis *</Label>
                <Textarea
                  id="reject-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Įveskite priežastį..."
                  rows={4}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAction(null)} disabled={loading}>
                Atšaukti
              </Button>
              <Button onClick={handleReject} variant="destructive" disabled={loading || !note.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Atmetama...
                  </>
                ) : (
                  'Atmesti'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Request Changes Dialog */}
      {action === 'changes' && (
        <Dialog open={true} onOpenChange={() => setAction(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Prašyti pataisymų</DialogTitle>
              <DialogDescription>
                Įveskite, kokie pataisymai reikalingi. Pirmininkas gaus pranešimą ir galės atnaujinti duomenis.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="changes-note">Reikalingi pataisymai *</Label>
                <Textarea
                  id="changes-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Įveskite, kokie pataisymai reikalingi..."
                  rows={4}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAction(null)} disabled={loading}>
                Atšaukti
              </Button>
              <Button onClick={handleRequestChanges} disabled={loading || !note.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Siunčiama...
                  </>
                ) : (
                  'Prašyti pataisymų'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

