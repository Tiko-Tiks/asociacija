import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DebtorsDashboard } from '@/components/finance/debtors-dashboard'

interface DebtorsPageProps {
  params: {
    slug: string
  }
}

export default async function DebtorsPage({ params }: DebtorsPageProps) {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get organization by slug
  const { data: org, error: orgError } = await supabase
    .from('orgs')
    .select('id, slug, name')
    .eq('slug', params.slug)
    .single()

  if (orgError || !org) {
    console.error('[DebtorsPage] Org not found:', orgError)
    redirect('/dashboard')
  }

  // Get user's membership
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select('id, role, member_status')
    .eq('org_id', org.id)
    .eq('user_id', user.id)
    .single()

  if (membershipError || !membership) {
    console.error('[DebtorsPage] Membership not found:', membershipError)
    redirect('/dashboard')
  }

  console.log('[DebtorsPage] Loaded:', { 
    org: org.slug, 
    user: user.id, 
    role: membership.role 
  })

  // Only OWNER can access
  if (membership.role !== 'OWNER') {
    console.log('[DebtorsPage] Not OWNER, redirecting')
    redirect(`/dashboard/${params.slug}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mokėjimų valdymas</h1>
        <p className="text-muted-foreground mt-2">
          Narių mokėjimų būklė ir skolininkų valdymas
        </p>
      </div>

      <DebtorsDashboard orgId={org.id} orgSlug={org.slug} />
    </div>
  )
}
