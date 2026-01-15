import { redirect } from 'next/navigation'
import { getUserOrgs } from '@/app/actions/organizations'

/**
 * Legacy Voting Page - Redirects to slug-based route
 *
 * This route is deprecated - all dashboard access should use /dashboard/[slug]/voting format
 */
export default async function VotingPage() {
  const orgs = await getUserOrgs()

  if (orgs.length > 0) {
    redirect(`/dashboard/${orgs[0].slug}/voting`)
  }

  redirect('/dashboard')
}
