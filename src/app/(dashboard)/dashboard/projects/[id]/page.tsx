import { redirect } from 'next/navigation'
import { getProject } from '@/app/actions/projects'
import { getUserOrgs } from '@/app/actions/organizations'

/**
 * Legacy Project Details Page - Redirects to slug-based route
 * 
 * This route is deprecated - all dashboard access should use /dashboard/[slug]/projects/[id] format
 */
export default async function ProjectDetailsPage({
  params,
}: {
  params: { id: string }
}) {
  // Get project to find org
  const project = await getProject(params.id)
  
  if (!project) {
    redirect('/dashboard')
  }
  
  // Find org by project's org_id
  const orgs = await getUserOrgs()
  const org = orgs.find((o) => o.id === project.org_id)
  
  if (org) {
    redirect(`/dashboard/${org.slug}/projects/${params.id}`)
  }
  
  redirect('/dashboard')
}
