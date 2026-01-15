import { redirect } from 'next/navigation'
import { OnboardingContinueClient } from '@/components/onboarding/onboarding-continue-client'

/**
 * Onboarding Continue Page (Token-Based)
 * 
 * Public page for completing registration via token from email.
 * No authentication required - token provides access.
 */
export default async function OnboardingContinuePage({
  searchParams,
}: {
  searchParams?: { token?: string }
}) {
  const token = searchParams?.token

  if (!token) {
    redirect('/register-community?error=missing_token')
  }

  return <OnboardingContinueClient token={token} />
}

