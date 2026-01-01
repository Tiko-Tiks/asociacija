'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { resetPassword } from '@/app/actions/auth'

interface ResetPasswordFormProps {
  code: string
  next?: string
}

export function ResetPasswordForm({ code, next }: ResetPasswordFormProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!password || !confirmPassword) {
      toast({
        variant: 'destructive' as any,
        title: 'Klaida',
        description: 'Prašome įvesti slaptažodį ir patvirtinimą',
      })
      return
    }

    if (password.length < 6) {
      toast({
        variant: 'destructive' as any,
        title: 'Klaida',
        description: 'Slaptažodis turi būti bent 6 simbolių ilgio',
      })
      return
    }

    if (password !== confirmPassword) {
      toast({
        variant: 'destructive' as any,
        title: 'Klaida',
        description: 'Slaptažodžiai nesutampa',
      })
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.append('password', password)
      formData.append('code', code)

      try {
        await resetPassword(formData, next)
        // resetPassword redirects on success, so we won't reach here
      } catch (error: any) {
        // Handle redirect errors (they're expected)
        if (error?.digest?.startsWith('NEXT_REDIRECT')) {
          return
        }

        const errorMessage = error instanceof Error ? error.message : 'Įvyko klaida. Bandykite dar kartą.'
        toast({
          variant: 'destructive' as any,
          title: 'Klaida',
          description: errorMessage,
        })
      }
    })
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold text-slate-900">
          Naujas slaptažodis
        </CardTitle>
        <CardDescription>
          Įveskite naują slaptažodį savo paskyrai
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Naujas slaptažodis</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              disabled={isPending}
              minLength={6}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <p className="text-xs text-slate-500">Slaptažodis turi būti bent 6 simbolių ilgio</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Patvirtinkite slaptažodį</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              disabled={isPending}
              minLength={6}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <Button
            type="submit"
            className="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            disabled={isPending}
          >
            {isPending ? 'Atkuriama...' : 'Atkurti slaptažodį'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

