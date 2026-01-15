'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

/**
 * Onboarding Blocker Component
 * 
 * Blocks navigation to other dashboard pages during onboarding.
 * Uses client-side navigation blocking to prevent leaving onboarding.
 */
export function OnboardingBlocker({ orgSlug }: { orgSlug: string }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Block navigation if user tries to leave onboarding
    if (pathname && !pathname.includes('/onboarding') && pathname.includes('/dashboard')) {
      router.replace(`/dashboard/${orgSlug}/onboarding`)
    }
  }, [pathname, orgSlug, router])

  return null
}
