'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Calendar } from 'lucide-react'
import { createMeetingGA, canScheduleMeeting } from '@/app/actions/meetings'
import { useToast } from '@/components/ui/use-toast'

interface CreateMeetingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  onMeetingCreated?: () => void
}

export function CreateMeetingModal({
  open,
  onOpenChange,
  orgId,
  onMeetingCreated,
}: CreateMeetingModalProps) {
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(false)
  const [scheduleCheck, setScheduleCheck] = useState<{
    allowed: boolean
    reason: string
    earliest_allowed: string
    notice_days: number
  } | null>(null)

  // Validate schedule when scheduledAt changes
  useEffect(() => {
    if (scheduledAt && orgId) {
      const timer = setTimeout(async () => {
        try {
          const check = await canScheduleMeeting(orgId, scheduledAt)
          setScheduleCheck(check)
        } catch (error) {
          console.error('Error checking schedule:', error)
        }
      }, 500) // Debounce

      return () => clearTimeout(timer)
    } else {
      setScheduleCheck(null)
    }
  }, [scheduledAt, orgId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !scheduledAt) return

    setLoading(true)
    try {
      const result = await createMeetingGA(orgId, title, scheduledAt, location || undefined)

      if (result.success) {
        toast({
          title: 'Susirinkimas sukurtas',
          description: 'Susirinkimas sukurtas sėkmingai. Dabar galite pridėti darbotvarkę.',
        })
        setTitle('')
        setScheduledAt('')
        setLocation('')
        setScheduleCheck(null)
        onOpenChange(false)
        onMeetingCreated?.()
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko sukurti susirinkimo',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error creating meeting:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko netikėta klaida',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const formatEarliestAllowed = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('lt-LT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sukurti visuotinį susirinkimą</DialogTitle>
          <DialogDescription>
            Sukurkite naują GA susirinkimą. Data turi atitikti pranešimo terminą.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Pavadinimas *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Pvz: 2024 metų visuotinis susirinkimas"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduled_at">Data ir laikas *</Label>
            <Input
              id="scheduled_at"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
            {scheduleCheck && (
              <div className="mt-2">
                {scheduleCheck.allowed ? (
                  <Alert>
                    <AlertDescription className="text-green-600">
                      ✓ Data tinkama. Pranešimo terminas: {scheduleCheck.notice_days} dienos.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Data per anksti. Ankščiausia galima data:{' '}
                      <strong>{formatEarliestAllowed(scheduleCheck.earliest_allowed)}</strong>
                      <br />
                      Pranešimo terminas: {scheduleCheck.notice_days} dienos.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Vieta (neprivaloma)</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Pvz: Bendruomenės būstinė, Vilnius"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Atšaukti
            </Button>
            <Button type="submit" disabled={loading || !scheduleCheck?.allowed}>
              {loading ? 'Kuriama...' : 'Sukurti'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

