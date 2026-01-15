'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { logoConfig } from '@/lib/logo-config'
import { createClient } from '@/lib/supabase/client'
import { PasswordSetup } from './password-setup'

interface ApplicationData {
  id: string
  community_name: string
  contact_person: string | null
  email: string
  description: string | null
  token: string
  token_expires_at: string
  status: string
}

export function OnboardingContinueClient({ token }: { token: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [application, setApplication] = useState<ApplicationData | null>(null)
  const [showPasswordSetup, setShowPasswordSetup] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [orgSlug, setOrgSlug] = useState<string | null>(null)

  useEffect(() => {
    async function loadApplication() {
      try {
        const response = await fetch(`/api/onboarding/application?token=${encodeURIComponent(token)}`)
        const data = await response.json()

        if (!response.ok || !data.success) {
          setError(data.error || 'Nepavyko rasti paraiškos.')
          setLoading(false)
          return
        }

        const app = data.application as ApplicationData

        if (new Date(app.token_expires_at) < new Date()) {
          setError('Nuoroda nebegalioja. Prašome pateikti naują paraišką.')
          setLoading(false)
          return
        }

        const supabase = createClient()
        const resolveOrgSlug = async () => {
          const { data: orgs } = await supabase
            .from('orgs')
            .select('slug')
            .eq('name', app.community_name)
            .maybeSingle()

          return orgs?.slug || null
        }

        if (app.status === 'APPROVED') {
          const slug = await resolveOrgSlug()
          if (slug) {
            router.push(`/dashboard/${slug}/onboarding`)
            return
          }
        }

        if (app.status === 'IN_PROGRESS') {
          const slug = await resolveOrgSlug()
          if (slug) {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              router.push(`/dashboard/${slug}/onboarding`)
              return
            }
          }
        }

        setApplication(app)
        setLoading(false)
      } catch (err) {
        console.error('Error loading application:', err)
        setError('Įvyko klaida. Bandykite dar kartą.')
        setLoading(false)
      }
    }

    loadApplication()
  }, [token, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-sm text-slate-600">Kraunama...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <CardTitle className="text-2xl">Klaida</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full">
              <a href="/register-community">Grįžti į registraciją</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!application) {
    return null
  }

  if (showPasswordSetup && userEmail && generatedPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Sveiki, {application.community_name}!
            </h1>
            <p className="text-lg text-slate-600">
              Jūsų paskyra sukurta. Dabar nustatykite savo slaptažodį.
            </p>
          </div>
          <PasswordSetup
            email={userEmail}
            generatedPassword={generatedPassword}
            onComplete={() => {
              if (orgSlug) {
                router.push(`/dashboard/${orgSlug}/onboarding`)
              } else {
                router.push('/dashboard')
              }
            }}
            onSkip={() => {
              if (orgSlug) {
                router.push(`/dashboard/${orgSlug}/onboarding`)
              } else {
                router.push('/dashboard')
              }
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <Logo
              variant="icon"
              size="md"
              showText={false}
              customIconPath={logoConfig.useCustomLogos ? logoConfig.iconLogoPath : undefined}
            />
          </div>
          <CardTitle className="text-2xl">Sveiki, {application.community_name}!</CardTitle>
          <CardDescription>
            Dabar užpildykite likusius duomenis, kad užbaigtumėte registraciją
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 font-medium mb-2">
              Ką reikia padaryti:
            </p>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Užpildyti valdymo klausimus</li>
              <li>Priimti privalomus sutikimus</li>
              <li>Pateikti dokumentus (statutas, registro centro išrašas, rinkimų protokolas)</li>
            </ul>
          </div>
          <Button
            onClick={async () => {
              setLoading(true)
              try {
                const response = await fetch('/api/onboarding/start', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ token }),
                })
                const data = await response.json()

                if (!response.ok || !data.success) {
                  setError(data.error || 'Nepavyko pradėti onboarding')
                  setLoading(false)
                  return
                }

                if (data.password) {
                  const supabase = createClient()
                  const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: data.email,
                    password: data.password,
                  })

                  if (signInError) {
                    console.error('Error signing in:', signInError)
                    router.push(`/dashboard/${data.orgSlug}/onboarding`)
                    return
                  }

                  setGeneratedPassword(data.password)
                  setUserEmail(data.email)
                  setOrgSlug(data.orgSlug)
                  setShowPasswordSetup(true)
                  setLoading(false)
                  return
                }

                router.push(`/dashboard/${data.orgSlug}/onboarding`)
              } catch (err) {
                console.error('Error starting onboarding:', err)
                setError('Įvyko klaida. Bandykite dar kartą.')
                setLoading(false)
              }
            }}
            className="w-full"
            size="lg"
          >
            Pradėti onboarding
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
