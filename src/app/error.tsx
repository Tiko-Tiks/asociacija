'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageLayout } from '@/components/layout/page-layout'
import { Copy, Check, AlertCircle, Home, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [copied, setCopied] = useState(false)
  
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  // TEMPORARY: Build full error text for copying (pilot/debug)
  const errorText = `${error.message}${error.digest ? `\nDigest: ${error.digest}` : ''}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(errorText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <PageLayout showHeader={true} showFooter={false}>
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-slate-900">
              Įvyko klaida
            </CardTitle>
            <CardDescription className="text-base">
              Atsiprašome, įvyko netikėta klaida. Bandykite dar kartą.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Error details with copy button (pilot/debug) */}
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-900 mb-1">Klaidos pranešimas:</p>
                  <p className="text-xs font-mono text-red-800 break-words select-text" style={{ userSelect: 'text' }}>
                    {error.message}
                    {error.digest && (
                      <span className="block mt-2 text-xs opacity-70">
                        Digest: {error.digest}
                      </span>
                    )}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 shrink-0"
                  onClick={handleCopy}
                  title="Kopijuoti klaidą"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={reset} 
                className="flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Bandyti dar kartą
              </Button>
              <Button 
                asChild 
                variant="outline" 
                className="flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  Grįžti į pagrindinį
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
