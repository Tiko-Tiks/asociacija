'use client'

import { useEffect } from 'react'
import { mapServerError } from '@/app/ui/errors'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const uiError = mapServerError(error)

  useEffect(() => {
    // Log error to console in development
    console.error('Error boundary caught:', error)
  }, [error])

  return (
    <div>
      <h2>Something went wrong!</h2>

      {uiError === 'AUTH' && (
        <div>
          <p>Please sign in to continue.</p>
          <button onClick={reset}>Try again</button>
        </div>
      )}

      {uiError === 'FORBIDDEN' && (
        <div>
          <p>You do not have permission to access this resource.</p>
          <button onClick={reset}>Try again</button>
        </div>
      )}

      {uiError === 'INVALID' && (
        <div>
          <p>The request was invalid. Please check your input.</p>
          <button onClick={reset}>Try again</button>
        </div>
      )}

      {uiError === 'UNKNOWN' && (
        <div>
          <p>An unexpected error occurred.</p>
          <button onClick={reset}>Try again</button>
        </div>
      )}
    </div>
  )
}

