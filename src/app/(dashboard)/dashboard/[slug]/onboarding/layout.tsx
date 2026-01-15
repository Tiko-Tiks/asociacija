import { redirect } from 'next/navigation'
import { getOnboardingStatus } from '@/app/actions/onboarding-status'
import { getCurrentUser } from '@/app/actions/auth'
import { OnboardingBlocker } from '@/components/onboarding/onboarding-blocker'

/**
 * Onboarding Layout
 * 
 * Full-screen layout without dashboard navigation.
 * Blocks access to other dashboard pages until onboarding is complete.
 */
export default async function OnboardingLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { slug: string }
}) {
  // Check authentication
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/login?session=expired')
  }

  // Check onboarding status
  const status = await getOnboardingStatus()

  // If onboarding is complete, redirect to dashboard
  if (!status || status.currentStep === null) {
    redirect(`/dashboard/${params.slug}`)
  }

  // Render full-screen onboarding without dashboard navigation
  return (
    <>
      <OnboardingBlocker orgSlug={params.slug} />
      <div className="fixed inset-0 z-50 bg-gradient-to-b from-slate-50 via-white to-slate-50 overflow-y-auto">
        {children}
      </div>
    </>
  )
}
