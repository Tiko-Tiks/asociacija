"use client"

import { useState } from "react"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  ToastAction,
} from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Toaster() {
  const { toasts } = useToast()
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set())

  const handleCopy = async (text: string, toastId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIds((prev) => new Set([...prev, toastId]))
      setTimeout(() => {
        setCopiedIds((prev) => {
          const next = new Set(prev)
          next.delete(toastId)
          return next
        })
      }, 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        // TEMPORARY: Add copy button for error toasts (pilot/debug)
        const isError = variant === 'destructive'
        const errorText = description ? `${title ? title + ': ' : ''}${description}` : title || ''
        const showCopyButton = isError && errorText

        return (
          <Toast key={id} {...props} variant={variant}>
            <div className="grid gap-1 flex-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* TEMPORARY: Copy button for debugging (pilot mode) */}
              {showCopyButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => handleCopy(errorText, id)}
                  title="Kopijuoti klaidą"
                >
                  {copiedIds.has(id) ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              )}
              {action}
              <ToastClose />
            </div>
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

