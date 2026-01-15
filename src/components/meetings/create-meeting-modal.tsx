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
import { AlertCircle } from 'lucide-react'
import { createMeetingGA, canScheduleMeeting } from '@/app/actions/meetings'
import { useToast } from '@/components/ui/use-toast'
import { DateTimePicker } from '@/components/ui/datetime-picker'

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
  const [scheduledAt, setScheduledAt] = useState(() => {
    // Default to tomorrow at 9:00
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    return tomorrow.toISOString()
  })
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

  // Helper to use recommended date
  const useRecommendedDate = () => {
    if (scheduleCheck?.earliest_allowed) {
      // Use ISO string directly
      setScheduledAt(scheduleCheck.earliest_allowed)
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
            <Label>Data ir laikas *</Label>
            <DateTimePicker
              id="scheduled_at"
              value={scheduledAt}
              onChange={setScheduledAt}
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
                  <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/10">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription>
                      <div className="space-y-3">
                        <div className="text-sm text-slate-700 dark:text-slate-300">
                          <p className="mb-2">
                            Susirinkimo data neatitinka pranešimo termino taisyklės. Pagal governance nustatymus, susirinkimas turi būti suplanuotas ne mažiau kaip{' '}
                            <strong className="text-slate-900 dark:text-slate-100">{scheduleCheck.notice_days} {scheduleCheck.notice_days === 1 ? 'dieną' : 'dienas'}</strong> į priekį.
                          </p>
                          <div className="bg-white dark:bg-slate-800 p-3 rounded border border-amber-200 dark:border-amber-800">
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Ankščiausia galima data:</p>
                            <p className="font-medium text-slate-900 dark:text-slate-100">
                              {formatEarliestAllowed(scheduleCheck.earliest_allowed)}
                            </p>
                          </div>
                        </div>
                        <Button 
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={useRecommendedDate}
                          className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20"
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Naudoti rekomenduojamą datą
                        </Button>
                      </div>
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
            <Button 
              type="submit" 
              disabled={loading || (scheduleCheck !== null && !scheduleCheck.allowed)}
            >
              {loading ? 'Kuriama...' : 'Sukurti'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

