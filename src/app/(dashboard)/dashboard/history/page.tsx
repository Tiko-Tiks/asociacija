import { redirect } from 'next/navigation'
import { getUserOrgs } from '@/app/actions/organizations'

/**
 * Legacy History Page - Redirects to slug-based route
 * 
 * This route is deprecated - all dashboard access should use /dashboard/[slug]/history format
 */
export default async function HistoryPage() {
  const orgs = await getUserOrgs()
  
  if (orgs.length > 0) {
    redirect(`/dashboard/${orgs[0].slug}/history`)
  }
  
  redirect('/dashboard')
}
