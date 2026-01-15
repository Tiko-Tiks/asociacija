/**
 * TEST USER MANAGEMENT PAGE
 * 
 * Admin page for managing test users during development.
 * Only accessible to OWNER role.
 * 
 * Route: /dashboard/[slug]/admin/test-users
 * 
 * Features:
 * - Create test users
 * - View test users
 * - Statistics dashboard
 * - Cleanup functionality
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/app/actions/_guards'
import { MEMBERSHIP_ROLE, MEMBERSHIP_STATUS } from '@/app/domain/constants'
import { TestUserManagement } from '@/components/admin/test-user-management'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

interface PageProps {
  params: {
    slug: string
  }
}

export default async function TestUserManagementPage({ params }: PageProps) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Get organization
  const { data: org, error: orgError }: any = await supabase
    .from('orgs')
    .select('id, name, slug')
    .eq('slug', params.slug)
    .single()

  if (orgError || !org) {
    redirect('/dashboard')
  }

  // Verify user is OWNER
  const { data: membership, error: membershipError }: any = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('org_id', org.id)
    .eq('status', MEMBERSHIP_STATUS.ACTIVE)
    .maybeSingle()

  if (membershipError || !membership || membership.role !== MEMBERSHIP_ROLE.OWNER) {
    redirect(`/dashboard/${params.slug}`)
  }

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link 
          href={`/dashboard/${params.slug}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>
      </div>

      {/* Main Content */}
      <TestUserManagement orgId={org.id} />
    </div>
  )
}

export const metadata = {
  title: 'Test User Management',
  description: 'Manage test users for development and testing',
}

