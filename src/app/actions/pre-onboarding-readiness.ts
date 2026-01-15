'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import {
  CHAIRMAN_REQUIRED_CONSENTS,
  ConsentType,
} from '@/app/domain/constants'

/**
 * ============================================================================
 * V2 – GOVERNANCE-LOCKED, DO NOT AUTO-MODIFY
 * ============================================================================
 * 
 * This module implements V2 pre-onboarding readiness check with governance guarantees.
 * Any automation here breaks legal guarantees.
 * 
 * V2 Pre-Onboarding Readiness Check
 * 
 * STRICTLY FORBIDDEN:
 * - NO mutations
 * - NO status changes
 * - NO metadata writes
 * - NO RPC calls that change state
 * 
 * ONLY reads data to build readiness checklist
 * 
 * STATUS: FROZEN - No modifications without governance approval
 * ============================================================================
 */

export interface ReadinessCheckItem {
  key: string
  label: string
  status: 'PASS' | 'MISSING'
  details?: string
}

export interface ReadinessStatus {
  success: boolean
  orgId?: string
  orgName?: string
  orgSlug?: string
  status?: string
  checklist?: ReadinessCheckItem[]
  allReady?: boolean
  lastUpdated?: string
  error?: string
}

/**
 * Get readiness status for V2 pre-onboarding
 * 
 * @param orgSlug - Organization slug
 * @returns Readiness status and checklist
 */
export async function getPreOnboardingReadiness(
  orgSlug: string
): Promise<ReadinessStatus> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  try {
    // Step 1: Validate access
    const { data: org, error: orgError } = await supabase
      .from('orgs')
      .select('id, name, slug, status, metadata, updated_at')
      .eq('slug', orgSlug)
      .maybeSingle()

    if (orgError || !org) {
      return { success: false, error: 'Bendruomenė nerasta' }
    }

    // HARD RULE 1: org.status MUST be 'SUBMITTED_FOR_REVIEW'
    if (org.status !== 'SUBMITTED_FOR_REVIEW') {
      return { success: false, error: 'Netinkamas bendruomenės statusas' }
    }

    // HARD RULE 2: org.metadata.fact.pre_org MUST be true
    const isPreOrg = org.metadata?.fact?.pre_org === true
    if (!isPreOrg) {
      return { success: false, error: 'Bendruomenė nėra PRE_ORG' }
    }

    // HARD RULE 3: current user MUST be OWNER
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('org_id', org.id)
      .eq('user_id', user.id)
      .eq('role', 'OWNER')
      .maybeSingle()

    if (!membership) {
      return { success: false, error: 'Neturite teisių' }
    }

    // Step 2: Build readiness checklist
    const checklist: ReadinessCheckItem[] = []

    // Check 1: governance.proposed exists and non-empty
    const governanceProposed = org.metadata?.governance?.proposed || {}
    const hasGovernanceProposed = Object.keys(governanceProposed).length > 0
    
    checklist.push({
      key: 'governance_proposed',
      label: 'Valdymo atsakymai pateikti',
      status: hasGovernanceProposed ? 'PASS' : 'MISSING',
      details: hasGovernanceProposed 
        ? 'Valdymo parametrai nustatyti' 
        : 'Reikia pateikti valdymo atsakymus',
    })

    // Check 2: Required consents are all accepted
    const { data: consents, error: consentsError } = await supabase
      .from('member_consents')
      .select('consent_type')
      .eq('user_id', user.id)
      .eq('org_id', org.id)

    const acceptedConsents = (consents || []).map((c: any) => c.consent_type as ConsentType)
    const missingConsents = CHAIRMAN_REQUIRED_CONSENTS.filter((c) => !acceptedConsents.includes(c))
    const allConsentsAccepted = missingConsents.length === 0

    checklist.push({
      key: 'consents_accepted',
      label: 'Visi sutikimai priimti',
      status: allConsentsAccepted ? 'PASS' : 'MISSING',
      details: allConsentsAccepted
        ? `Priimti visi ${CHAIRMAN_REQUIRED_CONSENTS.length} sutikimai`
        : `Trūksta ${missingConsents.length} sutikimų`,
    })

    // Check 3: If board_member_count > 0, then board_members must be present
    const boardMemberCount = governanceProposed.board_member_count
    if (boardMemberCount && Number(boardMemberCount) > 0) {
      const boardMembers = governanceProposed.board_members || []
      const hasBoardMembers = Array.isArray(boardMembers) && boardMembers.length > 0
      
      checklist.push({
        key: 'board_members',
        label: 'Valdybos nariai nurodyti',
        status: hasBoardMembers ? 'PASS' : 'MISSING',
        details: hasBoardMembers
          ? `Nurodyti ${boardMembers.length} valdybos nariai`
          : `Reikia nurodyti ${boardMemberCount} valdybos narius`,
      })
    }

    // Check 4: org.status is SUBMITTED_FOR_REVIEW
    checklist.push({
      key: 'status_submitted',
      label: 'Prašymas pateiktas peržiūrai',
      status: org.status === 'SUBMITTED_FOR_REVIEW' ? 'PASS' : 'MISSING',
      details: org.status === 'SUBMITTED_FOR_REVIEW'
        ? 'Prašymas pateiktas ir laukiama patvirtinimo'
        : `Dabartinis statusas: ${org.status}`,
    })

    // Step 3: Determine if all checks pass
    const allReady = checklist.every((item) => item.status === 'PASS')

    // Step 4: Get last updated timestamp
    const lastUpdated = org.updated_at || null

    return {
      success: true,
      orgId: org.id,
      orgName: org.name,
      orgSlug: org.slug,
      status: org.status,
      checklist,
      allReady,
      lastUpdated: lastUpdated || undefined,
    }
  } catch (error: any) {
    console.error('Error getting pre-onboarding readiness:', error)
    return { success: false, error: error?.message || 'Įvyko netikėta klaida' }
  }
}
