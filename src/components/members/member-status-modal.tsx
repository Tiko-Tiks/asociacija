"use client"

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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { updateMemberStatus } from '@/app/actions/member-status'
import { useRouter } from 'next/navigation'

interface MemberStatusModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  userId: string
  userName: string | null
  currentStatus: string
}

export function MemberStatusModal({
  open,
  onOpenChange,
  orgId,
  userId,
  userName,
  currentStatus,
}: MemberStatusModalProps) {
  const [newStatus, setNewStatus] = useState<'ACTIVE' | 'SUSPENDED'>('ACTIVE')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({
        title: "Klaida",
        description: "Prašome įvesti priežastį",
        variant: "destructive" as any,
      })
      return
    }

    setIsSubmitting(true)
    try {
      const result = await updateMemberStatus(orgId, userId, newStatus, reason)

      if (result.success) {
        toast({
          title: "Sėkmė",
          description: "Nario statusas sėkmingai atnaujintas",
        })
        onOpenChange(false)
        setReason('')
        setNewStatus('ACTIVE')
        router.refresh()
      } else {
        toast({
          title: "Klaida",
          description: result.error || "Nepavyko atnaujinti statuso",
          variant: "destructive" as any,
        })
      }
    } catch (error) {
      toast({
        title: "Klaida",
        description: error instanceof Error ? error.message : "Nepavyko atnaujinti statuso",
        variant: "destructive" as any,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    setReason('')
    setNewStatus('ACTIVE')
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Laukiama'
      case 'ACTIVE':
        return 'Aktyvus'
      case 'SUSPENDED':
        return 'Sustabdytas'
      case 'LEFT':
        return 'Uždarytas'
      default:
        return status
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Keisti nario statusą</DialogTitle>
          <DialogDescription>
            Keičiate {userName || 'nario'} statusą. Dabartinis statusas: {getStatusLabel(currentStatus)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="status">
              Naujas statusas <span className="text-destructive">*</span>
            </Label>
            <Select
              value={newStatus}
              onValueChange={(value) => setNewStatus(value as 'ACTIVE' | 'SUSPENDED')}
            >
              <SelectTrigger id="status" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <SelectValue placeholder="Pasirinkite statusą" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Aktyvus</SelectItem>
                <SelectItem value="SUSPENDED">Sustabdytas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">
              Priežastis <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Įveskite priežastį statuso keitimui..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              required
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Atšaukti
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !reason.trim()}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {isSubmitting ? 'Išsaugoma...' : 'Patvirtinti'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

