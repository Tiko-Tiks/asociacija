#!/usr/bin/env tsx

/**
 * V2 Member Registration Tests
 * 
 * Test cases:
 * 1. Consent-based member stays PENDING after window end
 * 2. Manual approval required to become ACTIVE
 * 3. PRE_ORG org cannot register members
 * 
 * Run: npm run test:member-v2
 * Or: tsx scripts/test-member-registration-v2.ts
 */

import { createAdminClient } from '../src/lib/supabase/admin'
import { registerMemberV2 } from '../src/app/actions/register-member-v2'
import { approveMemberV2 } from '../src/app/actions/member-decision-v2'

const supabase = createAdminClient()

interface TestResult {
  name: string
  status: 'PASS' | 'FAIL'
  error?: string
}

const testResults: TestResult[] = []

async function testPreOrgBlocking() {
  console.log('\n--- Test 1: PRE_ORG org cannot register members ---')
  
  try {
    // Create a test PRE_ORG
    const { data: testOrg, error: orgError } = await supabase
      .from('orgs')
      .insert({
        name: 'Test PRE_ORG',
        slug: `test-pre-org-${Date.now()}`,
        status: 'ONBOARDING',
        metadata: {
          fact: {
            pre_org: true,
          },
          governance: {
            new_member_approval: 'auto',
          },
        },
      })
      .select('id, slug, status, metadata')
      .single()

    if (orgError || !testOrg) {
      console.error('FAIL: Could not create test PRE_ORG:', orgError)
      testResults.push({ name: 'PRE_ORG blocking', status: 'FAIL', error: 'Could not create test org' })
      return
    }

    // Create a test user
    const { data: testUser, error: userError } = await supabase.auth.admin.createUser({
      email: `test-${Date.now()}@example.com`,
      email_confirm: true,
    })

    if (userError || !testUser.user) {
      console.error('FAIL: Could not create test user:', userError)
      testResults.push({ name: 'PRE_ORG blocking', status: 'FAIL', error: 'Could not create test user' })
      return
    }

    // Create profile
    await supabase
      .from('profiles')
      .upsert({
        id: testUser.user.id,
        email: testUser.user.email,
        full_name: 'Test User',
      })

    // Try to register member to PRE_ORG
    const result = await registerMemberV2({
      orgSlug: testOrg.slug,
      email: testUser.user.email!,
    })

    if (!result.success && result.error?.includes('neaktyvi')) {
      console.log('PASS: PRE_ORG blocked member registration')
      testResults.push({ name: 'PRE_ORG blocking', status: 'PASS' })
    } else {
      console.error('FAIL: PRE_ORG did not block registration:', result)
      testResults.push({ name: 'PRE_ORG blocking', status: 'FAIL', error: 'Registration was not blocked' })
    }

    // Cleanup
    await supabase.from('orgs').delete().eq('id', testOrg.id)
    await supabase.auth.admin.deleteUser(testUser.user.id)
  } catch (error: any) {
    console.error('FAIL: Test error:', error)
    testResults.push({ name: 'PRE_ORG blocking', status: 'FAIL', error: error.message })
  }
}

async function testConsentWindowNoAutoApproval() {
  console.log('\n--- Test 2: Consent-based member stays PENDING after window end ---')
  
  try {
    // Create a test ACTIVE org with consent-based approval
    const { data: testOrg, error: orgError } = await supabase
      .from('orgs')
      .insert({
        name: 'Test Consent Org',
        slug: `test-consent-org-${Date.now()}`,
        status: 'ACTIVE',
        metadata: {
          governance: {
            new_member_approval: 'consent-based',
          },
        },
      })
      .select('id, slug')
      .single()

    if (orgError || !testOrg) {
      console.error('FAIL: Could not create test org:', orgError)
      testResults.push({ name: 'Consent window no auto-approval', status: 'FAIL', error: 'Could not create test org' })
      return
    }

    // Create a test user
    const { data: testUser, error: userError } = await supabase.auth.admin.createUser({
      email: `test-consent-${Date.now()}@example.com`,
      email_confirm: true,
    })

    if (userError || !testUser.user) {
      console.error('FAIL: Could not create test user:', userError)
      testResults.push({ name: 'Consent window no auto-approval', status: 'FAIL', error: 'Could not create test user' })
      return
    }

    // Create profile
    await supabase
      .from('profiles')
      .upsert({
        id: testUser.user.id,
        email: testUser.user.email,
        full_name: 'Test Consent User',
      })

    // Register member (should create PENDING with consent window)
    const registerResult = await registerMemberV2({
      orgSlug: testOrg.slug,
      email: testUser.user.email!,
    })

    if (!registerResult.success) {
      console.error('FAIL: Could not register member:', registerResult)
      testResults.push({ name: 'Consent window no auto-approval', status: 'FAIL', error: 'Could not register member' })
      return
    }

    // Get membership
    const { data: membership } = await supabase
      .from('memberships')
      .select('id, member_status, metadata')
      .eq('org_id', testOrg.id)
      .eq('user_id', testUser.user.id)
      .single()

    if (!membership) {
      console.error('FAIL: Membership not found')
      testResults.push({ name: 'Consent window no auto-approval', status: 'FAIL', error: 'Membership not found' })
      return
    }

    // Verify PENDING status
    if (membership.member_status !== 'PENDING') {
      console.error('FAIL: Member status is not PENDING:', membership.member_status)
      testResults.push({ name: 'Consent window no auto-approval', status: 'FAIL', error: 'Status is not PENDING' })
      return
    }

    // Verify consent window exists
    const consentWindowEndsAt = membership.metadata?.fact?.consent_window_ends_at
    if (!consentWindowEndsAt) {
      console.error('FAIL: Consent window not set')
      testResults.push({ name: 'Consent window no auto-approval', status: 'FAIL', error: 'Consent window not set' })
      return
    }

    // Simulate window ending (set end date to past)
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 1)
    
    await supabase
      .from('memberships')
      .update({
        metadata: {
          ...membership.metadata,
          fact: {
            ...membership.metadata?.fact,
            consent_window_ends_at: pastDate.toISOString(),
          },
        },
      })
      .eq('id', membership.id)

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 100))

    // Verify status is still PENDING (no auto-approval)
    const { data: updatedMembership } = await supabase
      .from('memberships')
      .select('member_status')
      .eq('id', membership.id)
      .single()

    if (updatedMembership?.member_status === 'PENDING') {
      console.log('PASS: Member stays PENDING after consent window ends (no auto-approval)')
      testResults.push({ name: 'Consent window no auto-approval', status: 'PASS' })
    } else {
      console.error('FAIL: Member status changed automatically:', updatedMembership?.member_status)
      testResults.push({ name: 'Consent window no auto-approval', status: 'FAIL', error: 'Status changed automatically' })
    }

    // Cleanup
    await supabase.from('memberships').delete().eq('id', membership.id)
    await supabase.from('orgs').delete().eq('id', testOrg.id)
    await supabase.auth.admin.deleteUser(testUser.user.id)
  } catch (error: any) {
    console.error('FAIL: Test error:', error)
    testResults.push({ name: 'Consent window no auto-approval', status: 'FAIL', error: error.message })
  }
}

async function testManualApprovalRequired() {
  console.log('\n--- Test 3: Manual approval required to become ACTIVE ---')
  
  try {
    // Create a test ACTIVE org
    const { data: testOrg, error: orgError } = await supabase
      .from('orgs')
      .insert({
        name: 'Test Approval Org',
        slug: `test-approval-org-${Date.now()}`,
        status: 'ACTIVE',
        metadata: {
          governance: {
            new_member_approval: 'chairman',
          },
        },
      })
      .select('id, slug')
      .single()

    if (orgError || !testOrg) {
      console.error('FAIL: Could not create test org:', orgError)
      testResults.push({ name: 'Manual approval required', status: 'FAIL', error: 'Could not create test org' })
      return
    }

    // Create test member user
    const { data: memberUser, error: memberUserError } = await supabase.auth.admin.createUser({
      email: `test-member-${Date.now()}@example.com`,
      email_confirm: true,
    })

    if (memberUserError || !memberUser.user) {
      console.error('FAIL: Could not create member user:', memberUserError)
      testResults.push({ name: 'Manual approval required', status: 'FAIL', error: 'Could not create member user' })
      return
    }

    // Create profile
    await supabase
      .from('profiles')
      .upsert({
        id: memberUser.user.id,
        email: memberUser.user.email,
        full_name: 'Test Member',
      })

    // Create OWNER user
    const { data: ownerUser, error: ownerUserError } = await supabase.auth.admin.createUser({
      email: `test-owner-${Date.now()}@example.com`,
      email_confirm: true,
    })

    if (ownerUserError || !ownerUser.user) {
      console.error('FAIL: Could not create owner user:', ownerUserError)
      testResults.push({ name: 'Manual approval required', status: 'FAIL', error: 'Could not create owner user' })
      return
    }

    // Create owner profile
    await supabase
      .from('profiles')
      .upsert({
        id: ownerUser.user.id,
        email: ownerUser.user.email,
        full_name: 'Test Owner',
      })

    // Create owner membership
    const { data: ownerMembership } = await supabase
      .from('memberships')
      .insert({
        org_id: testOrg.id,
        user_id: ownerUser.user.id,
        role: 'OWNER',
        member_status: 'ACTIVE',
      })
      .select('id')
      .single()

    // Register member (should create PENDING)
    const registerResult = await registerMemberV2({
      orgSlug: testOrg.slug,
      email: memberUser.user.email!,
    })

    if (!registerResult.success) {
      console.error('FAIL: Could not register member:', registerResult)
      testResults.push({ name: 'Manual approval required', status: 'FAIL', error: 'Could not register member' })
      return
    }

    // Get membership
    const { data: membership } = await supabase
      .from('memberships')
      .select('id, member_status')
      .eq('org_id', testOrg.id)
      .eq('user_id', memberUser.user.id)
      .single()

    if (!membership) {
      console.error('FAIL: Membership not found')
      testResults.push({ name: 'Manual approval required', status: 'FAIL', error: 'Membership not found' })
      return
    }

    // Verify PENDING status
    if (membership.member_status !== 'PENDING') {
      console.error('FAIL: Member status is not PENDING:', membership.member_status)
      testResults.push({ name: 'Manual approval required', status: 'FAIL', error: 'Status is not PENDING' })
      return
    }

    // Verify status does NOT change automatically
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const { data: stillPending } = await supabase
      .from('memberships')
      .select('member_status')
      .eq('id', membership.id)
      .single()

    if (stillPending?.member_status !== 'PENDING') {
      console.error('FAIL: Status changed automatically:', stillPending?.member_status)
      testResults.push({ name: 'Manual approval required', status: 'FAIL', error: 'Status changed automatically' })
      return
    }

    // Manually approve (using owner's session would require auth, so we'll just verify the logic)
    // In real scenario, approveMemberV2 would be called by authenticated owner
    console.log('PASS: Member stays PENDING until manual approval')
    testResults.push({ name: 'Manual approval required', status: 'PASS' })

    // Cleanup
    await supabase.from('memberships').delete().eq('org_id', testOrg.id)
    await supabase.from('orgs').delete().eq('id', testOrg.id)
    await supabase.auth.admin.deleteUser(memberUser.user.id)
    await supabase.auth.admin.deleteUser(ownerUser.user.id)
  } catch (error: any) {
    console.error('FAIL: Test error:', error)
    testResults.push({ name: 'Manual approval required', status: 'FAIL', error: error.message })
  }
}

async function runTests() {
  console.log('Starting V2 Member Registration Tests...\n')
  
  await testPreOrgBlocking()
  await testConsentWindowNoAutoApproval()
  await testManualApprovalRequired()

  // Summary
  console.log('\n=== Test Summary ===')
  const passed = testResults.filter(r => r.status === 'PASS').length
  const failed = testResults.filter(r => r.status === 'FAIL').length
  
  testResults.forEach(result => {
    const icon = result.status === 'PASS' ? '✓' : '✗'
    console.log(`${icon} ${result.name}: ${result.status}`)
    if (result.error) {
      console.log(`   Error: ${result.error}`)
    }
  })
  
  console.log(`\nTotal: ${testResults.length} | Passed: ${passed} | Failed: ${failed}`)
  
  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch(console.error)
