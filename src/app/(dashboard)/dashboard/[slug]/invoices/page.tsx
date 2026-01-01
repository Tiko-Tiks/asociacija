import { notFound } from 'next/navigation'
import { listOrganizationInvoices } from '@/app/actions/invoices'
import { getUserOrgs, getMembershipRole } from '@/app/actions/organizations'
import { InvoicesPageClient } from '@/components/invoices/invoices-page-client'
import { isPilotMode } from '@/lib/pilot-mode'

/**
 * Invoices Page - Slug-based routing
 * 
 * URL: /dashboard/[slug]/invoices
 * Security: Verifies user belongs to the org defined by [slug]
 */
async function InvoicesPageContent({ slug }: { slug: string }) {
  // Fetch all orgs user belongs to
  const orgs = await getUserOrgs()
  
  // Find org by slug (must match exactly)
  const selectedOrg = orgs.find((org) => org.slug === slug)
  
  // If org not found or user doesn't belong to it -> 404
  if (!selectedOrg) {
    notFound()
  }

  const [invoices, userRole] = await Promise.all([
    listOrganizationInvoices(selectedOrg.membership_id),
    getMembershipRole(selectedOrg.membership_id),
  ])

  // Pilot Mode check
  const pilotMode = isPilotMode(selectedOrg.slug)
  
  return (
    <InvoicesPageClient
      invoices={invoices}
      membershipId={selectedOrg.membership_id}
      userRole={userRole}
      pilotMode={pilotMode}
    />
  )
}

export default async function InvoicesPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string }
}) {
  const resolvedParams = 'then' in params ? await params : params
  const normalizedSlug = decodeURIComponent(resolvedParams.slug).trim()

  return <InvoicesPageContent slug={normalizedSlug} />
}

