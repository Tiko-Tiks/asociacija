import { notFound, redirect } from 'next/navigation'
import { listProjects } from '@/app/actions/projects'
import { getUserOrgs, getMembershipRole } from '@/app/actions/organizations'
import { ProjectsListClient } from '@/components/projects/projects-list-client'
import { isPilotMode } from '@/lib/pilot-mode'

/**
 * Projects Page - Slug-based routing
 * 
 * URL: /dashboard/[slug]/projects
 * Security: Verifies user belongs to the org defined by [slug]
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

  // Fetch projects and user role
  const [projects, userRole] = await Promise.all([
    listProjects(selectedOrg.id),
    getMembershipRole(selectedOrg.membership_id),
  ])

  // Ensure projects is always an array
  const projectsList = Array.isArray(projects) ? projects : []

  // MEMBER users: Do not render Projects page unless at least one project exists
  if (userRole === 'MEMBER' && projectsList.length === 0) {
    return null
  }

  // OWNER users: Always render page, even with empty projects
  const pilotMode = isPilotMode(selectedOrg.slug)
  
  return (
    <ProjectsListClient
      projects={projectsList}
      membershipId={selectedOrg.membership_id}
      orgId={selectedOrg.id}
      orgSlug={selectedOrg.slug}
      userRole={userRole}
      pilotMode={pilotMode}
    />
  )
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

