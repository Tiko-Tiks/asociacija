import { redirect } from 'next/navigation'
import { getCurrentUser, signup } from '@/app/actions/auth'
import { RegisterForm } from '@/components/auth/register-form'
import { PageLayout } from '@/components/layout/page-layout'
import { Logo } from '@/components/ui/logo'
import { logoConfig } from '@/lib/logo-config'

export default async function RegisterPage() {
  // Check if user is already authenticated
  const user = await getCurrentUser()
  
  if (user) {
    // User is already authenticated - redirect to appropriate destination
    try {
      const { getUserOrgs } = await import('@/app/actions/organizations')
      const orgs = await getUserOrgs()
      
      if (orgs.length > 0 && orgs[0]?.slug) {
        redirect(`/dashboard/${orgs[0].slug}`)
      }

      const { isPlatformAdmin } = await import('@/app/actions/admin')
      const isAdmin = await isPlatformAdmin()
      if (isAdmin) {
        redirect('/admin')
      }
    } catch (error) {
      console.error('Error determining redirect destination:', error)
    }
    
    redirect('/')
  }

  return (
    <PageLayout showHeader={true} showFooter={false}>
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Logo
                variant="icon"
                size="xl"
                showText={false}
                customIconPath={logoConfig.useCustomLogos ? logoConfig.iconLogoPath : undefined}
              />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Registruotis</h1>
            <p className="text-slate-600">Sukurkite naują paskyrą</p>
          </div>
          <RegisterForm signupAction={signup} />
        </div>
      </div>
    </PageLayout>
  )
}

