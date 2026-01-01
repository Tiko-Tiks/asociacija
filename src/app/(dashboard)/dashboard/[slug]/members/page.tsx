import { notFound } from 'next/navigation'
import { listOrganizationMembers } from '@/app/actions/members'
import { getActivePositions } from '@/app/actions/positions'
import { getCurrentUser } from '@/app/actions/auth'
import { getMembershipRole } from '@/app/actions/organizations'
import { getUserOrgs } from '@/app/actions/organizations'
import { MembersListClient } from '@/components/members/members-list-client'

/**
 * Members Page - Slug-based routing
 * 
 * URL: /dashboard/[slug]/members
 * Security: Verifies user belongs to the org defined by [slug]
 */
async function MembersPageContent({ slug }: { slug: string }) {
  // Fetch all orgs user belongs to
  const orgs = await getUserOrgs()
  
  // Find org by slug (must match exactly)
  const selectedOrg = orgs.find((org) => org.slug === slug)
  
  // If org not found or user doesn't belong to it -> 404
  if (!selectedOrg) {
    notFound()
  }

  // Get current user and role for permission checks (needed to determine if we should fetch full details)
  const user = await getCurrentUser()
  const userRole = await getMembershipRole(selectedOrg.membership_id)

  const isOwner = userRole === 'OWNER'
  const currentUserId = user?.id || null

  // Fetch members with full details if OWNER
  const members = await listOrganizationMembers(selectedOrg.membership_id, isOwner)

  // Fetch active positions for all members
  const positionsMap = members.length > 0
    ? await getActivePositions(
        selectedOrg.id,
        members.map(m => m.user_id)
      )
    : new Map<string, string[]>()

  // Convert Map to object for client component serialization
  const positionsObject: Record<string, string[]> = {}
  positionsMap.forEach((positions, userId) => {
    positionsObject[userId] = positions
  })

  return (
    <MembersListClient
      members={members}
      positionsObject={positionsObject}
      orgId={selectedOrg.id}
      isOwner={isOwner}
      currentUserId={currentUserId}
    />
  )
}

export default async function MembersPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string }
}) {
  const resolvedParams = 'then' in params ? await params : params
  const normalizedSlug = decodeURIComponent(resolvedParams.slug).trim()

  return <MembersPageContent slug={normalizedSlug} />
}

