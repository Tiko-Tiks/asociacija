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
import { Euro, Loader2 } from 'lucide-react'

interface PledgeMoneyFormProps {
  onSubmit: (amount: number, note: string | null) => Promise<void>
}

export function PledgeMoneyForm({ onSubmit }: PledgeMoneyFormProps) {
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      return
    }

    setLoading(true)
    try {
      await onSubmit(amountNum, note || null)
      setAmount('')
      setNote('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Euro className="h-5 w-5" />
          Aukoti pinigus
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Suma (EUR) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100.00"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Pastaba (neprivaloma)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Papildoma informacija..."
              rows={2}
              disabled={loading}
            />
          </div>

          <Button type="submit" disabled={loading || !amount}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Vykdoma...
              </>
            ) : (
              <>
                <Euro className="h-4 w-4 mr-2" />
                Pažadėti
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

