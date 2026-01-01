'use client'

import { useState, useTransition } from 'react'
import { forgotPassword } from '@/app/actions/auth'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'

interface ForgotPasswordFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ForgotPasswordForm({ open, onOpenChange }: ForgotPasswordFormProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [email, setEmail] = useState('')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!email.trim()) {
      toast({
        variant: 'destructive' as any,
        title: 'Klaida',
        description: 'Prašome įvesti el. pašto adresą',
      })
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.append('email', email)

      const result = await forgotPassword(formData)

      if (result.success) {
        toast({
          title: 'El. laiškas išsiųstas',
          description: result.message || 'Jei šis el. paštas yra registruotas, jūs gausite slaptažodžio atkūrimo nuorodą.',
        })
        setEmail('')
        onOpenChange(false)
      } else {
        toast({
          variant: 'destructive' as any,
          title: 'Klaida',
          description: result.error || 'Įvyko klaida. Bandykite dar kartą.',
        })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pamiršote slaptažodį?</DialogTitle>
          <DialogDescription>
            Įveskite savo el. pašto adresą ir mes išsiųsime jums nuorodą slaptažodžiui atkurti.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="forgot-email">El. paštas</Label>
            <Input
              id="forgot-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={isPending}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Atšaukti
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {isPending ? 'Siunčiama...' : 'Siųsti nuorodą'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

