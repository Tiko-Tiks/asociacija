# Platform Admin Setup Guide

## Overview

Platform admin can view information from ALL organizations.
There are two types of platform admins:
1. **Super Admin**: User with email `admin@pastas.email` (has ALL permissions)
2. **Branduolys Owner**: User with OWNER role in branduolys organization

Regular community OWNER users can only view their own organization's data.

## Setup Steps

### 1. Create Super Admin User

**CRITICAL**: User with email `admin@pastas.email` is automatically super admin.

Ensure this user exists in the system:
- Email: `admin@pastas.email`
- This user has ALL permissions regardless of memberships

### 2. Create Branduolys Organization (Optional)

Branduolys can be created as a regular organization with:
- **Slug**: `branduolys` or `platform`
- **Name**: "Bendruomenių Branduolys" (or similar)
- **Owner**: Assign the platform admin user as OWNER (if not using super admin)

### 3. Apply RLS Policies

Run the SQL script: `sql/rls_platform_admin_policies.sql`

This creates:
- `is_platform_admin()` function - checks if user is super admin OR branduolys owner
- RLS policies for all tables that allow platform admin to see all data

### 4. Test Security

Use the test function: `testAdminSecurity()` from `admin-security-check.ts`

**Expected Results:**
- **Super admin (admin@pastas.email)**: `isPlatformAdmin = true`, `canSeeAllOrgs = true`, `orgsVisible > 1`
- **Branduolys owner**: `isPlatformAdmin = true`, `canSeeAllOrgs = true`, `orgsVisible > 1`
- **Community owner**: `isPlatformAdmin = false`, `canSeeAllOrgs = false`, `orgsVisible = 1`

## Security Model

### Super Admin (admin@pastas.email)
- ✅ Can see ALL organizations
- ✅ Can see ALL memberships
- ✅ Can see ALL invoices
- ✅ Can see ALL projects, resolutions, events
- ✅ Can access `/admin` dashboard
- ✅ Can view finances from any org
- ✅ Has ALL permissions (bypasses all checks)

### Platform Admin (Branduolys Owner)
- ✅ Can see ALL organizations
- ✅ Can see ALL memberships
- ✅ Can see ALL invoices
- ✅ Can see ALL projects, resolutions, events
- ✅ Can access `/admin` dashboard
- ✅ Can view finances from any org

### Regular Community OWNER
- ❌ Can see ONLY their own organization
- ❌ Cannot see branduolys data
- ❌ Cannot see other communities' data
- ❌ Cannot access `/admin` dashboard
- ✅ Can manage their own community

## Verification

### Test 1: Super Admin
1. Login as `admin@pastas.email`
2. Navigate to `/admin`
3. Should see ALL organizations
4. Should be able to view finances from any org
5. Should have full system access

### Test 2: Branduolys Owner
1. Login as branduolys owner (not super admin)
2. Navigate to `/admin`
3. Should see ALL organizations
4. Should be able to view finances from any org

### Test 3: Community Owner
1. Login as community owner (not branduolys, not super admin)
2. Navigate to `/admin`
3. Should be redirected to `/dashboard` (not admin)
4. Try to access other org's data via API
5. Should be blocked by RLS (see only own org)

## Troubleshooting

### Issue: Platform admin cannot see all orgs
- **Check**: Is user email exactly `admin@pastas.email`? (super admin)
- **Check**: Does branduolys org exist with slug `branduolys` or `platform`?
- **Check**: Is user OWNER in branduolys org? (if not super admin)
- **Check**: Are RLS policies applied?
- **Check**: Is `is_platform_admin()` function working?

### Issue: Community owner can see other orgs
- **Check**: Are RLS policies applied correctly?
- **Check**: Does `is_platform_admin()` return false for community owners?
- **Check**: Are there any bypass mechanisms?

## SQL Functions

### `get_branduolys_org_id()`
Returns the UUID of branduolys organization (by slug).

### `is_platform_admin()`
Returns true if:
- Current user email is `admin@pastas.email` (super admin), OR
- Current user is OWNER in branduolys org

## RLS Policies

All policies follow this pattern:
```sql
USING (
  is_platform_admin()  -- Platform admin can see all
  OR
  -- Regular users can see only their org
  EXISTS (SELECT 1 FROM memberships WHERE ...)
)
```

This ensures:
- Platform admin sees everything
- Regular users see only their org
- No data leakage between communities

