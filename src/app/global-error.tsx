'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { mapServerError } from '@/app/ui/errors'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  const uiError = mapServerError(error)

  useEffect(() => {
    if (uiError === 'AUTH') {
      router.replace('/login')
    }
  }, [uiError, router])

  if (uiError === 'AUTH') {
    return null
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-xl font-semibold">Something went wrong</h1>

        {uiError === 'FORBIDDEN' && (
          <p>You do not have permission to perform this action.</p>
        )}

        {uiError === 'INVALID' && (
          <p>The request is invalid.</p>
        )}

        {uiError === 'UNKNOWN' && (
          <p>Please try again later.</p>
        )}

        <button
          onClick={() => reset()}
          className="rounded bg-black px-4 py-2 text-white"
        >
          Try again
        </button>
      </div>
    </div>
  )
}

