'use server';

import { listProjectsV19 } from '@/app/actions/projects_v19_list';
import type { ProjectV19 } from '@/types/projects_v19';

export async function getProjectsRegistryV19ForOrg(orgId: string): Promise<ProjectV19[]> {
  return listProjectsV19(orgId);
}
