import { notFound } from 'next/navigation'
import { getUserOrgs } from '@/app/actions/organizations'
import { getActiveVotesForMember } from '@/app/actions/voting'
import { ActiveVotesClient } from '@/components/voting/active-votes-client'

/**
 * Active Votes Page - Shows all open votes for members
 * 
 * URL: /dashboard/[slug]/voting
 */
async function ActiveVotesContent({
  slug,
}: {
  slug: string
}) {
  const orgs = await getUserOrgs()
  const selectedOrg = orgs.find((org) => org.slug === slug)
  
  if (!selectedOrg) {
    notFound()
  }

  const activeVotes = await getActiveVotesForMember(selectedOrg.id)

  return (
    <div className="container mx-auto px-4 py-6">
      <ActiveVotesClient 
        orgId={selectedOrg.id}
        orgSlug={selectedOrg.slug}
        initialVotes={activeVotes}
      />
    </div>
  )
}

export default async function ActiveVotesPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string }
}) {
  const resolvedParams = 'then' in params ? await params : params
  const normalizedSlug = decodeURIComponent(resolvedParams.slug).trim()

  return <ActiveVotesContent slug={normalizedSlug} />
}

