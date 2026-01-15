import { getProjectsRegistryV19ForOrg } from '@/app/actions/projects_v19_ui';
import ProjectsRegistryClientV19 from './projects-registry-client-v19';

export default async function ProjectsRegistryV19({ orgId }: { orgId: string }) {
  const projects = await getProjectsRegistryV19ForOrg(orgId);

  return (
    <ProjectsRegistryClientV19 projects={projects} />
  );
}
