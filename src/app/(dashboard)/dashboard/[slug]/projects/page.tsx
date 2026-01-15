import { notFound } from 'next/navigation'
import { getUserOrgs } from '@/app/actions/organizations'
import ProjectsRegistryList from '@/components/projects/ProjectsRegistryList'

/**
 * Projects Page - Slug-based routing
 * 
 * URL: /dashboard/[slug]/projects
 * Security: Verifies user belongs to the org defined by [slug]
 * 
 * Projects Registry v19.0 — Read-only view of projects
 * derived from APPROVED resolutions.
 */
async function ProjectsListContent({ slug }: { slug: string }) {
  // Fetch all orgs user belongs to
  const orgs = await getUserOrgs()
  
  // Find org by slug (must match exactly)
  const selectedOrg = orgs.find((org) => org.slug === slug)
  
  // If org not found or user doesn't belong to it -> 404
  if (!selectedOrg) {
    notFound()
  }

  return <ProjectsRegistryList orgId={selectedOrg.id} orgSlug={slug} />
}

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string }
}) {
  const resolvedParams = 'then' in params ? await params : params
  const normalizedSlug = decodeURIComponent(resolvedParams.slug).trim()

  return <ProjectsListContent slug={normalizedSlug} />
}

