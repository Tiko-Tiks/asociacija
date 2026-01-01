import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import { PageLayout } from '@/components/layout/page-layout'
import Image from 'next/image'

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: { code?: string; next?: string }
}) {
  // Check if user is already authenticated
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is authenticated and no code in URL, redirect to dashboard
  if (user && !searchParams?.code) {
    redirect('/dashboard')
  }

  // If no code in URL, redirect to login
  if (!searchParams?.code) {
    redirect('/login?error=missing_reset_token')
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
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Atkurti slaptažodį</h1>
            <p className="text-slate-600">Įveskite naują slaptažodį</p>
          </div>
          <ResetPasswordForm code={searchParams.code} next={searchParams.next} />
        </div>
      </div>
    </PageLayout>
  )
}

