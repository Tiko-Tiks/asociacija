import { notFound } from 'next/navigation'
import { getUserOrgs, getMembershipRole } from '@/app/actions/organizations'
import { checkBoardPosition } from '@/app/actions/check-board-position'
import { IdeaDetail } from '@/components/ideas/idea-detail'
import { MEMBERSHIP_ROLE } from '@/app/domain/constants'

export default async function IdeaDetailPage({
  params,
}: {
  params: Promise<{ slug: string; ideaId: string }> | { slug: string; ideaId: string }
}) {
  const resolvedParams = 'then' in params ? await params : params
  const normalizedSlug = decodeURIComponent(resolvedParams.slug).trim()

  const orgs = await getUserOrgs()
  const selectedOrg = orgs.find((org) => org.slug === normalizedSlug)

  if (!selectedOrg) {
    notFound()
  }

  const [userRole, isBoard] = await Promise.all([
    getMembershipRole(selectedOrg.membership_id),
    checkBoardPosition(selectedOrg.id),
  ])

  const isOwner = userRole === MEMBERSHIP_ROLE.OWNER

  return (
    <div className="container mx-auto px-4 py-6">
      <IdeaDetail
        ideaId={resolvedParams.ideaId}
        orgId={selectedOrg.id}
        orgSlug={selectedOrg.slug}
        isOwner={isOwner}
        isBoard={isBoard}
      />
    </div>
  )
}

