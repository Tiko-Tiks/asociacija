'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageLayout } from '@/components/layout/page-layout'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/**
 * Public Register Community Page
 * 
 * Simple form for community registration requests.
 * No authentication or database access - just collects information.
 * 
 * Accessibility: Semantic HTML, proper labels, keyboard navigation.
 */
export default function RegisterCommunityPage() {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [privacyDialogOpen, setPrivacyDialogOpen] = useState(false)
  const [privacyContent, setPrivacyContent] = useState<string>('')

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
        // Fallback: open in new tab
        window.open('/privacy-policy', '_blank')
      }
    } catch (error) {
      console.error('Error loading privacy policy:', error)
      // Fallback: open in new tab
      window.open('/privacy-policy', '_blank')
    }
  }

  // Format markdown content for display
  const formatMarkdown = (text: string): string => {
    if (!text) return ''
    
    let html = text
      // Headers
      .replace(/^PLATFORMOS.*$/gm, '<h1 class="text-2xl font-bold mb-4">$&</h1>')
      .replace(/^PRIVATUMO POLITIKA$/gm, '<h1 class="text-2xl font-bold mb-4">$&</h1>')
      .replace(/^Versija:.*$/gm, '<p class="text-sm text-slate-600 mb-2">$&</p>')
      .replace(/^Statusas:.*$/gm, '<p class="text-sm text-slate-600 mb-2">$&</p>')
      .replace(/^Įsigaliojimo data:.*$/gm, '<p class="text-sm text-slate-600 mb-4">$&</p>')
      // Section headers (1.1, 2.1, etc.)
      .replace(/^(\d+\.\d+\.)\s+(.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1 $2</h3>')
      // Main section headers (1., 2., etc.)
      .replace(/^(\d+\.)\s+(.+)$/gm, '<h2 class="text-xl font-semibold mt-6 mb-3">$1 $2</h2>')
      // Bullet points
      .replace(/^•\s+(.+)$/gm, '<li class="ml-4 mb-1">$1</li>')
      // Bold text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Horizontal rules
      .replace(/^_{20,}$/gm, '<hr class="my-4 border-slate-300" />')
    
    // Split into lines and process
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
    const applicationData = {
      communityName: formData.get('community-name') as string,
      contactPerson: formData.get('contact-person') as string,
      email: formData.get('email') as string,
      description: formData.get('description') as string,
      timestamp: new Date().toISOString(),
    }

    try {
      // Send registration request to server
      const response = await fetch('/api/register-community', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(applicationData),
      })

      if (!response.ok) {
        throw new Error('Nepavyko pateikti paraiškos')
      }

      const result = await response.json()
      console.log('COMMUNITY_APPLICATION_RECEIVED:', result)
    } catch (error) {
      console.error('Error submitting registration:', error)
      // Still show success message even if email fails
    }

    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  if (isSubmitted) {
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
                Su jumis susisieksime.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-sm text-slate-600">
                Dėkojame už susidomėjimą! Peržiūrėsime jūsų paraišką ir su jumis susisieksime per pateiktą el. pašto adresą.
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
            <Image
              src="/logo.svg"
              alt="Logo"
              width={48}
              height={48}
              className="h-12 w-12"
            />
          </div>
          <CardTitle className="text-2xl">Registruoti bendruomenę</CardTitle>
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
                placeholder="Pvz., Mano Bendruomenė"
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
            <DialogTitle>Privatumo Politika</DialogTitle>
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

