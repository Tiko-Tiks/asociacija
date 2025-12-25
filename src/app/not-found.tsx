'use client'

import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p>The page you are looking for does not exist.</p>

        <Link
          href="/dashboard"
          className="inline-block rounded bg-black px-4 py-2 text-white"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}

