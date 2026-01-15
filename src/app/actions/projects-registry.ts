'use server';

import { createClient } from '@/lib/supabase/server';

export interface ProjectRegistryItem {
  resolution_id: string;
  title: string;
  approved_at: string;
  project: {
    phase?: string;
    code?: string;
    tag?: string;
    tags?: string[];
  };
  indicator?: {
    progress?: number;
    budget_planned?: number;
    budget_spent?: number;
  };
}

/**
 * Check if metadata contains project data (supports both flat and nested formats)
 * 
 * Flat format (v19 canonical): metadata['project.phase'] = 'active'
 * Nested format (legacy): metadata.project.phase = 'active'
 * 
 * Also checks for project.tag as fallback indicator
 */
function hasProjectMetadata(metadata: any): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  
  // Check flat format first (v19 canonical)
  if (typeof metadata['project.phase'] === 'string') {
    return true;
  }
  
  // Check flat format with project.tag (alternative v19)
  if (typeof metadata['project.tag'] === 'string') {
    return true;
  }
  
  // Check nested format (legacy compatibility)
  if (typeof metadata.project === 'object') {
    if (typeof metadata.project.phase === 'string' || typeof metadata.project.tag === 'string') {
      return true;
    }
  }
  
  // Check for any project.* keys (broad fallback)
  const keys = Object.keys(metadata);
  for (const key of keys) {
    if (key.startsWith('project.')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Extract project data from metadata (supports both formats)
 */
function extractProjectData(metadata: any): { 
  phase?: string; 
  code?: string; 
  tag?: string;
  tags?: string[];
} {
  // Try flat format first (v19 canonical)
  const flatPhase = metadata['project.phase'];
  const flatCode = metadata['project.code'];
  const flatTag = metadata['project.tag'];
  const flatTags = metadata['project.tags'];
  
  if (flatPhase || flatCode || flatTag) {
    return {
      phase: typeof flatPhase === 'string' ? flatPhase : undefined,
      code: typeof flatCode === 'string' ? flatCode : undefined,
      tag: typeof flatTag === 'string' ? flatTag : undefined,
      tags: Array.isArray(flatTags) ? flatTags : undefined,
    };
  }
  
  // Nested format (legacy)
  if (typeof metadata.project === 'object') {
    return {
      phase: metadata.project.phase,
      code: metadata.project.code,
      tag: metadata.project.tag,
      tags: metadata.project.tags,
    };
  }
  
  return {};
}

/**
 * Extract indicator data from metadata (supports both formats)
 */
function extractIndicatorData(metadata: any): {
  progress?: number;
  budget_planned?: number;
  budget_spent?: number;
} | undefined {
  // Flat format (v19 canonical)
  const flatProgress = metadata['indicator.progress'];
  const flatBudgetPlanned = metadata['indicator.budget_planned'];
  const flatBudgetSpent = metadata['indicator.budget_spent'];
  
  if (flatProgress !== undefined || flatBudgetPlanned !== undefined || flatBudgetSpent !== undefined) {
    return {
      progress: typeof flatProgress === 'number' ? flatProgress : undefined,
      budget_planned: typeof flatBudgetPlanned === 'number' ? flatBudgetPlanned : undefined,
      budget_spent: typeof flatBudgetSpent === 'number' ? flatBudgetSpent : undefined,
    };
  }
  
  // Nested format (legacy)
  if (typeof metadata.indicator === 'object') {
    return {
      progress: metadata.indicator.progress,
      budget_planned: metadata.indicator.budget_planned,
      budget_spent: metadata.indicator.budget_spent,
    };
  }
  
  return undefined;
}

/**
 * List projects from APPROVED resolutions with project metadata
 * 
 * v19.0 Projects Registry - READ-ONLY
 * 
 * Supports both metadata formats:
 * - Flat (v19): metadata['project.phase'], metadata['indicator.progress']
 * - Nested (legacy): metadata.project.phase, metadata.indicator.progress
 */
export async function listProjectsRegistry(orgId: string): Promise<ProjectRegistryItem[]> {
  const supabase = await createClient();

  // Query APPROVED resolutions
  // We fetch all and filter in memory because we need to support both metadata formats
  const { data, error } = await supabase
    .from('resolutions')
    .select('id, title, metadata, created_at, adopted_at')
    .eq('org_id', orgId)
    .eq('status', 'APPROVED')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[listProjectsRegistry] Failed to load projects registry', error);
    throw new Error('Failed to load projects registry');
  }

  if (!data) {
    console.log('[listProjectsRegistry] No data returned for org:', orgId);
    return [];
  }

  console.log('[listProjectsRegistry] Found', data.length, 'APPROVED resolutions for org:', orgId);

  const projects: ProjectRegistryItem[] = [];

  for (const row of data) {
    console.log('[listProjectsRegistry] Checking resolution:', row.id, 'metadata:', JSON.stringify(row.metadata));
    
    if (!hasProjectMetadata(row.metadata)) {
      console.log('[listProjectsRegistry] No project metadata in resolution:', row.id);
      continue;
    }

    const projectData = extractProjectData(row.metadata);
    const indicatorData = extractIndicatorData(row.metadata);

    console.log('[listProjectsRegistry] Found project:', row.title, 'phase:', projectData.phase);

    projects.push({
      resolution_id: row.id,
      title: row.title,
      approved_at: row.adopted_at || row.created_at,
      project: projectData,
      indicator: indicatorData,
    });
  }

  console.log('[listProjectsRegistry] Total projects found:', projects.length);
  return projects;
}
