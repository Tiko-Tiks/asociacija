/**
 * ============================================================================
 * V2 – GOVERNANCE-LOCKED, DO NOT AUTO-MODIFY
 * ============================================================================
 * 
 * This module implements V2 community registration UI with governance guarantees.
 * Any automation here breaks legal guarantees.
 * 
 * STATUS: FROZEN - No modifications without governance approval
 * ============================================================================
 */

'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageLayout } from '@/components/layout/page-layout'
import { Logo } from '@/components/ui/logo'
import { logoConfig } from '@/lib/logo-config'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/**
 * Public Register Community Page V2
 *
 * Enhanced registration form with rate limiting and improved validation.
 * Calls /api/v2/register-community endpoint.
 */

export default function RegisterCommunityV2Page() {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [privacyDialogOpen, setPrivacyDialogOpen] = useState(false)
  const [privacyContent, setPrivacyContent] = useState<string>('')
  const [registrationResult, setRegistrationResult] = useState<{
    success: boolean
    message?: string
    error?: string
    rate_limit_exceeded?: boolean
    count?: number
    limit?: number
  } | null>(null)

  // Load privacy policy content when dialog opens
  const handlePrivacyLinkClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    try {
      const response = await fetch('/documents/platformos-privatumo-politika.md')
      if (response.ok) {
        const text = await response.text()
        setPrivacyContent(text)
        setPrivacyDialogOpen(true)
      } else {
        window.open('/privacy-policy', '_blank')
      }
    } catch (error) {
      console.error('Error loading privacy policy:', error)
      window.open('/privacy-policy', '_blank')
    }
  }

  // Format markdown content for display
  const formatMarkdown = (text: string): string => {
    if (!text) return ''

    let html = text
      .replace(/^PLATFORMOS.*$/gm, '<h1 class="text-2xl font-bold mb-4">$&</h1>')
      .replace(/^PRIVATUMO POLITIKA$/gm, '<h1 class="text-2xl font-bold mb-4">$&</h1>')
      .replace(/^Versija:.*$/gm, '<p class="text-sm text-slate-600 mb-2">$&</p>')
      .replace(/^Statusas:.*$/gm, '<p class="text-sm text-slate-600 mb-2">$&</p>')
      .replace(/^Įsigaliojimo data:.*$/gm, '<p class="text-sm text-slate-600 mb-4">$&</p>')
      .replace(/^(\d+\.\d+\.)\s+(.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1 $2</h3>')
      .replace(/^(\d+\.)\s+(.+)$/gm, '<h2 class="text-xl font-semibold mt-6 mb-3">$1 $2</h2>')
      .replace(/^[-•]\s+(.+)$/gm, '<li class="ml-4 mb-1">$1</li>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^_{20,}$/gm, '<hr class="my-4 border-slate-300" />')

    const lines = html.split('\n')
    const processed: string[] = []
    let inList = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      if (!line) {
        if (inList) {
          processed.push('</ul>')
          inList = false
        }
        processed.push('<br />')
        continue
      }

      if (line.startsWith('<li')) {
        if (!inList) {
          processed.push('<ul class="list-disc list-inside space-y-1 mb-3 ml-4">')
          inList = true
        }
        processed.push(line)
      } else {
        if (inList) {
          processed.push('</ul>')
          inList = false
        }
        if (line.match(/^<h[1-3]|^<p|^<hr/)) {
          processed.push(line)
        } else if (!line.match(/^PLATFORMOS|^PRIVATUMO|^Versija|^Statusas|^Įsigaliojimo|^_{20,}$/)) {
          processed.push(`<p class="mb-2">${line}</p>`)
        }
      }
    }

    if (inList) {
      processed.push('</ul>')
    }

    return processed.join('\n')
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const getValue = (key: string) => (formData.get(key) || '').toString().trim()

    const applicationData = {
      community_name: getValue('community-name'),
      contact_person: getValue('contact-person'),
      email: getValue('email').toLowerCase(),
      description: getValue('description'),
      registration_number: getValue('registration-number'),
      address: getValue('address'),
      usage_purpose: getValue('usage-purpose'),
      statutes: getValue('statutes'), // Optional statutes for AI analysis
    }

    // Validate required fields
    if (!applicationData.community_name || !applicationData.email) {
      setRegistrationResult({
        success: false,
        error: 'Trūksta privalomų laukų (bendruomenės pavadinimas, el. paštas).',
      })
      setIsSubmitting(false)
      setIsSubmitted(true)
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(applicationData.email)) {
      setRegistrationResult({
        success: false,
        error: 'Neteisingas el. pašto formatas.',
      })
      setIsSubmitting(false)
      setIsSubmitted(true)
      return
    }

    try {
      // Send registration request to V2 API
      const response = await fetch('/api/v2/register-community', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(applicationData),
      })

      const result = await response.json()

      if (!response.ok) {
        // API returned an error
        setRegistrationResult({
          success: false,
          error: result.error || 'Nepavyko pateikti paraiškos.',
          rate_limit_exceeded: result.rate_limit_exceeded || false,
          count: result.count,
          limit: result.limit,
        })
        setIsSubmitting(false)
        setIsSubmitted(true)
        return
      }

      // Store result for display
      setRegistrationResult(result)
      console.log('Registration submitted successfully (V2)')
    } catch (error) {
      console.error('Error submitting registration:', error)
      setRegistrationResult({
        success: false,
        error: error instanceof Error ? error.message : 'Nepavyko pateikti paraiškos. Bandykite dar kartą.',
      })
    }

    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  if (isSubmitted) {
    // Error case
    if (registrationResult?.error) {
      return (
        <PageLayout showHeader={true} showFooter={false}>
          <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-12">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                  <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <CardTitle className="text-2xl">Klaida</CardTitle>
                <CardDescription>
                  {registrationResult.error}
                </CardDescription>
                {registrationResult.rate_limit_exceeded && (
                  <CardDescription className="mt-2 text-sm">
                    Pateikta paraiškų: {registrationResult.count} / {registrationResult.limit}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => {
                    setIsSubmitted(false)
                    setRegistrationResult(null)
                  }}
                  className="w-full"
                >
                  Bandyti dar kartą
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/">Grįžti į pagrindinį</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </PageLayout>
      )
    }

    // Success case - email sent with onboarding link
    return (
      <PageLayout showHeader={true} showFooter={false}>
        <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-12">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <CardTitle className="text-2xl">Paraiška gauta</CardTitle>
              <CardDescription>
                Patikrinkite el. paštą
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 font-medium mb-2">
                  El. laiškas išsiųstas
                </p>
                <p className="text-sm text-blue-800">
                  Jūsų el. paštu gavote nuorodą, kuria galėsite užpildyti likusius duomenis ir užbaigti registraciją.
                </p>
              </div>
              <p className="text-center text-sm text-slate-600">
                Jei nematote el. laiško, patikrinkite spam aplanką.
              </p>
              <Button asChild className="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <Link href="/">Grįžti į pagrindinį</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout showHeader={true} showFooter={false}>
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-12">
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
            <CardTitle className="text-2xl">Registruoti bendruomenę (V2)</CardTitle>
            <CardDescription>
              Užpildykite formą, kad pateiktumėte paraišką naujai bendruomenei sukurti
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Community Name */}
              <div className="space-y-2">
                <Label htmlFor="community-name">
                  Bendruomenės pavadinimas <span className="text-destructive" aria-label="privalomas laukas">*</span>
                </Label>
                <Input
                  id="community-name"
                  name="community-name"
                  type="text"
                  required
                  placeholder="Pvz., Mano bendruomenė"
                  aria-required="true"
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              {/* Contact Person */}
              <div className="space-y-2">
                <Label htmlFor="contact-person">
                  Kontaktinis asmuo
                </Label>
                <Input
                  id="contact-person"
                  name="contact-person"
                  type="text"
                  placeholder="Vardas, pavardė"
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  El. paštas <span className="text-destructive" aria-label="privalomas laukas">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="pvz@example.com"
                  aria-required="true"
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              {/* Registration Number */}
              <div className="space-y-2">
                <Label htmlFor="registration-number">
                  Registracijos numeris
                </Label>
                <Input
                  id="registration-number"
                  name="registration-number"
                  type="text"
                  placeholder="Pvz., 123456789"
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <p className="text-xs text-slate-500">
                  Juridinių asmenų registre arba kitas oficialus registracijos numeris
                </p>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">
                  Adresas
                </Label>
                <Textarea
                  id="address"
                  name="address"
                  placeholder="Pvz., Miestas, gatvė, namo numeris"
                  rows={2}
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <p className="text-xs text-slate-500">
                  Oficialus organizacijos adresas
                </p>
              </div>

              {/* Usage Purpose */}
              <div className="space-y-2">
                <Label htmlFor="usage-purpose">
                  Kur bus naudojama platforma
                </Label>
                <Textarea
                  id="usage-purpose"
                  name="usage-purpose"
                  placeholder="Aprašykite, kaip planuojate naudoti platformą oficialiame bendruomenės puslapyje..."
                  rows={3}
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <p className="text-xs text-slate-500">
                  Informacija apie platformos naudojimą oficialiame bendruomenės puslapyje
                </p>
              </div>

              {/* Statutes (Optional, for AI analysis) */}
              <div className="space-y-2">
                <Label htmlFor="statutes">
                  Įstatai (neprivaloma)
                </Label>
                <Textarea
                  id="statutes"
                  name="statutes"
                  placeholder="Jei turite organizacijos įstatų tekstą, galite jį pateikti čia. Sistema atliks preliminarią analizę (tik informaciniais tikslais)."
                  rows={6}
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <p className="text-xs text-slate-500">
                  AI analizė yra tik interpretacinė ir neturi jokios teisinės ar procedūrinės galios
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Trumpas aprašymas
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Papildoma informacija apie jūsų bendruomenę..."
                  rows={4}
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              {/* Confirmation Checkbox */}
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="confirmation"
                  name="confirmation"
                  required
                  aria-required="true"
                  className="mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <Label
                  htmlFor="confirmation"
                  className="text-sm font-normal leading-relaxed cursor-pointer"
                >
                  Patvirtinu, kad pateikta informacija yra teisinga ir sutinku su{' '}
                  <a
                    href="#"
                    onClick={handlePrivacyLinkClick}
                    className="text-primary underline hover:no-underline cursor-pointer"
                  >
                    privatumo politika
                  </a>
                  <span className="text-destructive" aria-label="privalomas laukas"> *</span>
                </Label>
              </div>

              {/* Submit Button */}
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  asChild
                  className="w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Link href="/">Atšaukti</Link>
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {isSubmitting ? 'Siunčiama...' : 'Pateikti paraišką'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Privacy Policy Dialog */}
        <Dialog open={privacyDialogOpen} onOpenChange={setPrivacyDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="sticky top-0 z-10 bg-background border-b px-6 py-4">
              <DialogTitle>Privatumo politika</DialogTitle>
              <DialogDescription>
                Prašome perskaityti privatumo politiką prieš tęsdami registraciją
              </DialogDescription>
            </DialogHeader>
            <div
              className="prose prose-slate max-w-none text-slate-700 px-6 py-4 overflow-y-auto flex-1"
              dangerouslySetInnerHTML={{ __html: formatMarkdown(privacyContent) }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  )
}
