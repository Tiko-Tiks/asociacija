# Pilot Seed Data Setup

This guide helps you create seed data for testing the system with 4 Nodes and multiple members.

## Role Strategy

**Simplified for pilot testing:**
- **Only ONE OWNER per Node** (Node President)
- **All other members are MEMBER** (neutral role, no special permissions)
- This prevents misleading role behavior during pilot testing
- No role-based permissions are introduced unless enforced by RLS

## Prerequisites

- Supabase project configured
- Access to Supabase Dashboard (SQL Editor)
- Access to Supabase Authentication dashboard

---

## Step 1: Create Test Users

Before running the seed script, you need to create test user accounts in Supabase Auth.

### Option A: Create Users via Supabase Dashboard

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Click **"Add User"** for each test user
3. Enter email and password (or send invitation email)

### Option B: Use Your Existing Test Emails

If you already have test user accounts, you can use those. Just note their email addresses.

---

## Step 2: Update Email Addresses in Seed Script

1. Open `seed_pilot_data.sql`
2. Find the email addresses (search for `@example.com`)
3. Replace them with your actual test user emails

**Default test emails in script:**
- Node 1: `node1-admin@example.com`, `node1-member1@example.com`, `node1-member2@example.com`
- Node 2: `node2-admin@example.com`, `node2-member1@example.com`
- Node 3: `node3-admin@example.com`, `node3-member1@example.com`, `node3-member2@example.com`
- Node 4: `node4-admin@example.com`, `node4-member1@example.com`

**Example:** If your test users are:
- `admin1@test.com`
- `member1@test.com`
- `member2@test.com`

Change the script to use these emails instead.

---

## Step 3: Run the Seed Script

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **"New Query"**
3. Copy the entire contents of `seed_pilot_data.sql`
4. Paste into the SQL Editor
5. Click **"Run"** (or press `Ctrl+Enter`)

### Expected Output

You should see NOTICE messages like:
```
✅ Created Node 1: Pirmoji Bendruomenė (ID: ...)
✅ Added OWNER: node1-admin@example.com to Node 1
✅ Added MEMBER: node1-member1@example.com to Node 1
...
✅ PILOT SEED DATA CREATED SUCCESSFULLY
```

---

## Step 4: Verify Seed Data

### Verification Queries

#### 1. Verify Organizations Count

```sql
-- Should return exactly 4 organizations
SELECT COUNT(*) as org_count 
FROM orgs 
WHERE slug IN ('pirmoji-bendruomene', 'antroji-bendruomene', 'trecioji-bendruomene', 'ketvirtoji-bendruomene');
```

**Expected:** `org_count = 4`

#### 2. List All Organizations

```sql
SELECT id, name, slug, created_at 
FROM orgs 
WHERE slug IN ('pirmoji-bendruomene', 'antroji-bendruomene', 'trecioji-bendruomene', 'ketvirtoji-bendruomene')
ORDER BY created_at;
```

**Expected:** 4 rows (one for each Node)

#### 3. Verify Memberships Per Node

```sql
-- Count memberships per organization
SELECT 
  o.name as org_name,
  COUNT(m.id) as member_count
FROM orgs o
LEFT JOIN memberships m ON m.org_id = o.id
WHERE o.slug IN ('pirmoji-bendruomene', 'antroji-bendruomene', 'trecioji-bendruomene', 'ketvirtoji-bendruomene')
GROUP BY o.id, o.name
ORDER BY o.created_at;
```

**Expected:**
- Node 1: `member_count = 3`
- Node 2: `member_count = 2`
- Node 3: `member_count = 3`
- Node 4: `member_count = 2`
- Total: 10 memberships

#### 4. Verify Exactly One OWNER Per Node

```sql
-- Count OWNERs per organization (should be exactly 1 per Node)
SELECT 
  o.name as org_name,
  COUNT(CASE WHEN m.role = 'OWNER' THEN 1 END) as owner_count
FROM orgs o
LEFT JOIN memberships m ON m.org_id = o.id AND m.role = 'OWNER'
WHERE o.slug IN ('pirmoji-bendruomene', 'antroji-bendruomene', 'trecioji-bendruomene', 'ketvirtoji-bendruomene')
GROUP BY o.id, o.name
ORDER BY o.created_at;
```

**Expected:** All rows should have `owner_count = 1`

#### 5. Verify No ADMIN or CHAIR Roles Exist

```sql
-- Should return 0 rows (no ADMIN or CHAIR roles in seed data)
SELECT 
  o.name as org_name,
  u.email,
  m.role
FROM memberships m
JOIN orgs o ON o.id = m.org_id
JOIN auth.users u ON u.id = m.user_id
WHERE o.slug IN ('pirmoji-bendruomene', 'antroji-bendruomene', 'trecioji-bendruomene', 'ketvirtoji-bendruomene')
  AND m.role IN ('ADMIN', 'CHAIR');
```

**Expected:** `0 rows` (no ADMIN or CHAIR roles)

#### 6. Verify All Memberships Are ACTIVE

```sql
-- Count memberships by status
SELECT 
  m.status,
  COUNT(*) as count
FROM memberships m
JOIN orgs o ON o.id = m.org_id
WHERE o.slug IN ('pirmoji-bendruomene', 'antroji-bendruomene', 'trecioji-bendruomene', 'ketvirtoji-bendruomene')
GROUP BY m.status;
```

**Expected:** Only `status = 'ACTIVE'` with `count = 10`

#### 7. Complete Membership List (Detailed View)

```sql
-- View all memberships with details
SELECT 
  o.name as org_name,
  u.email,
  m.role,
  m.status
FROM memberships m
JOIN orgs o ON o.id = m.org_id
JOIN auth.users u ON u.id = m.user_id
WHERE o.slug IN ('pirmoji-bendruomene', 'antroji-bendruomene', 'trecioji-bendruomene', 'ketvirtoji-bendruomene')
ORDER BY o.created_at, m.role DESC, u.email;
```

**Expected Result:**

You should see:
- **4 organizations** (Pirmoji, Antroji, Trečioji, Ketvirtoji Bendruomenė)
- **10 memberships total** across all organizations
- All memberships have `status = 'ACTIVE'`
- **Role distribution:**
  - **1 OWNER per Node** (4 OWNERs total) - verified by query #4
  - **6 MEMBERs total** (all other members)
  - **0 ADMIN or CHAIR roles** - verified by query #5

---

## Seed Data Structure

The script creates:

### Node 1: Pirmoji Bendruomenė (3 members)
- 1 OWNER (Node President)
- 2 MEMBERs

### Node 2: Antroji Bendruomenė (2 members)
- 1 OWNER (Node President)
- 1 MEMBER

### Node 3: Trečioji Bendruomenė (3 members)
- 1 OWNER (Node President)
- 2 MEMBERs

### Node 4: Ketvirtoji Bendruomenė (2 members)
- 1 OWNER (Node President)
- 1 MEMBER

**Total:** 4 OWNERs + 6 MEMBERs = 10 memberships across 4 Nodes

---

## Troubleshooting

### "User not found" or No memberships created

**Cause:** User email in script doesn't match a user in `auth.users`

**Fix:**
1. Check that users exist: `SELECT id, email FROM auth.users;`
2. Update email addresses in `seed_pilot_data.sql` to match
3. Re-run the script

### "duplicate key value violates unique constraint"

**Cause:** Seed data already exists (script was run before)

**Fix:** The script uses `ON CONFLICT DO NOTHING`, so it's safe to re-run. Existing data won't be duplicated.

### Script runs but no NOTICE messages

**Cause:** NOTICE level messages might be hidden in SQL Editor

**Fix:** Check the data manually using the verification queries above.

---

## Reusing Seed Data

The seed script is **idempotent** (safe to run multiple times):
- Uses `ON CONFLICT DO NOTHING` for memberships
- Organizations are always created (but you can check if they exist first)

**To reset seed data:**

1. Delete memberships:
```sql
DELETE FROM memberships 
WHERE org_id IN (
  SELECT id FROM orgs 
  WHERE slug IN ('pirmoji-bendruomene', 'antroji-bendruomene', 'trecioji-bendruomene', 'ketvirtoji-bendruomene')
);
```

2. Delete organizations:
```sql
DELETE FROM orgs 
WHERE slug IN ('pirmoji-bendruomene', 'antroji-bendruomene', 'trecioji-bendruomene', 'ketvirtoji-bendruomene');
```

3. Re-run `seed_pilot_data.sql`

---

## Important Notes

- **Simplified role structure:** Only OWNER and MEMBER roles are used
- **No role-based permissions:** Seed data does not introduce permissions unless enforced by RLS
- **Testing focus:** This seed is for testing only, not governance simulation
- **This script uses direct database access** (no service_role client code)
- **Safe for local/testing environments only**
- **Do NOT expose seed functionality in UI** (per .cursorrules)
- **No schema changes** - uses existing tables only
- **Idempotent** - safe to run multiple times

---

## Next Steps

After seed data is created:

1. Test login with each test user
2. Verify organization context switching works
3. Test core flows (members, meetings, invoices, projects)
4. Use this data for pilot testing with real communities

