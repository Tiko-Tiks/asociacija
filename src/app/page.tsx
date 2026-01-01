import Image from 'next/image'
import Link from 'next/link'
import { resolveMembershipState, getCurrentUser } from '@/app/actions/auth'
import { getUserOrgs } from '@/app/actions/organizations'
import { getPublicOrganizationsRegistry } from '@/app/actions/public-registry'
import { MembershipState } from '@/app/domain/membership-state'
import { LandingHeader } from '@/components/landing/landing-header'
import { HeroSectionWrapper } from '@/components/landing/hero-section-wrapper'
import { DefinitionSectionWrapper } from '@/components/landing/definition-section-wrapper'
import { ProcessSection } from '@/components/landing/process-section'
import { RegistrySection } from '@/components/landing/registry-section'
import { LegalSectionWrapper } from '@/components/landing/legal-section-wrapper'
import { NewsSection } from '@/components/landing/news-section'

/**
 * Main Landing Page (v18.8 Specification)
 * 
 * Institutional Trust Design Philosophy:
 * - Stable Institution, not a startup product
 * - No flashy animations, no marketing fluff
 * - Clean, authoritative, accessible (WCAG 2.2)
 * 
 * State Machine Logic:
 * - Guest: Show "Prisijungti" and "Registruoti" buttons
 * - Authenticated: Show user dropdown with logout option
 * 
 * Sections:
 * 1. Hero (Institutional)
 * 2. Definition ("Kas tai yra")
 * 3. How It Works (Process)
 * 4. Accredited Nodes Registry
 * 5. Legal Base ("Teisinis Pamatas")
 * 6. Institutional News
 * 7. Footer (via PageLayout)
 */
export default async function Home() {
  // Step 1: Resolve membership state and user info (single source of truth)
  let state: MembershipState
  let isAuthenticated = false
  let userName: string | undefined
  let userEmail: string | undefined
  let dashboardUrl: string | undefined

  try {
    state = await resolveMembershipState()
    isAuthenticated = state !== 'UNAUTHENTICATED'

    // If user is authenticated, redirect to appropriate dashboard
    if (isAuthenticated) {
      try {
        const user = await getCurrentUser()
        if (user) {
          // Get user name from profile (if available)
          // Note: We don't expose email in public contexts per privacy rules
          // But we can use it in authenticated header for user identification
          userEmail = user.email || undefined
          // userName would come from profiles table, but we'll use email for now
          userName = user.email?.split('@')[0] || undefined
        }

        // Determine redirect destination based on user's membership state
        // Priority: User's organization dashboard > Admin panel
        if (state === 'MEMBERSHIP_ACTIVE') {
          try {
            const orgs = await getUserOrgs()
            const firstOrg = orgs.length > 0 ? orgs[0] : null
            if (firstOrg?.slug) {
              dashboardUrl = `/dashboard/${firstOrg.slug}`
              // Redirect to dashboard
              const { redirect } = await import('next/navigation')
              redirect(dashboardUrl)
            }
          } catch (error) {
            // If redirect throws (NEXT_REDIRECT), re-throw it
            if ((error as any)?.digest?.startsWith('NEXT_REDIRECT')) {
              throw error
            }
            console.error('Error fetching orgs for dashboard URL:', error)
          }
        } else if (state === 'AUTHENTICATED_NO_MEMBERSHIP') {
          // Check if user is platform admin (super admin or branduolys owner)
          // If yes, redirect to admin panel
          try {
            const { isPlatformAdmin } = await import('@/app/actions/admin')
            const isAdmin = await isPlatformAdmin()
            if (isAdmin) {
              dashboardUrl = '/admin'
              // Redirect to admin panel
              const { redirect } = await import('next/navigation')
              redirect(dashboardUrl)
            }
          } catch (error) {
            // If redirect throws (NEXT_REDIRECT), re-throw it
            if ((error as any)?.digest?.startsWith('NEXT_REDIRECT')) {
              throw error
            }
            console.error('Error checking platform admin status:', error)
          }
        }
      } catch (error) {
        // If redirect throws (NEXT_REDIRECT), re-throw it
        if ((error as any)?.digest?.startsWith('NEXT_REDIRECT')) {
          throw error
        }
        console.error('Error fetching user info:', error)
      }
    }
  } catch (error) {
    // If redirect throws (NEXT_REDIRECT), re-throw it
    if ((error as any)?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    // On error, default to UNAUTHENTICATED (show public page)
    console.error('Error resolving membership state:', error)
    state = 'UNAUTHENTICATED'
    isAuthenticated = false
  }

  // Step 2: Fetch public registry data
  const publicOrganizations = await getPublicOrganizationsRegistry()

  // Step 3: Render landing page with optimized header and sections
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Optimized Header with auth state */}
      <LandingHeader
        isAuthenticated={isAuthenticated}
        userName={userName}
        userEmail={userEmail}
        dashboardUrl={dashboardUrl}
      />

      <main className="flex-1">
        {/* Section 1: Hero (Institutional) - No CTA buttons */}
        <HeroSectionWrapper />

        {/* Section 2: Definition ("Kas tai yra") */}
        <DefinitionSectionWrapper />

        {/* Section 3: How It Works (Process) */}
        <ProcessSection />

        {/* Section 4: Accredited Nodes Registry */}
        <RegistrySection organizations={publicOrganizations} />

        {/* Section 5: Legal Base ("Teisinis Pamatas") */}
        <LegalSectionWrapper />

        {/* Section 6: Institutional News */}
        <NewsSection />
      </main>

      {/* Footer */}
      <footer className="border-t bg-slate-50 py-12 mt-auto">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Image
                  src="/logo.svg"
                  alt="Logo"
                  width={40}
                  height={40}
                  className="h-10 w-10"
                />
                <h3 className="font-bold text-slate-900">Bendruomenių Branduolys</h3>
              </div>
              <p className="text-sm text-slate-600">
                Lietuvos bendruomenių valdymo platforma
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Nuorodos</h4>
              <ul className="space-y-2 text-sm">
                {!isAuthenticated && (
                  <>
                    <li>
                      <Link href="/login" className="text-slate-600 hover:text-slate-900">
                        Prisijungti
                      </Link>
                    </li>
                    <li>
                      <Link href="/register-community" className="text-slate-600 hover:text-slate-900">
                        Registruoti bendruomenę
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Kontaktai</h4>
              <p className="text-sm text-slate-600">
                asociacija.net
              </p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-slate-600">
            <p>© {new Date().getFullYear()} Lietuvos Bendruomenių Branduolys. Visos teisės saugomos.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
