import { notFound } from 'next/navigation'
import { listBusinessEvents } from '@/app/actions/history'
import { getUserOrgs } from '@/app/actions/organizations'
import { AuditLogClient } from '@/components/history/audit-log-client'

/**
 * History Page - Slug-based routing
 * 
 * URL: /dashboard/[slug]/history
 * Security: Verifies user belongs to the org defined by [slug]
 */
async function AuditLogContent({
  slug,
  page,
}: {
  slug: string
  page?: number
}) {
  // Fetch all orgs user belongs to
  const orgs = await getUserOrgs()
  
  // Find org by slug (must match exactly)
  const selectedOrg = orgs.find((org) => org.slug === slug)
  
  // If org not found or user doesn't belong to it -> 404
  if (!selectedOrg) {
    notFound()
  }

  const currentPage = page || 1
  const data = await listBusinessEvents(selectedOrg.membership_id, currentPage, 50)

  return (
    <AuditLogClient
      initialData={data}
      membershipId={selectedOrg.membership_id}
      orgSlug={selectedOrg.slug}
    />
  )
}

export default async function HistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }> | { slug: string }
  searchParams?: { page?: string }
}) {
  const resolvedParams = 'then' in params ? await params : params
  const normalizedSlug = decodeURIComponent(resolvedParams.slug).trim()
  const page = searchParams?.page ? parseInt(searchParams.page, 10) : undefined

  return <AuditLogContent slug={normalizedSlug} page={page} />
}

