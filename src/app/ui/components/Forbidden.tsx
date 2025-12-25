'use client'

import Link from 'next/link'

export function Forbidden() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p>You do not have permission to view this resource.</p>

        <Link
          href="/dashboard"
          className="inline-block rounded bg-black px-4 py-2 text-white"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}

