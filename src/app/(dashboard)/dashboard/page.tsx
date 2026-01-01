import { redirect } from 'next/navigation'
import { getUserOrgs } from '@/app/actions/organizations'
import { isPlatformAdmin } from '@/app/actions/admin'

/**
 * Dashboard Root Page - Redirects to slug-based route
 * 
 * This route is deprecated - all dashboard access should use /dashboard/[slug] format
 * Redirects to first organization's dashboard or admin panel
 */
export default async function DashboardPage() {
  // Check if user is platform admin
  const isAdmin = await isPlatformAdmin()
  
  // If user is platform admin and has no orgs, redirect to admin panel
  if (isAdmin) {
    const orgs = await getUserOrgs()
    if (orgs.length === 0) {
      redirect('/admin')
    }
  }
  
  // Get user's organizations
  const orgs = await getUserOrgs()
  
  // Redirect to first org's dashboard using slug
  if (orgs.length > 0) {
    redirect(`/dashboard/${orgs[0].slug}`)
  }
  
  // If no orgs, redirect to login (user shouldn't be here without orgs)
  redirect('/login')
}
