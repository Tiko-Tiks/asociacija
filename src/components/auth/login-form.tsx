'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState } from 'react'
import { login } from '@/app/actions/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useEffect } from 'react'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

interface LoginFormProps {
  loginAction: (formData: FormData, redirectTo?: string) => Promise<void>
  showSessionExpiredMessage?: boolean
  showPasswordResetSuccess?: boolean
  showError?: boolean
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

export function LoginForm({ 
  loginAction, 
  showSessionExpiredMessage = false,
  showPasswordResetSuccess = false,
  showError = false,
  redirectTo 
}: LoginFormProps) {
  const { toast } = useToast()
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false)
  
  const [state, formAction] = useFormState(
    async (prevState: any, formData: FormData) => {
      try {
        // Pass redirectTo to login action
        console.log('LoginForm: redirectTo =', redirectTo)
        await loginAction(formData, redirectTo)
        // Login action redirects server-side, so we won't reach here normally
        // But if we do, return success (redirect should have happened)
        return { success: true }
      } catch (error: any) {
        // Next.js redirect() throws a special error with digest starting with 'NEXT_REDIRECT'
        // We need to re-throw it so the redirect happens
        if (error?.digest?.startsWith('NEXT_REDIRECT')) {
          console.log('LoginForm: Redirect detected, re-throwing:', error.digest)
          throw error
        }
        
        // For other errors, return error state
        const errorMessage = error instanceof Error ? error.message : 'Įvyko klaida. Bandykite dar kartą.'
        console.error('LoginForm: Login error:', errorMessage)
        
        return {
          success: false,
          error: errorMessage,
        }
      }
    },
    null
  )

  useEffect(() => {
    if (state?.error) {
      toast({
        variant: 'destructive' as any,
        title: 'Prisijungimo klaida',
        description: state.error,
      })
    }
  }, [state?.error, toast])

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold text-slate-900">
          Prisijungti
        </CardTitle>
        <CardDescription>
          Įveskite el. paštą ir slaptažodį, kad prisijungtumėte
        </CardDescription>
      </CardHeader>
      <CardContent>
        {showSessionExpiredMessage && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <p className="font-medium">Sesija baigėsi</p>
            <p className="mt-1 text-amber-700">
              Jūsų sesija baigėsi. Prašome prisijungti dar kartą.
            </p>
          </div>
        )}
        {showPasswordResetSuccess && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            <p className="font-medium">Slaptažodis sėkmingai atkurtas</p>
            <p className="mt-1 text-green-700">
              Dabar galite prisijungti su nauju slaptažodžiu.
            </p>
          </div>
        )}
        {showError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <p className="font-medium">Klaida</p>
            <p className="mt-1 text-red-700">
              Atkūrimo nuoroda neteisinga arba nebegalioja. Prašome užsakyti naują nuorodą.
            </p>
          </div>
        )}
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
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
              <Label htmlFor="password">Slaptažodis</Label>
              <button
                type="button"
                onClick={() => setForgotPasswordOpen(true)}
                className="text-sm text-slate-600 hover:text-slate-900 underline-offset-4 hover:underline"
              >
                Pamiršote slaptažodį?
              </button>
            </div>
            <Input
              id="password"
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
      </CardContent>
      <ForgotPasswordForm open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen} />
    </Card>
  )
}

