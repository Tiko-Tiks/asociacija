'use server';

import { createClient } from '@/lib/supabase/server';
import { ProjectV19, ProjectMetadata, isProjectV19 } from '@/types/projects_v19';

/**
 * Projects Registry v19.0 — READ-ONLY
 *
 * Lists projects derived from APPROVED resolutions
 * that contain project metadata.
 *
 * Governance rules:
 * - NO project creation
 * - NO project modification
 * - NO legacy tables
 * - Metadata-only projection
 */
export async function listProjectsV19(orgId: string): Promise<ProjectV19[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('resolutions')
    .select('id, title, metadata, created_at')
    .eq('org_id', orgId)
    .eq('status', 'APPROVED')
    .not('metadata->project', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[listProjectsV19] Failed to load projects registry', error);
    throw new Error('Failed to load projects registry');
  }

  if (!data) return [];

  const projects: ProjectV19[] = [];

  for (const row of data) {
    if (!isProjectV19(row.metadata)) {
      // Defensive: should not happen due to query filter,
      // but prevents malformed metadata from leaking.
      continue;
    }

    projects.push({
      resolution_id: row.id,
      title: row.title,
      metadata: row.metadata as ProjectMetadata,
      created_at: row.created_at,
    });
  }

  return projects;
}
