import { redirect } from 'next/navigation'
import { getUserOrgs } from '@/app/actions/organizations'

/**
 * Legacy Governance Page - Redirects to slug-based route
 * 
 * This route is deprecated - all dashboard access should use /dashboard/[slug]/governance format
 */
export default async function GovernancePage() {
  const orgs = await getUserOrgs()
  
  if (orgs.length > 0) {
    redirect(`/dashboard/${orgs[0].slug}/governance`)
  }
  
  redirect('/dashboard')
}
