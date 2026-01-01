'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface CreateProjectModalProps {
  ideaId: string
  ideaTitle: string
  orgId: string
  onClose: () => void
  onSubmit: (budgetEur: number) => Promise<void>
}

export function CreateProjectModal({
  ideaId,
  ideaTitle,
  orgId,
  onClose,
  onSubmit,
}: CreateProjectModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [budgetEur, setBudgetEur] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const budget = parseFloat(budgetEur)
    if (isNaN(budget) || budget <= 0) {
      toast({
        title: 'Klaida',
        description: 'Įveskite teisingą biudžetą',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      await onSubmit(budget)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sukurti projektą</DialogTitle>
          <DialogDescription>
            Sukurkite projektą iš idėjos &quot;{ideaTitle}&quot; su biudžetu
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="budget">
              Biudžetas (EUR) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="budget"
              type="number"
              step="0.01"
              min="0"
              value={budgetEur}
              onChange={(e) => setBudgetEur(e.target.value)}
              placeholder="1000.00"
              required
              disabled={loading}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Atšaukti
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Kuriama...
                </>
              ) : (
                'Sukurti'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

