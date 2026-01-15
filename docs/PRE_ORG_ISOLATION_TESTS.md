# PRE_ORG Isolation Tests

## Overview

This document describes test cases and results for PRE_ORG isolation enforcement. PRE_ORG organizations (status='ONBOARDING' with metadata->'fact'->>'pre_org'='true') must be blocked from all operational entrypoints.

## Test Setup

### Prerequisites

1. **PRE_ORG Organization**: An organization with:
   - `status = 'ONBOARDING'`
   - `metadata->'fact'->>'pre_org' = 'true'`
   - Valid `slug`

2. **ACTIVE Organization**: For comparison testing (optional)

3. **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

### Running Tests

**Automated Script:**
```bash
# Option 1: Using npx (no installation needed)
npx tsx scripts/test-pre-org-isolation.ts

# Option 2: Using npm script (if tsx is installed)
npm run test:pre-org
```

**Note:** If `tsx` is not available, install it first:
```bash
npm install --save-dev tsx
```

**Manual Testing:**
Follow the test cases below and verify expected results.

---

## Test Cases

### Test 1: Public Community Page (`/c/{pre_org_slug}`)

**Objective:** Verify that PRE_ORG organizations are not accessible via public community pages.

**Test Method:**
- **Automated:** Script calls `getPublicCommunityPageData(preOrgSlug)`
- **Manual:** Navigate to `https://your-domain.com/c/{pre_org_slug}` in browser

**Expected Result:**
- Returns `null` (404 Not Found)
- Page displays "Bendruomenė nerasta" (Community not found)

**Implementation:**
- `src/app/actions/public-community-page.ts` filters with `.eq('status', 'ACTIVE')`
- PRE_ORG slugs do not match the filter, resulting in 404

**Result:** `PASS` / `FAIL`

**Notes:**
- PRE_ORG must return 404, not 403 (forbidden)
- This ensures PRE_ORG organizations are invisible to public

---

### Test 2: Member Registration to PRE_ORG

**Objective:** Verify that member registration is blocked for PRE_ORG organizations with explicit error message and audit logging.

**Test Method:**
- **Automated:** Script calls `registerMember(preOrgSlug, 'test@example.com', 'Test', 'User')`
- **Manual:** Submit member registration form on `/c/{pre_org_slug}` (if accessible) or via API

**Expected Result:**
- Returns `{ success: false, error: 'Organization is not active yet.' }`
- Audit log entry created:
  - `action = 'PRE_ORG_ACCESS_BLOCKED'`
  - `target_table = 'orgs'`
  - `metadata.fact.entrypoint = 'member_registration'`
  - `metadata.fact.org_slug = {pre_org_slug}`
  - `metadata.fact.org_status = 'ONBOARDING'`
  - `metadata.fact.is_pre_org = true`

**Implementation:**
- `src/app/actions/register-member.ts` checks `org.status !== 'ACTIVE'`
- Explicitly checks for PRE_ORG: `org.status === 'ONBOARDING' && org.metadata?.fact?.pre_org === true`
- Logs audit entry before returning error

**Result:** `PASS` / `FAIL`

**Notes:**
- Error message must be explicit: "Organization is not active yet."
- Audit log must be created (soft-fail if audit fails, but should succeed)

---

### Test 3: Dashboard Access (`/dashboard/{pre_org_slug}`)

**Objective:** Verify that dashboard access is blocked for PRE_ORG organizations, redirecting to `/pre-onboarding/{slug}`.

**Test Method:**
- **Automated:** Script verifies PRE_ORG status/metadata (full test requires authenticated user)
- **Manual:** 
  1. Log in as user with membership in PRE_ORG
  2. Navigate to `/dashboard/{pre_org_slug}`
  3. Verify redirect to `/pre-onboarding/{pre_org_slug}`
  4. Check audit log for `PRE_ORG_ACCESS_BLOCKED` entry

**Expected Result:**
- Dashboard page redirects to `/pre-onboarding/{pre_org_slug}`
- Audit log entry created:
  - `action = 'PRE_ORG_ACCESS_BLOCKED'`
  - `target_table = 'orgs'`
  - `metadata.fact.entrypoint = 'dashboard'`
  - `metadata.fact.org_slug = {pre_org_slug}`
  - `metadata.fact.org_status = 'ONBOARDING'`
  - `metadata.fact.is_pre_org = true`

**Implementation:**
- `src/app/(dashboard)/dashboard/[slug]/page.tsx` checks PRE_ORG status
- `src/app/actions/organizations.ts` (`getUserOrgs`) includes `status` and `metadata`
- Dashboard component detects PRE_ORG and redirects before rendering

**Result:** `PASS` / `FAIL`

**Notes:**
- Requires authenticated user with membership in PRE_ORG
- Full E2E test requires browser automation (Playwright)
- Script test verifies status/metadata, but redirect requires manual/E2E test

---

### Test 4: RPC Functions with PRE_ORG

**Objective:** Verify that RPC functions and views that join `orgs` table filter out PRE_ORG organizations.

**Test Method:**
- **Automated:** Script queries views/RPCs with PRE_ORG `org_id`
- **Manual:** Call RPC functions directly via Supabase client

**Expected Result:**
- Views (e.g., `member_debts`) return empty results for PRE_ORG `org_id`
- RPC functions that check `orgs.status = 'ACTIVE'` exclude PRE_ORG
- Queries with `.eq('status', 'ACTIVE')` return no rows for PRE_ORG

**Implementation:**
- All RPC functions and views updated to:
  - Join `orgs` table: `INNER JOIN orgs o ON o.id = m.org_id`
  - Filter: `AND o.status = 'ACTIVE'`
  - Exclude PRE_ORG: `AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')`

**Test Queries:**
```sql
-- Should return empty for PRE_ORG
SELECT * FROM member_debts WHERE org_id = '{pre_org_id}';

-- Should return no rows
SELECT * FROM orgs WHERE id = '{pre_org_id}' AND status = 'ACTIVE';

-- Should exclude PRE_ORG
SELECT m.* FROM memberships m
INNER JOIN orgs o ON o.id = m.org_id
WHERE m.org_id = '{pre_org_id}'
  AND m.member_status = 'ACTIVE'
  AND o.status = 'ACTIVE'
  AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true');
```

**Result:** `PASS` / `FAIL`

**Notes:**
- All RPC functions and views must be updated (see `docs/ACTIVE_ORG_FILTER_CHECKLIST.md`)
- Test verifies that PRE_ORG is excluded from operational queries

---

## Test Results Summary

| Test Case | Method | Expected | Actual | Result | Date |
|-----------|--------|----------|--------|--------|------|
| 1. Public Community Page | Script | 404 (null) | - | `PENDING` | - |
| 2. Member Registration | Script | Error + Audit | - | `PENDING` | - |
| 3. Dashboard Access | Manual/E2E | Redirect + Audit | - | `PENDING` | - |
| 4. RPC Functions | Script | Empty/Error | - | `PENDING` | - |

### Last Run Results

**Date:** `{DATE}`
**Tester:** `{NAME}`
**Environment:** `{ENV}`

```
Test 1: Public Community Page → ✅ PASS
Test 2: Member Registration → ✅ PASS
Test 3: Dashboard Access → ⚠️ MANUAL (requires auth)
Test 4: RPC Functions → ✅ PASS

Summary: 3/3 automated tests passed
```

---

## Manual Test Procedures

### Manual Test 1: Public Community Page

1. Identify PRE_ORG slug (from database or admin panel)
2. Navigate to `https://your-domain.com/c/{pre_org_slug}`
3. Verify:
   - Page shows "Bendruomenė nerasta" (404)
   - No organization data displayed
   - URL remains `/c/{pre_org_slug}` (not redirected)

**Expected:** 404 page displayed

---

### Manual Test 2: Member Registration

1. Navigate to `/c/{pre_org_slug}` (should show 404, but form might be accessible via direct API)
2. Submit registration form with test email
3. Verify:
   - Error message: "Organization is not active yet."
   - No membership created
   - Audit log entry created (check `audit_logs` table)

**Expected:** Registration blocked with explicit error

---

### Manual Test 3: Dashboard Access

1. Create test user with membership in PRE_ORG:
   ```sql
   INSERT INTO memberships (org_id, user_id, role, member_status)
   VALUES ('{pre_org_id}', '{user_id}', 'OWNER', 'PENDING');
   ```
2. Log in as test user
3. Navigate to `/dashboard/{pre_org_slug}`
4. Verify:
   - Redirect to `/pre-onboarding/{pre_org_slug}`
   - Dashboard not accessible
   - Audit log entry created

**Expected:** Redirect to pre-onboarding page

---

### Manual Test 4: RPC Functions

1. Connect to Supabase database
2. Run test queries (see Test 4 above)
3. Verify:
   - Views return empty for PRE_ORG
   - RPC functions exclude PRE_ORG
   - ACTIVE filter excludes PRE_ORG

**Expected:** All queries exclude PRE_ORG

---

## Continuous Testing

### Automated Checks

The test script (`scripts/test-pre-org-isolation.ts`) can be integrated into CI/CD:

```bash
# In CI pipeline
npx tsx scripts/test-pre-org-isolation.ts
```

### Monitoring

Monitor audit logs for `PRE_ORG_ACCESS_BLOCKED` entries:
```sql
SELECT 
  COUNT(*) as blocked_attempts,
  metadata->'fact'->>'entrypoint' as entrypoint,
  DATE(created_at) as date
FROM audit_logs
WHERE action = 'PRE_ORG_ACCESS_BLOCKED'
GROUP BY entrypoint, DATE(created_at)
ORDER BY date DESC;
```

---

## Troubleshooting

### Test Failures

**Issue:** PRE_ORG not found
- **Solution:** Create PRE_ORG organization with correct status/metadata

**Issue:** Tests pass but manual test fails
- **Solution:** Check environment variables, database connection, RLS policies

**Issue:** Audit logs not created
- **Solution:** Check `SUPABASE_SERVICE_ROLE_KEY`, verify `audit_logs` table exists

**Issue:** Dashboard redirect not working
- **Solution:** Verify `getUserOrgs()` returns `status` and `metadata`, check dashboard page logic

---

## Related Documentation

- `docs/ACTIVE_ORG_FILTER_CHECKLIST.md` - List of all modified RPC functions and views
- `src/app/actions/register-member.ts` - Member registration implementation
- `src/app/actions/public-community-page.ts` - Public page implementation
- `src/app/(dashboard)/dashboard/[slug]/page.tsx` - Dashboard implementation

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2024-XX-XX | Initial test documentation | - |
