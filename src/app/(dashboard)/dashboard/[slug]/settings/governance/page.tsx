import { notFound } from 'next/navigation'
import { getUserOrgs } from '@/app/actions/organizations'
import { getOrgCompliance, validateOrgCompliance } from '@/app/actions/governance-compliance'
import { GovernanceFixPageClient } from '@/components/governance/governance-fix-page-client'

/**
 * Governance Settings / Fix Page
 * 
 * URL: /dashboard/[slug]/settings/governance?fix=1
 * Shows compliance issues and allows fixing them
 */
async function GovernanceSettingsContent({ slug }: { slug: string }) {
  const orgs = await getUserOrgs()
  const selectedOrg = orgs.find((org) => org.slug === slug)

  if (!selectedOrg) {
    notFound()
  }

  // Get compliance status
  const compliance = await getOrgCompliance(selectedOrg.id)
  const validation = await validateOrgCompliance(selectedOrg.id)

  return (
    <GovernanceFixPageClient
      orgId={selectedOrg.id}
      orgSlug={selectedOrg.slug}
      compliance={compliance}
      validation={validation}
    />
  )
}

export default async function GovernanceSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }> | { slug: string }
  searchParams: Promise<{ fix?: string }> | { fix?: string }
}) {
  const resolvedParams = 'then' in params ? await params : params
  const resolvedSearchParams = 'then' in searchParams ? await searchParams : searchParams
  const normalizedSlug = decodeURIComponent(resolvedParams.slug).trim()

  return <GovernanceSettingsContent slug={normalizedSlug} />
}

