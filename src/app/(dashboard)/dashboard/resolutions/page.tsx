import { redirect } from 'next/navigation'
import { getUserOrgs } from '@/app/actions/organizations'

/**
 * Legacy Resolutions Page - Redirects to slug-based route
 * 
 * This route is deprecated - all dashboard access should use /dashboard/[slug]/resolutions format
 */
export default async function ResolutionsPage() {
  const orgs = await getUserOrgs()
  
  if (orgs.length > 0) {
    redirect(`/dashboard/${orgs[0].slug}/resolutions`)
  }
  
  redirect('/dashboard')
}
