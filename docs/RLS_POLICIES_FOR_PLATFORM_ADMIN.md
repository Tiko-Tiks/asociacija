# RLS Policies for Platform Admin Access

## Problem

Platform admin (user with OWNER role) needs to view information from ALL organizations, but RLS policies may block access to other orgs' data.

## Current Situation

- Admin dashboard exists at `/admin`
- `getAllOrganizations()` tries to fetch all orgs
- `getOrgFinances()` tries to fetch invoices from any org
- But RLS policies may block access if they only allow users to see their own org's data

## Required RLS Policies

### 1. Allow Platform Admin to SELECT all orgs

```sql
-- Policy: Platform admin can view all organizations
CREATE POLICY "platform_admin_select_all_orgs"
ON orgs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
    AND role = 'OWNER'
    AND member_status = 'ACTIVE'
  )
);
```

### 2. Allow Platform Admin to SELECT all memberships

```sql
-- Policy: Platform admin can view all memberships
CREATE POLICY "platform_admin_select_all_memberships"
ON memberships
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.user_id = auth.uid()
    AND m.role = 'OWNER'
    AND m.member_status = 'ACTIVE'
  )
);
```

### 3. Allow Platform Admin to SELECT all invoices

```sql
-- Policy: Platform admin can view all invoices
CREATE POLICY "platform_admin_select_all_invoices"
ON invoices
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
    AND role = 'OWNER'
    AND member_status = 'ACTIVE'
  )
);
```

### 4. Allow Platform Admin to SELECT other org-scoped tables

Apply similar policy to:
- `projects`
- `resolutions`
- `events`
- `governance_configs`
- `org_rulesets`
- `member_consents`
- `audit_logs`

## Alternative: Service Role (NOT RECOMMENDED)

Using service_role key bypasses RLS but is a security risk. Only use if absolutely necessary and with proper safeguards.

## Testing

After implementing policies:
1. Login as platform admin (OWNER in any org)
2. Navigate to `/admin`
3. Should see ALL organizations, not just own org
4. Should be able to view finances from ANY org

## Notes

- Policies check for OWNER role with ACTIVE member_status
- After schema fix, user should have OWNER in only ONE org
- But platform admin status is determined by having OWNER in ANY org
- This allows branduolys owner to see all communities

