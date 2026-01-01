import { redirect } from 'next/navigation'
import { getCurrentUser, login } from '@/app/actions/auth'
import { LoginForm } from '@/components/auth/login-form'
import { PageLayout } from '@/components/layout/page-layout'
import Image from 'next/image'

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { redirect?: string; session?: string; password_reset?: string; error?: string }
}) {
  // Check if user is already authenticated
  // getCurrentUser() handles expired sessions gracefully (returns null)
  // This prevents redirect loops when sessions expire
  const user = await getCurrentUser()
  
  if (user) {
    // User is already authenticated - redirect to appropriate destination
    const redirectTo = searchParams?.redirect
    
    if (redirectTo) {
      // Use provided redirect parameter
      redirect(decodeURIComponent(redirectTo))
    } else {
      // Determine redirect based on user's membership state
      try {
        // Check if user has active memberships
        const { getUserOrgs } = await import('@/app/actions/organizations')
        const orgs = await getUserOrgs()
        
        if (orgs.length > 0) {
          // User has organizations - redirect to first organization's dashboard
          const firstOrg = orgs[0]
          if (firstOrg?.slug) {
            redirect(`/dashboard/${firstOrg.slug}`)
          }
        }

        // Check if user is platform admin (super admin or branduolys owner)
        const { isPlatformAdmin } = await import('@/app/actions/admin')
        const isAdmin = await isPlatformAdmin()
        if (isAdmin) {
          redirect('/admin')
        }
      } catch (error) {
        // If error determining redirect, fall back to landing page
        console.error('Error determining redirect destination:', error)
      }
      
      // Fallback: Redirect to landing page
      redirect('/')
    }
  }

  // TERMINAL: No user, renders login form (no redirect)
  // Check if this is a session expiry redirect
  const isSessionExpired = searchParams?.session === 'expired'
  const passwordResetSuccess = searchParams?.password_reset === 'success'
  const hasError = searchParams?.error === 'missing_reset_token'

  return (
    <PageLayout showHeader={true} showFooter={false}>
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Image
              src="/logo.svg"
              alt="Bendruomenių Branduolys"
              width={80}
              height={80}
              className="mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Prisijungti</h1>
            <p className="text-slate-600">Prisijunkite prie savo paskyros</p>
          </div>
          <LoginForm 
            loginAction={login} 
            showSessionExpiredMessage={isSessionExpired}
            showPasswordResetSuccess={passwordResetSuccess}
            showError={hasError}
            redirectTo={searchParams?.redirect}
          />
        </div>
      </div>
    </PageLayout>
  )
}
