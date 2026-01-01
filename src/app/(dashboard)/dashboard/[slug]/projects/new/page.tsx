import { notFound, redirect } from 'next/navigation'
import { getUserOrgs } from '@/app/actions/organizations'
import { CreateProjectClient } from '@/components/projects/create-project-client'

/**
 * Create Project Page - Slug-based routing
 * 
 * URL: /dashboard/[slug]/projects/new
 * Security: Verifies user belongs to the org defined by [slug]
 */
async function CreateProjectContent({ slug }: { slug: string }) {
  // Fetch all orgs user belongs to
  const orgs = await getUserOrgs()
  
  // Find org by slug (must match exactly)
  const selectedOrg = orgs.find((org) => org.slug === slug)
  
  // If org not found or user doesn't belong to it -> 404
  if (!selectedOrg) {
    notFound()
  }

  return (
    <CreateProjectClient membershipId={selectedOrg.membership_id} />
  )
}

export default async function CreateProjectPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string }
}) {
  const resolvedParams = 'then' in params ? await params : params
  const normalizedSlug = decodeURIComponent(resolvedParams.slug).trim()

  return <CreateProjectContent slug={normalizedSlug} />
}

