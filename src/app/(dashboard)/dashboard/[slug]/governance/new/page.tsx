import { notFound, redirect } from 'next/navigation'
import { getActiveRuleset } from '@/app/actions/governance'
import { getUserOrgs } from '@/app/actions/organizations'
import { CreateMeetingClient } from '@/components/governance/create-meeting-client'

/**
 * Create Meeting Page - Slug-based routing
 * 
 * URL: /dashboard/[slug]/governance/new
 * Security: Verifies user belongs to the org defined by [slug]
 */
async function CreateMeetingContent({ slug }: { slug: string }) {
  // Fetch all orgs user belongs to
  const orgs = await getUserOrgs()
  
  // Find org by slug (must match exactly)
  const selectedOrg = orgs.find((org) => org.slug === slug)
  
  // If org not found or user doesn't belong to it -> 404
  if (!selectedOrg) {
    notFound()
  }

  const ruleset = await getActiveRuleset(selectedOrg.membership_id)

  return (
    <CreateMeetingClient
      ruleset={ruleset}
      membershipId={selectedOrg.membership_id}
      orgSlug={selectedOrg.slug}
    />
  )
}

export default async function CreateMeetingPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string }
}) {
  const resolvedParams = 'then' in params ? await params : params
  const normalizedSlug = decodeURIComponent(resolvedParams.slug).trim()

  return <CreateMeetingContent slug={normalizedSlug} />
}

