import { redirect } from 'next/navigation'
import { getOnboardingStatus } from '@/app/actions/onboarding-status'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Chairman Onboarding Page (B3.2)
 * 
 * 3-step wizard to complete governance and consents before activation.
 * Only accessible to OWNER/Chairman when org is not ACTIVE.
 */
export default async function OnboardingPage() {
  const status = await getOnboardingStatus()

  // DEBUG: Log onboarding page status
  console.log('ONBOARDING_PAGE_DEBUG:', {
    hasStatus: !!status,
    currentStep: status?.currentStep,
    isActive: status?.activationStatus?.isActive,
    orgStatus: status?.activationStatus?.status,
  })

  // If no onboarding needed (already active or not OWNER), redirect to dashboard
  // CRITICAL: Add error handling to prevent redirect loops
  if (!status || status.currentStep === null) {
    console.log('ONBOARDING_REDIRECT: No onboarding needed, redirecting to dashboard', {
      hasStatus: !!status,
      currentStep: status?.currentStep,
      isActive: status?.activationStatus?.isActive,
    })
    
    try {
      // Get user's first org slug for redirect
      const { getUserOrgs } = await import('@/app/actions/organizations')
      const orgs = await getUserOrgs()
      if (orgs.length > 0 && orgs[0]?.slug) {
        redirect(`/dashboard/${orgs[0].slug}`)
      } else {
        // Fallback: redirect to landing page if no orgs found
        redirect('/')
      }
    } catch (error) {
      // If error getting orgs, redirect to landing page to prevent loop
      console.error('ONBOARDING_REDIRECT_ERROR: Failed to get user orgs, redirecting to landing page', error)
      redirect('/')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
              Bendruomenės aktyvacija
            </h1>
            <p className="text-lg text-slate-600">
              {status.orgName}
            </p>
            <p className="text-sm text-slate-500 mt-2">
              Užbaikite šiuos žingsnius, kad galėtumėte naudoti visus sistemos funkcionalumus
            </p>
          </div>

          <OnboardingWizard status={status} />
        </div>
      </div>
    </div>
  )
}
