# Pilot Onboarding Guide - 2-3 Nodes

This guide helps set up the system for a pilot with 2-3 real community Nodes (organizations).

## Prerequisites

- Supabase project configured
- Database schema v15.1 deployed
- Application deployed and accessible
- Admin access to Supabase Dashboard (SQL Editor)

---

## Step 1: Create First Node (Organization)

For each Node, you need to:

### 1.1 Create Organization in Database

1. **Open Supabase Dashboard** → SQL Editor
2. **Run this SQL script** (adjust email and organization name):

```sql
DO $$
DECLARE
  v_user_id uuid;
  v_user_email text := 'node1@example.com';  -- CHANGE THIS: Node 1 admin email
  v_org_id uuid;
  v_org_name text := 'Pirmoji Bendruomenė';  -- CHANGE THIS: Node 1 name
  v_org_slug text := 'pirmoji-bendruomene';  -- CHANGE THIS: Node 1 slug (URL-friendly)
BEGIN
  -- Get user ID (user must exist in auth.users first)
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = v_user_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found. Please create user account first: %', v_user_email;
  END IF;
  
  -- Create organization
  INSERT INTO orgs (name, slug, created_at)
  VALUES (v_org_name, v_org_slug, NOW())
  RETURNING id INTO v_org_id;
  
  -- Create membership as OWNER
  INSERT INTO memberships (org_id, user_id, role, status)
  VALUES (v_org_id, v_user_id, 'OWNER', 'ACTIVE');
  
  RAISE NOTICE '✅ Created Node: % (Org ID: %)', v_org_name, v_org_id;
  RAISE NOTICE '✅ Created OWNER membership for: %', v_user_email;
END $$;
```

3. **Repeat for each Node** (Node 2, Node 3):
   - Change `v_user_email` to the Node's admin email
   - Change `v_org_name` to the Node's name
   - Change `v_org_slug` to a unique URL-friendly slug

### 1.2 Create User Accounts

**Important:** Users must exist in `auth.users` before creating organizations.

**Option A: Users create accounts via application**
1. Users visit the application
2. They see landing page → Click "Prisijungti"
3. **Note:** Currently no sign-up page - accounts must be created manually or via Supabase Dashboard

**Option B: Create users via Supabase Dashboard**
1. Supabase Dashboard → Authentication → Users
2. Click "Add User" → Enter email → Send invitation
3. User receives email → Sets password → Account created

---

## Step 2: Add Additional Members to a Node

To add more members to an existing Node:

```sql
DO $$
DECLARE
  v_user_id uuid;
  v_user_email text := 'member@example.com';  -- CHANGE: New member email
  v_org_id uuid := 'your-org-id-here';  -- CHANGE: Target organization ID
  v_role text := 'MEMBER';  -- CHANGE: Role (OWNER, ADMIN, CHAIR, MEMBER)
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = v_user_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: %', v_user_email;
  END IF;
  
  -- Create membership
  INSERT INTO memberships (org_id, user_id, role, status)
  VALUES (v_org_id, v_user_id, v_role, 'ACTIVE');
  
  RAISE NOTICE '✅ Added member % to organization', v_user_email;
END $$;
```

**To find organization ID:**
```sql
SELECT id, name, slug FROM orgs ORDER BY created_at;
```

---

## Step 3: Verify Core Flows Work End-to-End

Test these critical paths for each Node:

### 3.1 Login Flow
1. ✅ User visits `/` → Landing page
2. ✅ Click "Prisijungti" → Login page
3. ✅ Enter email/password → Redirects to `/dashboard`
4. ✅ If no organizations → Shows "Jūs neturite organizacijų"

### 3.2 Organization Context
1. ✅ Dashboard loads → Shows selected organization
2. ✅ Org Switcher works (if user has multiple orgs)
3. ✅ All pages preserve `?orgId=...` parameter

### 3.3 Members List
1. ✅ Navigate to "Nariai" → Shows read-only member names
2. ✅ Only ACTIVE members shown
3. ✅ Names displayed correctly

### 3.4 Meeting Registration (Physical Primacy)
1. ✅ Navigate to "Balsavimas" → Governance dashboard
2. ✅ Click "Šaukti Susirinkimą" → Create meeting form
3. ✅ Enter title and date (must be ≥ notice_period_days from today)
4. ✅ Create meeting → Returns to governance dashboard
5. ✅ Click meeting → Meeting details page
6. ✅ Mark attendance → Checkboxes work
7. ✅ Upload protocol → File upload works
8. ✅ View protocols → Protocols display correctly

### 3.5 Financial Facts Register
1. ✅ Navigate to "Finansai" → Invoices page
2. ✅ View invoice list (if any exist)
3. ✅ All invoices display as factual records
4. ✅ No calculations or aggregations shown

### 3.6 Error Handling
1. ✅ Expired session → Redirects to `/login?session=expired`
2. ✅ User sees clear message about expired session
3. ✅ No redirect loops
4. ✅ Empty states show helpful messages

---

## Step 4: Node-Specific Configuration

### 4.1 Set Active Ruleset

Each Node needs an active ruleset (constitution version):

```sql
-- Find available rulesets
SELECT id, org_id, quorum_percentage, notice_period_days, annual_fee, is_active, created_at
FROM ruleset_versions
WHERE org_id = 'your-org-id-here'
ORDER BY created_at DESC;

-- Set a ruleset as active (if none exists, create one first)
UPDATE ruleset_versions
SET is_active = true
WHERE id = 'ruleset-id-here';
```

**To create a new ruleset:**
```sql
INSERT INTO ruleset_versions (org_id, quorum_percentage, notice_period_days, annual_fee, is_active, created_at)
VALUES (
  'your-org-id-here',
  50,           -- 50% quorum required
  7,            -- 7 days notice period
  100.00,       -- €100 annual fee
  true,         -- Set as active
  NOW()
);
```

### 4.2 Verify RLS Policies

Ensure Row Level Security is enabled and working:

1. ✅ Users can only see their own organization's data
2. ✅ Users can only see their own memberships
3. ✅ Cross-organization access is blocked

---

## Step 5: Pilot Readiness Checklist

Before starting the pilot, verify:

### Setup
- [ ] 2-3 Nodes (organizations) created in database
- [ ] At least one OWNER user per Node
- [ ] Each Node has at least 1 active ruleset
- [ ] Test user accounts created and can log in

### Core Functionality
- [ ] Login/logout works for all test users
- [ ] Organization context switching works (if user has multiple orgs)
- [ ] Members list displays correctly
- [ ] Meeting creation works
- [ ] Attendance marking works
- [ ] Protocol upload/viewing works
- [ ] Financial view displays invoices correctly

### User Experience
- [ ] Empty states have clear guidance
- [ ] Error messages are user-friendly (Lithuanian)
- [ ] Navigation is clear and accessible
- [ ] Mobile responsive (test on phone/tablet)

### Security
- [ ] RLS policies enforced (users can't see other orgs' data)
- [ ] Session expiration handled gracefully
- [ ] No redirect loops
- [ ] Sensitive data not exposed (emails, etc.)

---

## Troubleshooting Common Issues

### "Jūs neturite organizacijų"
- **Cause:** User has no ACTIVE memberships
- **Fix:** Run Step 1.1 SQL script to create organization and membership

### "Access Denied" errors
- **Cause:** RLS policy blocking access
- **Fix:** Verify user's membership status is ACTIVE, verify RLS policies

### Cannot create meeting
- **Cause:** No active ruleset, or date too soon (violates notice_period_days)
- **Fix:** Create active ruleset (Step 4.1), ensure date is ≥ notice_period_days from today

### Empty members list
- **Cause:** No ACTIVE members in organization
- **Fix:** Verify memberships exist and have status='ACTIVE'

---

## Support During Pilot

**For Users:**
- All help text is in Lithuanian
- Empty states provide guidance
- Error messages explain what happened

**For Administrators:**
- SQL scripts provided for all setup steps
- All flows are end-to-end tested
- System is read-only for financial data (facts only)

---

## Next Steps After Pilot

After successful pilot:
1. Gather feedback from Nodes
2. Identify pain points
3. Plan improvements (within .cursorrules constraints)
4. Scale to more Nodes if pilot successful

