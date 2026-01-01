import { redirect } from 'next/navigation'
import { getUserOrgs } from '@/app/actions/organizations'

/**
 * Legacy Projects Page - Redirects to slug-based route
 * 
 * This route is deprecated - all dashboard access should use /dashboard/[slug]/projects format
 */
export default async function ProjectsPage() {
  const orgs = await getUserOrgs()
  
  if (orgs.length > 0) {
    redirect(`/dashboard/${orgs[0].slug}/projects`)
  }
  
  redirect('/dashboard')
}
