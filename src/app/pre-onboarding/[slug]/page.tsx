import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/app/utils/audit'
import { getCurrentUser } from '@/app/actions/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GovernanceForm } from '@/components/pre-onboarding/governance-form'
import { ConsentsForm } from '@/components/pre-onboarding/consents-form'
import { ReadinessChecklist } from '@/components/pre-onboarding/readiness-checklist'
import { getPreOnboardingConsents } from '@/app/actions/pre-onboarding-consents'
import { getPreOnboardingReadiness } from '@/app/actions/pre-onboarding-readiness'

/**
 * ============================================================================
 * V2 – GOVERNANCE-LOCKED, DO NOT AUTO-MODIFY
 * ============================================================================
 * 
 * This module implements V2 pre-onboarding page with governance guarantees.
 * Any automation here breaks legal guarantees.
 * 
 * V2 Pre-Onboarding Page
 * 
 * HARD ACCESS RULES:
 * 1. org.status MUST be 'ONBOARDING' (governance step) OR 'SUBMITTED_FOR_REVIEW' (consents step)
 * 2. org.metadata.fact.pre_org MUST be true
 * 3. current user MUST be OWNER of org
 * 
 * If any rule fails:
 * - Block access (404)
 * - Log audit entry: PRE_ORG_ACCESS_BLOCKED with reason='invalid_context'
 * 
 * IMPORTANT:
 * - V2-only shell (no dashboard layout, no sidebar)
 * - Separate from /dashboard/[slug]/onboarding
 * - Minimal UI for V2 onboarding flow
 * - Steps: Governance (ONBOARDING) -> Consents (SUBMITTED_FOR_REVIEW) -> Readiness
 * 
 * STATUS: FROZEN - No modifications without governance approval
 * ============================================================================
 */
export const dynamic = 'force-dynamic'

interface PreOnboardingPageProps {
  params: Promise<{ slug: string }> | { slug: string }
}

async function verifyPreOnboardingAccess(slug: string): Promise<{
  allowed: boolean
  org?: {
    id: string
    name: string
    slug: string
    status: string
    metadata?: any
  }
  reason?: string
}> {
  const supabase = await createClient()
  
  // Step 1: Get current user
  const user = await getCurrentUser()
  if (!user) {
    return { allowed: false, reason: 'not_authenticated' }
  }
  
  // Step 2: Get organization by slug
  const { data: org, error: orgError } = await supabase
    .from('orgs')
    .select('id, name, slug, status, metadata')
    .eq('slug', slug)
    .maybeSingle()
  
  if (orgError || !org) {
    return { allowed: false, reason: 'org_not_found' }
  }
  
  // Step 3: HARD RULE 1 - Check org.status MUST be 'ONBOARDING' or 'SUBMITTED_FOR_REVIEW'
  // ONBOARDING = governance step, SUBMITTED_FOR_REVIEW = consents step
  if (org.status !== 'ONBOARDING' && org.status !== 'SUBMITTED_FOR_REVIEW') {
    return { allowed: false, reason: 'invalid_status', org }
  }
  
  // Step 4: HARD RULE 2 - Check org.metadata.fact.pre_org MUST be true
  const isPreOrg = org.metadata?.fact?.pre_org === true
  if (!isPreOrg) {
    return { allowed: false, reason: 'not_pre_org', org }
  }
  
  // Step 5: HARD RULE 3 - Check current user MUST be OWNER of org
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select('id, role, member_status')
    .eq('org_id', org.id)
    .eq('user_id', user.id)
    .maybeSingle()
  
  if (membershipError || !membership) {
    return { allowed: false, reason: 'not_member', org }
  }
  
  if (membership.role !== 'OWNER') {
    return { allowed: false, reason: 'not_owner', org }
  }
  
  // All rules passed
  return { allowed: true, org }
}

async function logAccessBlocked(orgId: string, userId: string | null, reason: string) {
  try {
    const adminSupabase = createAdminClient()
    await logAudit(adminSupabase, {
      orgId,
      userId,
      action: 'PRE_ORG_ACCESS_BLOCKED',
      targetTable: 'orgs',
      targetId: orgId,
      metadata: {
        fact: {
          entrypoint: 'pre_onboarding',
          reason,
        },
      },
    })
  } catch (error) {
    console.error('AUDIT INCIDENT: Failed to log PRE_ORG_ACCESS_BLOCKED:', error)
  }
}

export default async function PreOnboardingPage({ params }: PreOnboardingPageProps) {
  const resolvedParams = 'then' in params ? await params : params
  const normalizedSlug = decodeURIComponent(resolvedParams.slug).trim()
  
  // Verify access with HARD rules
  const accessCheck = await verifyPreOnboardingAccess(normalizedSlug)
  
  if (!accessCheck.allowed) {
    // Block access and log audit
    const orgId = accessCheck.org?.id || '00000000-0000-0000-0000-000000000000'
    const user = await getCurrentUser()
    
    await logAccessBlocked(orgId, user?.id || null, accessCheck.reason || 'unknown')
    
    // Return 404 (not found) to hide existence of org
    notFound()
  }
  
  const org = accessCheck.org!
  
  // Check current step based on status
  const isGovernanceStep = org.status === 'ONBOARDING'
  const isConsentsStep = org.status === 'SUBMITTED_FOR_REVIEW'
  
  // Check readiness status (for consents step)
  let allConsentsAccepted = false
  let allReady = false
  if (isConsentsStep) {
    try {
      const consentsResult = await getPreOnboardingConsents(normalizedSlug)
      if (consentsResult.success && consentsResult.missing) {
        allConsentsAccepted = consentsResult.missing.length === 0
      }
      
      // Check full readiness
      const readinessResult = await getPreOnboardingReadiness(normalizedSlug)
      if (readinessResult.success) {
        allReady = readinessResult.allReady || false
      }
    } catch (error) {
      console.error('Error checking consents/readiness:', error)
    }
  }

  // Render V2 pre-onboarding shell (minimal UI, no dashboard layout)
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
              Bendruomenės registracija
            </h1>
            <p className="text-lg text-slate-600">
              {org.name}
            </p>
            <p className="text-sm text-slate-500 mt-2">
              Užbaikite registracijos procesą, kad galėtumėte naudoti visus sistemos funkcionalumus
            </p>
          </div>
          
          {/* Step Indicator */}
          <div className="mb-8 flex items-center justify-center gap-4">
            <div className={`flex items-center gap-2 ${isGovernanceStep ? 'text-blue-600 font-semibold' : isConsentsStep ? 'text-green-600' : 'text-slate-400'}`}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isGovernanceStep ? 'bg-blue-600 text-white' : isConsentsStep ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'}`}>
                1
              </div>
              <span>Valdymo klausimai</span>
            </div>
            <div className="h-px w-16 bg-slate-200" />
            <div className={`flex items-center gap-2 ${isConsentsStep && !allConsentsAccepted ? 'text-blue-600 font-semibold' : allConsentsAccepted ? 'text-green-600' : 'text-slate-400'}`}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isConsentsStep && !allConsentsAccepted ? 'bg-blue-600 text-white' : allConsentsAccepted ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'}`}>
                2
              </div>
              <span>Sutikimai</span>
            </div>
            {isConsentsStep && (
              <>
                <div className="h-px w-16 bg-slate-200" />
                <div className={`flex items-center gap-2 ${allReady ? 'text-green-600 font-semibold' : 'text-slate-400'}`}>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${allReady ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'}`}>
                    3
                  </div>
                  <span>Laukiama patvirtinimo</span>
                </div>
              </>
            )}
          </div>
          
          {/* Governance Form or Consents Form or Readiness Checklist */}
          {isGovernanceStep ? (
            <GovernanceForm orgSlug={normalizedSlug} orgName={org.name} />
          ) : isConsentsStep ? (
            allConsentsAccepted ? (
              <ReadinessChecklist orgSlug={normalizedSlug} orgName={org.name} />
            ) : (
              <ConsentsForm orgSlug={normalizedSlug} orgName={org.name} />
            )
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Registracijos būsena</CardTitle>
                <CardDescription>
                  Jūsų bendruomenės registracija yra peržiūrimoje stadijoje
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">
                      Ką daryti toliau?
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-blue-800 text-sm">
                      <li>Palaukite administracijos patvirtinimo</li>
                      <li>Gausite el. laišką, kai registracija bus patvirtinta</li>
                      <li>Po patvirtinimo galėsite užbaigti onboarding procesą</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <h3 className="font-semibold text-slate-900 mb-2">
                      Registracijos informacija
                    </h3>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <dt className="font-medium text-slate-600">Bendruomenės pavadinimas:</dt>
                        <dd className="text-slate-900">{org.name}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-slate-600">Slug:</dt>
                        <dd className="text-slate-900">{org.slug}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-slate-600">Būsena:</dt>
                        <dd className="text-slate-900">Peržiūrimoje stadijoje</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Footer Note */}
          <div className="mt-8 text-center text-sm text-slate-500">
            <p>
              Jei turite klausimų, susisiekite su administracija.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
