import { notFound } from 'next/navigation'
import { getResolution } from '@/app/actions/resolutions'
import { getUserOrgs } from '@/app/actions/organizations'
import { ResolutionDetailClient } from '@/components/resolutions/resolution-detail-client'

/**
 * Resolution Detail Page - Slug-based routing
 * 
 * URL: /dashboard/[slug]/resolutions/[id]
 * Security: Verifies user belongs to the org defined by [slug]
 */
async function ResolutionDetailPageContent({ slug, resolutionId }: { slug: string; resolutionId: string }) {
  // Fetch all orgs user belongs to
  const orgs = await getUserOrgs()
  
  // Find org by slug (must match exactly)
  const selectedOrg = orgs.find((org) => org.slug === slug)
  
  // If org not found or user doesn't belong to it -> 404
  if (!selectedOrg) {
    notFound()
  }

  // Get resolution
  const resolution = await getResolution(resolutionId)

  // If resolution not found or doesn't belong to org -> 404
  if (!resolution || resolution.org_id !== selectedOrg.id) {
    notFound()
  }

  return (
    <ResolutionDetailClient
      resolution={resolution}
      orgSlug={selectedOrg.slug}
    />
  )
}

export default async function ResolutionDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }> | { slug: string; id: string }
}) {
  const resolvedParams = 'then' in params ? await params : params
  const normalizedSlug = decodeURIComponent(resolvedParams.slug).trim()
  const resolutionId = resolvedParams.id

  return <ResolutionDetailPageContent slug={normalizedSlug} resolutionId={resolutionId} />
}


