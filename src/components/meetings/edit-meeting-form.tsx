'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, ArrowLeft, Calendar } from 'lucide-react'
import { updateMeetingSchedule, canScheduleMeeting } from '@/app/actions/meetings'
import { useToast } from '@/components/ui/use-toast'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import type { Meeting } from '@/app/domain/types'

interface EditMeetingFormProps {
  meeting: Meeting
  orgId: string
  orgSlug: string
}

export function EditMeetingForm({ meeting, orgId, orgSlug }: EditMeetingFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [scheduledAt, setScheduledAt] = useState(() => {
    // Use ISO string format
    return meeting.scheduled_at || new Date().toISOString()
  })
  const [location, setLocation] = useState(meeting.location || '')
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
    if (!scheduledAt) return

    setLoading(true)
    try {
      const result = await updateMeetingSchedule(
        meeting.id,
        scheduledAt,
        location || undefined
      )

      if (result.success) {
        toast({
          title: 'Susirinkimas atnaujintas',
          description: 'Susirinkimo data ir vieta sėkmingai pakeisti.',
        })
        router.push(`/dashboard/${orgSlug}/governance/${meeting.id}`)
        router.refresh()
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko atnaujinti susirinkimo',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error updating meeting:', error)
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/dashboard/${orgSlug}/governance/${meeting.id}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Redaguoti susirinkimą</h1>
          <p className="mt-1 text-sm text-slate-600">{meeting.title}</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg border">
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

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.push(`/dashboard/${orgSlug}/governance/${meeting.id}`)}
          >
            Atšaukti
          </Button>
          <Button 
            type="submit" 
            disabled={loading || (scheduleCheck !== null && !scheduleCheck.allowed)}
          >
            {loading ? 'Išsaugoma...' : 'Išsaugoti pakeitimus'}
          </Button>
        </div>
      </form>
    </div>
  )
}

