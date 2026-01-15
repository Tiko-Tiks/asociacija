'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState } from 'react'
import { signup } from '@/app/actions/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface RegisterFormProps {
  signupAction: (formData: FormData) => Promise<{ success: boolean; error?: string; message?: string }>
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      className="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      disabled={pending}
    >
      {pending ? 'Registruojama...' : 'Registruotis'}
    </Button>
  )
}

export function RegisterForm({ signupAction }: RegisterFormProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [showSuccess, setShowSuccess] = useState(false)
  
  const [state, formAction] = useFormState(
    async (prevState: any, formData: FormData) => {
      try {
        const result = await signupAction(formData)
        return result
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : 'Įvyko klaida. Bandykite dar kartą.'
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
        title: 'Registracijos klaida',
        description: state.error,
      })
    } else if (state?.success) {
      setShowSuccess(true)
      toast({
        variant: 'default',
        title: 'Registracija sėkminga',
        description: state.message || 'Jūsų paskyra sėkmingai sukurta.',
      })
      // Redirect to home after 3 seconds
      setTimeout(() => {
        router.push('/')
      }, 3000)
    }
  }, [state, toast, router])

  if (showSuccess) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold text-slate-900">
            Registracija sėkminga!
          </CardTitle>
          <CardDescription>
            {state?.message || 'Jūsų paskyra sėkmingai sukurta.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            <p className="font-medium">Ką toliau?</p>
            <ul className="mt-2 space-y-1 list-disc list-inside text-green-700">
              <li>Jei reikia, patikrinkite el. paštą patvirtinimo nuorodai</li>
              <li>Galite prisijungti prie savo paskyros</li>
              <li>Prisijungę galite prisidėti prie bendruomenių</li>
            </ul>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => router.push('/')}
              className="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Grįžti į pagrindinį
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Link href="/login">Prisijungti</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold text-slate-900">
          Registruotis
        </CardTitle>
        <CardDescription>
          Įveskite duomenis, kad sukurtumėte naują paskyrą
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Vardas ir pavardė (nebūtina)</Label>
            <Input
              id="full_name"
              name="full_name"
              type="text"
              placeholder="Jonas Jonaitis"
              autoComplete="name"
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
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
            <Label htmlFor="password">Slaptažodis *</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              autoComplete="new-password"
              minLength={6}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <p className="text-xs text-slate-500">Bent 6 simboliai</p>
          </div>

          <SubmitButton />
          
          <div className="text-center text-sm text-slate-600">
            Jau turite paskyrą?{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-800 underline-offset-4 hover:underline">
              Prisijungti
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

