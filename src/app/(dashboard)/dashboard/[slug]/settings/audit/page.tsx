import { notFound } from 'next/navigation'
import { listAuditLogs } from '@/app/actions/audit-logs'
import { getUserOrgs, getMembershipRole } from '@/app/actions/organizations'
import { AuditLogsClient } from '@/components/audit/audit-logs-client'

/**
 * Audit Logs Page - Slug-based routing
 * 
 * URL: /dashboard/[slug]/settings/audit
 * Security: Verifies user belongs to the org defined by [slug]
 */
async function AuditLogsPageContent({ slug }: { slug: string }) {
  // Fetch all orgs user belongs to
  const orgs = await getUserOrgs()
  
  // Find org by slug (must match exactly)
  const selectedOrg = orgs.find((org) => org.slug === slug)
  
  // If org not found or user doesn't belong to it -> 404
  if (!selectedOrg) {
    notFound()
  }

  // Check user role
  const userRole = await getMembershipRole(selectedOrg.membership_id)
  const isOwner = userRole === 'OWNER'

  // Fetch audit logs (will return empty if not OWNER)
  const { logs, total } = await listAuditLogs(selectedOrg.id, 50, 0)

  return (
    <AuditLogsClient
      logs={logs}
      total={total}
      isOwner={isOwner}
      orgId={selectedOrg.id}
    />
  )
}

export default async function AuditLogsPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string }
}) {
  const resolvedParams = 'then' in params ? await params : params
  const normalizedSlug = decodeURIComponent(resolvedParams.slug).trim()

  return <AuditLogsPageContent slug={normalizedSlug} />
}

