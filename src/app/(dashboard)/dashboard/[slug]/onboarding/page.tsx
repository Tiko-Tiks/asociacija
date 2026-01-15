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
export default async function OnboardingPage({
  params,
}: {
  params: { slug: string }
}) {
  const status = await getOnboardingStatus()

  // DEBUG: Log onboarding page status
  console.log('ONBOARDING_PAGE_DEBUG:', {
    hasStatus: !!status,
    currentStep: status?.currentStep,
    isActive: status?.activationStatus?.isActive,
    orgStatus: status?.activationStatus?.status,
    slug: params.slug,
  })

  // If no onboarding needed (already active or not OWNER), redirect to dashboard
  // CRITICAL: Add error handling to prevent redirect loops
  if (!status || status.currentStep === null) {
    console.log('ONBOARDING_REDIRECT: No onboarding needed, redirecting to dashboard', {
      hasStatus: !!status,
      currentStep: status?.currentStep,
      isActive: status?.activationStatus?.isActive,
      slug: params.slug,
    })
    
    try {
      // Redirect to this org's dashboard
      redirect(`/dashboard/${params.slug}`)
    } catch (error) {
      // If error getting orgs, redirect to landing page to prevent loop
      console.error('ONBOARDING_REDIRECT_ERROR: Failed to redirect, redirecting to landing page', error)
      redirect('/')
    }
  }

  return (
    <div className="min-h-screen">
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

