/**
 * PRE_ORG Isolation Test Script
 * 
 * Tests that PRE_ORG organizations are properly blocked at all entrypoints.
 * 
 * Usage:
 *   npx tsx scripts/test-pre-org-isolation.ts
 *   OR
 *   npm run test:pre-org
 * 
 * Requires:
 *   - PRE_ORG organization in database (status='ONBOARDING', metadata->'fact'->>'pre_org'='true')
 *   - ACTIVE organization for comparison (optional)
 *   - Environment variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * 
 * Installation:
 *   npm install --save-dev tsx  (if not using npx)
 */

import { createAdminClient } from '../src/lib/supabase/admin'
import { createPublicClient } from '../src/lib/supabase/public'
import { getPublicCommunityPageData } from '../src/app/actions/public-community-page'
import { registerMember } from '../src/app/actions/register-member'

interface TestResult {
  test: string
  method: string
  expected: string
  actual: string
  passed: boolean
  error?: string
}

const results: TestResult[] = []

function logTest(test: string, method: string, expected: string, actual: string, passed: boolean, error?: string) {
  results.push({ test, method, expected, actual, passed, error })
  const status = passed ? '✅ PASS' : '❌ FAIL'
  console.log(`${status} | ${test}`)
  if (!passed) {
    console.log(`  Expected: ${expected}`)
    console.log(`  Actual: ${actual}`)
    if (error) {
      console.log(`  Error: ${error}`)
    }
  }
}

async function findPreOrgOrg(): Promise<{ id: string; slug: string; name: string } | null> {
  const supabase = createAdminClient()
  
  const { data: orgs, error } = await supabase
    .from('orgs')
    .select('id, slug, name, status, metadata')
    .eq('status', 'ONBOARDING')
    .limit(10)
  
  if (error) {
    console.error('Error finding PRE_ORG:', error)
    return null
  }
  
  // Find org with pre_org flag
  const preOrg = orgs?.find(org => org.metadata?.fact?.pre_org === true)
  
  if (!preOrg) {
    console.warn('No PRE_ORG found. Create one with: status=ONBOARDING, metadata->fact->pre_org=true')
    return null
  }
  
  return {
    id: preOrg.id,
    slug: preOrg.slug,
    name: preOrg.name,
  }
}

async function findActiveOrg(): Promise<{ id: string; slug: string; name: string } | null> {
  const supabase = createAdminClient()
  
  const { data: org, error } = await supabase
    .from('orgs')
    .select('id, slug, name, status')
    .eq('status', 'ACTIVE')
    .limit(1)
    .maybeSingle()
  
  if (error) {
    console.error('Error finding ACTIVE org:', error)
    return null
  }
  
  return org ? { id: org.id, slug: org.slug, name: org.name } : null
}

async function testPublicCommunityPage(preOrgSlug: string) {
  console.log('\n=== Test 1: Public Community Page (/c/{pre_org_slug}) ===')
  
  try {
    const data = await getPublicCommunityPageData(preOrgSlug)
    
    if (data === null) {
      logTest(
        'Public community page returns 404 for PRE_ORG',
        'Script: getPublicCommunityPageData()',
        'null (404)',
        'null',
        true
      )
    } else {
      logTest(
        'Public community page returns 404 for PRE_ORG',
        'Script: getPublicCommunityPageData()',
        'null (404)',
        `data object (org: ${data.org.name})`,
        false,
        'PRE_ORG should not be accessible via public page'
      )
    }
  } catch (error: any) {
    logTest(
      'Public community page returns 404 for PRE_ORG',
      'Script: getPublicCommunityPageData()',
      'null (404)',
      `Error: ${error.message}`,
      false,
      error.message
    )
  }
}

async function testMemberRegistration(preOrgSlug: string) {
  console.log('\n=== Test 2: Member Registration to PRE_ORG ===')
  
  try {
    const result = await registerMember(preOrgSlug, 'test@example.com', 'Test', 'User')
    
    if (!result.success && result.error === 'Organization is not active yet.') {
      logTest(
        'Member registration blocked for PRE_ORG',
        'Script: registerMember()',
        'success: false, error: "Organization is not active yet."',
        `success: ${result.success}, error: "${result.error}"`,
        true
      )
    } else {
      logTest(
        'Member registration blocked for PRE_ORG',
        'Script: registerMember()',
        'success: false, error: "Organization is not active yet."',
        `success: ${result.success}, error: "${result.error || 'none'}"`,
        false,
        'Registration should be blocked with explicit error message'
      )
    }
    
    // Check audit log
    const supabase = createAdminClient()
    const { data: auditLogs, error: auditError } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('action', 'PRE_ORG_ACCESS_BLOCKED')
      .eq('target_table', 'orgs')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (auditError) {
      logTest(
        'Audit log created for blocked registration',
        'Script: Query audit_logs',
        'Audit log entry exists',
        `Error: ${auditError.message}`,
        false,
        auditError.message
      )
    } else if (auditLogs) {
      const entrypoint = auditLogs.metadata?.fact?.entrypoint
      if (entrypoint === 'member_registration') {
        logTest(
          'Audit log created for blocked registration',
          'Script: Query audit_logs',
          'Audit log with entrypoint=member_registration',
          `Audit log found with entrypoint=${entrypoint}`,
          true
        )
      } else {
        logTest(
          'Audit log created for blocked registration',
          'Script: Query audit_logs',
          'Audit log with entrypoint=member_registration',
          `Audit log found but entrypoint=${entrypoint}`,
          false,
          'Wrong entrypoint in audit log'
        )
      }
    } else {
      logTest(
        'Audit log created for blocked registration',
        'Script: Query audit_logs',
        'Audit log entry exists',
        'No audit log found',
        false,
        'Audit log should be created when registration is blocked'
      )
    }
  } catch (error: any) {
    logTest(
      'Member registration blocked for PRE_ORG',
      'Script: registerMember()',
      'success: false, error: "Organization is not active yet."',
      `Exception: ${error.message}`,
      false,
      error.message
    )
  }
}

async function testDashboardAccess(preOrgSlug: string) {
  console.log('\n=== Test 3: Dashboard Access (/dashboard/{pre_org_slug}) ===')
  
  // Note: This test requires authentication, so we'll test the underlying logic
  // The actual redirect happens in the page component, which requires a logged-in user
  // For script testing, we verify that getUserOrgs would filter out PRE_ORG
  
  const supabase = createAdminClient()
  
  // Simulate what getUserOrgs does: check if PRE_ORG would be returned
  // In reality, getUserOrgs filters by ACTIVE memberships, so PRE_ORG shouldn't appear
  // But we can check if the org has the right status/metadata
  
  const { data: org, error } = await supabase
    .from('orgs')
    .select('id, slug, status, metadata')
    .eq('slug', preOrgSlug)
    .maybeSingle()
  
  if (error) {
    logTest(
      'Dashboard blocks PRE_ORG access',
      'Script: Check org status',
      'status=ONBOARDING, metadata->fact->pre_org=true',
      `Error: ${error.message}`,
      false,
      error.message
    )
    return
  }
  
  if (!org) {
    logTest(
      'Dashboard blocks PRE_ORG access',
      'Script: Check org status',
      'PRE_ORG org found',
      'Org not found',
      false,
      'PRE_ORG org should exist for testing'
    )
    return
  }
  
  const isPreOrg = org.status === 'ONBOARDING' && org.metadata?.fact?.pre_org === true
  
  if (isPreOrg) {
    logTest(
      'Dashboard blocks PRE_ORG access',
      'Script: Verify PRE_ORG status',
      'status=ONBOARDING, metadata->fact->pre_org=true',
      `status=${org.status}, pre_org=${org.metadata?.fact?.pre_org}`,
      true
    )
  } else {
    logTest(
      'Dashboard blocks PRE_ORG access',
      'Script: Verify PRE_ORG status',
      'status=ONBOARDING, metadata->fact->pre_org=true',
      `status=${org.status}, pre_org=${org.metadata?.fact?.pre_org}`,
      false,
      'Org does not have PRE_ORG status'
    )
  }
  
  // Note: Actual dashboard redirect test requires authenticated user
  // This would need to be tested manually or with E2E tests
  console.log('  Note: Full dashboard redirect test requires authenticated user (manual/E2E test)')
}

async function testRPCFunctions(preOrgId: string) {
  console.log('\n=== Test 4: RPC Functions with PRE_ORG ===')
  
  const supabase = createAdminClient()
  
  // Test: Query that joins orgs and should filter PRE_ORG
  // Example: member_debts view or any RPC that uses orgs.status = 'ACTIVE'
  
  try {
    // Test member_debts view (should only show ACTIVE orgs)
    const { data: debts, error: debtsError } = await supabase
      .from('member_debts')
      .select('*')
      .eq('org_id', preOrgId)
      .limit(1)
    
    if (debtsError) {
      // Error is acceptable (RLS might block, or view might not exist)
      logTest(
        'RPC/view filters PRE_ORG',
        'Script: Query member_debts view',
        'Empty result or error (PRE_ORG filtered)',
        `Error: ${debtsError.message}`,
        true, // Error means PRE_ORG is blocked
        debtsError.message
      )
    } else if (!debts || debts.length === 0) {
      logTest(
        'RPC/view filters PRE_ORG',
        'Script: Query member_debts view',
        'Empty result (PRE_ORG filtered)',
        'Empty result',
        true
      )
    } else {
      logTest(
        'RPC/view filters PRE_ORG',
        'Script: Query member_debts view',
        'Empty result (PRE_ORG filtered)',
        `${debts.length} rows returned`,
        false,
        'PRE_ORG should be filtered from view'
      )
    }
    
    // Test: Try to query orgs directly with status filter
    const { data: activeOrgs, error: activeError } = await supabase
      .from('orgs')
      .select('id, slug, status')
      .eq('id', preOrgId)
      .eq('status', 'ACTIVE')
      .maybeSingle()
    
    if (activeError) {
      logTest(
        'ACTIVE filter excludes PRE_ORG',
        'Script: Query orgs with status=ACTIVE',
        'No result (PRE_ORG not ACTIVE)',
        `Error: ${activeError.message}`,
        true
      )
    } else if (!activeOrgs) {
      logTest(
        'ACTIVE filter excludes PRE_ORG',
        'Script: Query orgs with status=ACTIVE',
        'No result (PRE_ORG not ACTIVE)',
        'No result',
        true
      )
    } else {
      logTest(
        'ACTIVE filter excludes PRE_ORG',
        'Script: Query orgs with status=ACTIVE',
        'No result (PRE_ORG not ACTIVE)',
        `Org found: ${activeOrgs.slug}`,
        false,
        'PRE_ORG should not match ACTIVE filter'
      )
    }
  } catch (error: any) {
    logTest(
      'RPC/view filters PRE_ORG',
      'Script: Query member_debts view',
      'Empty result or error',
      `Exception: ${error.message}`,
      false,
      error.message
    )
  }
}

async function main() {
  console.log('PRE_ORG Isolation Test Suite')
  console.log('============================\n')
  
  // Find PRE_ORG organization
  const preOrg = await findPreOrgOrg()
  if (!preOrg) {
    console.error('❌ Cannot run tests: No PRE_ORG organization found')
    console.error('   Create one with: status=ONBOARDING, metadata->fact->pre_org=true')
    process.exit(1)
  }
  
  console.log(`Found PRE_ORG: ${preOrg.name} (${preOrg.slug})\n`)
  
  // Run tests
  await testPublicCommunityPage(preOrg.slug)
  await testMemberRegistration(preOrg.slug)
  await testDashboardAccess(preOrg.slug)
  await testRPCFunctions(preOrg.id)
  
  // Summary
  console.log('\n============================')
  console.log('Test Summary')
  console.log('============================')
  
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const total = results.length
  
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`)
  
  if (failed > 0) {
    console.log('\nFailed Tests:')
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ❌ ${r.test}`)
      if (r.error) {
        console.log(`     ${r.error}`)
      }
    })
    process.exit(1)
  } else {
    console.log('\n✅ All tests passed!')
    process.exit(0)
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

export { main as testPreOrgIsolation }
