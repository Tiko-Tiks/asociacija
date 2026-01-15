/**
 * LEGACY (v17–v18): This component is read-only.
 * Projects v19.0+ are derived from APPROVED resolutions.
 */
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Hammer, Loader2 } from 'lucide-react'

interface PledgeWorkFormProps {
  onSubmit: (
    work: { type: string; hours: number; available_dates?: string[]; notes?: string },
    note: string | null
  ) => Promise<void>
}

export function PledgeWorkForm({ onSubmit }: PledgeWorkFormProps) {
  const [loading, setLoading] = useState(false)
  const [workType, setWorkType] = useState('')
  const [hours, setHours] = useState('')
  const [availableDates, setAvailableDates] = useState('')
  const [workNotes, setWorkNotes] = useState('')
  const [note, setNote] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const hoursNum = parseFloat(hours)
    if (isNaN(hoursNum) || hoursNum <= 0 || !workType.trim()) {
      return
    }

    const dates = availableDates
      .split(',')
      .map((d) => d.trim())
      .filter((d) => d.length > 0)

    setLoading(true)
    try {
      await onSubmit(
        {
          type: workType,
          hours: hoursNum,
          available_dates: dates.length > 0 ? dates : undefined,
          notes: workNotes || undefined,
        },
        note || null
      )
      setWorkType('')
      setHours('')
      setAvailableDates('')
      setWorkNotes('')
      setNote('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hammer className="h-5 w-5" />
          Siūlyti fizinę pagalbą
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workType">
              Darbo tipas * <span className="text-sm text-gray-500">(pvz. Statyba, Dažymas)</span>
            </Label>
            <Input
              id="workType"
              value={workType}
              onChange={(e) => setWorkType(e.target.value)}
              placeholder="Statyba"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hours">
              Valandos * <span className="text-sm text-gray-500">(kiek valandų galiu skirti)</span>
            </Label>
            <Input
              id="hours"
              type="number"
              step="0.5"
              min="0"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="8"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="availableDates">
              Galimos datos <span className="text-sm text-gray-500">(atskirtos kableliais)</span>
            </Label>
            <Input
              id="availableDates"
              value={availableDates}
              onChange={(e) => setAvailableDates(e.target.value)}
              placeholder="2025-01-15, 2025-01-16"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workNotes">Darbo pastabos</Label>
            <Textarea
              id="workNotes"
              value={workNotes}
              onChange={(e) => setWorkNotes(e.target.value)}
              placeholder="Papildoma informacija apie darbą..."
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Bendra pastaba (neprivaloma)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Papildoma informacija..."
              rows={2}
              disabled={loading}
            />
          </div>

          <Button type="submit" disabled={loading || !workType || !hours}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Vykdoma...
              </>
            ) : (
              <>
                <Hammer className="h-4 w-4 mr-2" />
                Siūlyti paramą
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

