import { notFound } from 'next/navigation'
import { listResolutions } from '@/app/actions/resolutions'
import { getUserOrgs, getMembershipRole } from '@/app/actions/organizations'
import { checkBoardPosition } from '@/app/actions/check-board-position'
import { ResolutionsClient } from '@/components/resolutions/resolutions-client'

/**
 * Resolutions Page - Slug-based routing
 * 
 * URL: /dashboard/[slug]/resolutions
 * Security: Verifies user belongs to the org defined by [slug]
 */
async function ResolutionsPageContent({ slug }: { slug: string }) {
  // Fetch all orgs user belongs to
  const orgs = await getUserOrgs()
  
  // Find org by slug (must match exactly)
  const selectedOrg = orgs.find((org) => org.slug === slug)
  
  // If org not found or user doesn't belong to it -> 404
  if (!selectedOrg) {
    notFound()
  }

  const [resolutions, userRole, isBoard] = await Promise.all([
    listResolutions(selectedOrg.id),
    getMembershipRole(selectedOrg.membership_id),
    checkBoardPosition(selectedOrg.id),
  ])

  const isOwner = userRole === 'OWNER'

  return (
    <ResolutionsClient
      resolutions={resolutions}
      orgId={selectedOrg.id}
      orgSlug={selectedOrg.slug}
      isOwner={isOwner}
      isBoard={isBoard}
    />
  )
}

export default async function ResolutionsPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string }
}) {
  const resolvedParams = 'then' in params ? await params : params
  const normalizedSlug = decodeURIComponent(resolvedParams.slug).trim()

  return <ResolutionsPageContent slug={normalizedSlug} />
}

