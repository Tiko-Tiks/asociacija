'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAuth } from './_guards';
import { authViolation, crossOrgViolation, operationFailed } from '@/app/domain/errors';
import { getMembershipRole } from './organizations';
import { checkBoardPosition } from './check-board-position';
import { MEMBERSHIP_ROLE } from '@/app/domain/constants';

/**
 * Update project progress indicator
 * 
 * Validates: BOARD position or CHAIR role
 * Only updates indicator.progress (0..1)
 * Does NOT modify project.phase or resolution status
 */
export async function updateProjectProgress(
  resolutionId: string,
  progress: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await requireAuth(supabase);

  // Validate progress range
  if (typeof progress !== 'number' || progress < 0 || progress > 1) {
    return {
      success: false,
      error: 'Progress must be a number between 0 and 1',
    };
  }

  // Get resolution to find orgId
  const { data: resolution, error: resolutionError } = await supabase
    .from('resolutions')
    .select('org_id, status, metadata')
    .eq('id', resolutionId)
    .single();

  if (resolutionError || !resolution) {
    if (resolutionError?.code === '42501') {
      authViolation();
    }
    return {
      success: false,
      error: 'Resolution not found',
    };
  }

  // Verify resolution is APPROVED
  if (resolution.status !== 'APPROVED') {
    return {
      success: false,
      error: 'Can only update indicators for APPROVED resolutions',
    };
  }

  // Verify resolution has project metadata
  if (!resolution.metadata || typeof resolution.metadata !== 'object') {
    return {
      success: false,
      error: 'Resolution does not contain project metadata',
    };
  }

  const metadata = resolution.metadata as any;
  if (!metadata.project || typeof metadata.project !== 'object') {
    return {
      success: false,
      error: 'Resolution does not contain project metadata',
    };
  }

  // Get user's membership for this org
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select('id, role')
    .eq('org_id', resolution.org_id)
    .eq('user_id', user.id)
    .eq('member_status', 'ACTIVE')
    .maybeSingle();

  if (membershipError || !membership) {
    if (membershipError?.code === '42501') {
      authViolation();
    }
    return {
      success: false,
      error: 'No active membership found',
    };
  }

  // Validate role: BOARD position OR CHAIR role
  const isBoard = await checkBoardPosition(resolution.org_id);
  const role = membership.role as string;
  const isChair = role === MEMBERSHIP_ROLE.CHAIR;

  if (!isBoard && !isChair) {
    return {
      success: false,
      error: 'Only BOARD members or CHAIR can update project indicators',
    };
  }

  // Call RPC to update indicator
  const { data, error }: any = await supabase.rpc('update_project_indicator', {
    p_resolution_id: resolutionId,
    p_progress: progress,
  });

  if (error) {
    if (error.code === '42501') {
      authViolation();
    }
    console.error('[updateProjectProgress] RPC error:', error);
    return {
      success: false,
      error: error.message || 'Failed to update progress',
    };
  }

  const result = data?.[0];
  if (!result?.ok) {
    return {
      success: false,
      error: result?.reason || 'Failed to update progress',
    };
  }

  return {
    success: true,
  };
}

/**
 * Update project budget indicators
 * 
 * Validates: BOARD position or CHAIR role
 * Only updates indicator.budget_planned and indicator.budget_spent
 * Does NOT modify project.phase or resolution status
 */
export async function updateProjectBudget(
  resolutionId: string,
  planned?: number,
  spent?: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await requireAuth(supabase);

  // Validate budget values if provided
  if (planned !== undefined && (typeof planned !== 'number' || planned < 0)) {
    return {
      success: false,
      error: 'Budget planned must be a non-negative number',
    };
  }

  if (spent !== undefined && (typeof spent !== 'number' || spent < 0)) {
    return {
      success: false,
      error: 'Budget spent must be a non-negative number',
    };
  }

  // At least one value must be provided
  if (planned === undefined && spent === undefined) {
    return {
      success: false,
      error: 'At least one budget value (planned or spent) must be provided',
    };
  }

  // Get resolution to find orgId
  const { data: resolution, error: resolutionError } = await supabase
    .from('resolutions')
    .select('org_id, status, metadata')
    .eq('id', resolutionId)
    .single();

  if (resolutionError || !resolution) {
    if (resolutionError?.code === '42501') {
      authViolation();
    }
    return {
      success: false,
      error: 'Resolution not found',
    };
  }

  // Verify resolution is APPROVED
  if (resolution.status !== 'APPROVED') {
    return {
      success: false,
      error: 'Can only update indicators for APPROVED resolutions',
    };
  }

  // Verify resolution has project metadata
  if (!resolution.metadata || typeof resolution.metadata !== 'object') {
    return {
      success: false,
      error: 'Resolution does not contain project metadata',
    };
  }

  const metadata = resolution.metadata as any;
  if (!metadata.project || typeof metadata.project !== 'object') {
    return {
      success: false,
      error: 'Resolution does not contain project metadata',
    };
  }

  // Get user's membership for this org
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select('id, role')
    .eq('org_id', resolution.org_id)
    .eq('user_id', user.id)
    .eq('member_status', 'ACTIVE')
    .maybeSingle();

  if (membershipError || !membership) {
    if (membershipError?.code === '42501') {
      authViolation();
    }
    return {
      success: false,
      error: 'No active membership found',
    };
  }

  // Validate role: BOARD position OR CHAIR role
  const isBoard = await checkBoardPosition(resolution.org_id);
  const role = membership.role as string;
  const isChair = role === MEMBERSHIP_ROLE.CHAIR;

  if (!isBoard && !isChair) {
    return {
      success: false,
      error: 'Only BOARD members or CHAIR can update project indicators',
    };
  }

  // Call RPC to update indicator
  const { data, error }: any = await supabase.rpc('update_project_indicator', {
    p_resolution_id: resolutionId,
    p_budget_planned: planned,
    p_budget_spent: spent,
  });

  if (error) {
    if (error.code === '42501') {
      authViolation();
    }
    console.error('[updateProjectBudget] RPC error:', error);
    return {
      success: false,
      error: error.message || 'Failed to update budget',
    };
  }

  const result = data?.[0];
  if (!result?.ok) {
    return {
      success: false,
      error: result?.reason || 'Failed to update budget',
    };
  }

  return {
    success: true,
  };
}

/**
 * Initialize project metadata for a DRAFT resolution
 * 
 * GOVERNANCE RULE:
 * - Can ONLY be applied to DRAFT resolutions
 * - Once APPROVED, project.* metadata becomes immutable
 * - Only indicator.* can be updated after approval
 * 
 * Validates: BOARD position or CHAIR/OWNER role
 * Creates project.* namespace in resolution metadata
 */
export type ProjectPhase = 'planned' | 'active' | 'paused' | 'completed' | 'cancelled';

export interface InitializeProjectParams {
  resolutionId: string;
  phase: ProjectPhase;
  code?: string;
  tags?: string[];
  budgetPlanned?: number;
}

export async function initializeProjectMetadata(
  params: InitializeProjectParams
): Promise<{ success: boolean; error?: string }> {
  const { resolutionId, phase, code, tags, budgetPlanned } = params;
  
  const supabase = await createClient();
  const user = await requireAuth(supabase);

  // Validate phase
  const validPhases: ProjectPhase[] = ['planned', 'active', 'paused', 'completed', 'cancelled'];
  if (!validPhases.includes(phase)) {
    return {
      success: false,
      error: `Invalid phase. Must be one of: ${validPhases.join(', ')}`,
    };
  }

  // Get resolution
  const { data: resolution, error: resolutionError } = await supabase
    .from('resolutions')
    .select('org_id, status, metadata')
    .eq('id', resolutionId)
    .single();

  if (resolutionError || !resolution) {
    if (resolutionError?.code === '42501') {
      authViolation();
    }
    return {
      success: false,
      error: 'Resolution not found',
    };
  }

  // CRITICAL: Can only initialize project metadata on DRAFT resolutions
  if (resolution.status !== 'DRAFT') {
    return {
      success: false,
      error: 'Project metadata can only be initialized on DRAFT resolutions. APPROVED resolutions are immutable.',
    };
  }

  // Get user's membership for this org
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select('id, role')
    .eq('org_id', resolution.org_id)
    .eq('user_id', user.id)
    .eq('member_status', 'ACTIVE')
    .maybeSingle();

  if (membershipError || !membership) {
    if (membershipError?.code === '42501') {
      authViolation();
    }
    return {
      success: false,
      error: 'No active membership found',
    };
  }

  // Validate role: BOARD position OR CHAIR/OWNER role
  const isBoard = await checkBoardPosition(resolution.org_id);
  const role = membership.role as string;
  const isChairOrOwner = role === MEMBERSHIP_ROLE.CHAIR || role === MEMBERSHIP_ROLE.OWNER;

  if (!isBoard && !isChairOrOwner) {
    return {
      success: false,
      error: 'Only BOARD members, CHAIR or OWNER can initialize project metadata',
    };
  }

  // Build new metadata with project namespace
  const existingMetadata = (resolution.metadata as Record<string, any>) || {};
  
  // Prevent re-initialization if project already exists
  if (existingMetadata['project.phase'] || 
      (existingMetadata.project && typeof existingMetadata.project === 'object')) {
    return {
      success: false,
      error: 'Project metadata already initialized for this resolution',
    };
  }

  const newMetadata: Record<string, any> = {
    ...existingMetadata,
    'project.phase': phase,
  };

  // Add optional project fields
  if (code) {
    newMetadata['project.code'] = code;
  }
  if (tags && tags.length > 0) {
    newMetadata['project.tags'] = tags;
  }

  // Add initial indicator if budget provided
  if (typeof budgetPlanned === 'number' && budgetPlanned >= 0) {
    newMetadata['indicator.budget_planned'] = budgetPlanned;
    newMetadata['indicator.progress'] = 0;
  }

  // Update resolution metadata
  const { error: updateError } = await supabase
    .from('resolutions')
    .update({ metadata: newMetadata })
    .eq('id', resolutionId)
    .eq('status', 'DRAFT'); // Double-check status to prevent race conditions

  if (updateError) {
    if (updateError.code === '42501') {
      authViolation();
    }
    console.error('[initializeProjectMetadata] Update error:', updateError);
    return {
      success: false,
      error: updateError.message || 'Failed to initialize project metadata',
    };
  }

  return {
    success: true,
  };
}

/**
 * Check if a resolution has project metadata
 */
export async function hasProjectMetadata(resolutionId: string): Promise<boolean> {
  const supabase = await createClient();
  await requireAuth(supabase);

  const { data, error } = await supabase
    .from('resolutions')
    .select('metadata')
    .eq('id', resolutionId)
    .single();

  if (error || !data) {
    return false;
  }

  const metadata = data.metadata as Record<string, any> | null;
  if (!metadata) return false;

  // Check for project.phase (required field for v19 projects)
  return typeof metadata['project.phase'] === 'string' || 
         (typeof metadata.project === 'object' && typeof metadata.project.phase === 'string');
}