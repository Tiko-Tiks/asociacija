'use client'

import { useState, useEffect } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { login } from '@/app/actions/auth'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

interface LoginDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  redirectTo?: string
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      className="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      disabled={pending}
    >
      {pending ? 'Prisijungiama...' : 'Prisijungti'}
    </Button>
  )
}

export function LoginDialog({ open, onOpenChange, redirectTo }: LoginDialogProps) {
  const router = useRouter()
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [state, formAction] = useFormState(
    async (prevState: any, formData: FormData) => {
      setError(null)
      try {
        await login(formData, redirectTo)
        // Login action redirects server-side, but in dialog we need to handle it client-side
        router.refresh()
        setTimeout(() => {
          window.location.href = '/'
        }, 100)
        return { success: true }
      } catch (error: any) {
        // Next.js redirect() throws a special error with digest starting with 'NEXT_REDIRECT'
        if (error?.digest?.startsWith('NEXT_REDIRECT')) {
          router.refresh()
          setTimeout(() => {
            window.location.href = '/'
          }, 100)
          return { success: true }
        }
        
        // For other errors, return error state
        const errorMessage = error instanceof Error ? error.message : 'Įvyko klaida. Bandykite dar kartą.'
        setError(errorMessage)
        return {
          success: false,
          error: errorMessage,
        }
      }
    },
    null
  )

  // Handle successful login - redirect to user's account
  useEffect(() => {
    if (state?.success) {
      onOpenChange(false)
      router.refresh()
      setTimeout(() => {
        window.location.href = '/'
      }, 500)
    }
  }, [state?.success, router, onOpenChange, redirectTo])

  // Reset error when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setError(null)
    }
    onOpenChange(newOpen)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-slate-900">
              Prisijungti
            </DialogTitle>
            <DialogDescription>
              Įveskite el. paštą ir slaptažodį, kad prisijungtumėte
            </DialogDescription>
          </DialogHeader>
          
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <p className="font-medium">Prisijungimo klaida</p>
              <p className="mt-1 text-red-700">{error}</p>
            </div>
          )}
          
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dialog-email">Email</Label>
              <Input
                id="dialog-email"
                name="email"
                type="email"
                placeholder="your@email.com"
                required
                autoComplete="email"
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="dialog-password">Slaptažodis</Label>
                <button
                  type="button"
                  onClick={() => setForgotPasswordOpen(true)}
                  className="text-sm text-slate-600 hover:text-slate-900 underline-offset-4 hover:underline"
                >
                  Pamiršote slaptažodį?
                </button>
              </div>
              <Input
                id="dialog-password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <SubmitButton />
          </form>
        </DialogContent>
      </Dialog>
      <ForgotPasswordForm open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen} />
    </>
  )
}

