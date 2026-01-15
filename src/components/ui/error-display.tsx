// Dizainas pagal asociacija.net gaires v2026-01 – minimalistinis, audit-safe, institutional, vientisas visiems komponentams

"use client"

/**
 * TEMPORARY: Error display component with copy functionality (pilot/debug aid)
 * 
 * Purpose: Allow copying error messages for debugging during pilot testing.
 * This is a UI-only feature that can be easily removed later.
 * 
 * To remove: Delete this file and replace ErrorDisplayClient usage with inline error text.
 */

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorDisplayClientProps {
  errorMessage?: string
  errorStack?: string
  userMessage: string
}

export function ErrorDisplayClient({ errorMessage, errorStack, userMessage }: ErrorDisplayClientProps) {
  const [copied, setCopied] = useState(false)

  // TEMPORARY: Build full error text for copying (pilot/debug)
  const errorText = errorMessage || errorStack
    ? `${userMessage}${errorMessage ? `\n\nRaw error: ${errorMessage}` : ''}${errorStack ? `\n\nStack:\n${errorStack}` : ''}`
    : userMessage

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
    <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-red-600 dark:text-red-400 font-medium select-text flex-1 break-words" style={{ userSelect: 'text' }}>
          {userMessage}
        </p>
        {/* TEMPORARY: Copy button for debugging (pilot mode) */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs shrink-0"
          onClick={handleCopy}
          title="Kopijuoti klaidą"
        >
          {copied ? (
            <Check className="h-3 w-3" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
    </div>
  )
}

