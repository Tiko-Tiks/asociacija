# 🚀 SQL SCRIPTS - Test Organization Setup

## ✅ SUKURTI SCRIPTAI:

### **1. Full Setup Script** (Step-by-step)
**File:** `sql/setup_test_organization.sql`

**What it does:**
- Creates test organization (`test-dev`)
- Creates ruleset
- Configures governance settings
- Adds you as OWNER
- Activates organization

**Usage:** Follow comments, replace placeholders

---

### **2. Quick Setup Script** ⚡ (Single transaction)
**File:** `sql/quick_test_org_setup.sql`

**What it does:**
- Same as above, but in ONE transaction
- Copy-paste ready
- Returns all IDs

**Usage:** 
1. Get your user_id
2. Replace `{YOUR_USER_ID}`
3. Run entire script
4. ✅ Done!

---

### **3. Batch User Creation Script**
**File:** `sql/create_test_users_batch.sql`

**What it does:**
- Create 5 common test users (Chairman, 2 Voters, 2 Members)
- OR create 10 voters in bulk
- OR create custom set
- Includes cleanup queries

**Usage:** Run after test org is created

---

## 🎯 **QUICK START (2 Minutes):**

### **Step 1: Get Your User ID**
```sql
SELECT id, email FROM users WHERE email = 'your.email@example.com';
```
Copy the `id`

### **Step 2: Run Quick Setup**
```sql
-- Open: sql/quick_test_org_setup.sql
-- Replace: {YOUR_USER_ID} with your ID
-- Run: Entire script
```

### **Step 3: Create Test Users**
```sql
-- Open: sql/create_test_users_batch.sql
-- Replace: {TEST_ORG_ID} with org ID from Step 2
-- Run: OPTION 1 or OPTION 2
```

### **Step 4: Verify**
Navigate to: `/dashboard/test-dev`

✅ **Done!** Test org ready.

---

## 📊 **WHAT YOU GET:**

### **Test Organization:**
- Slug: `test-dev`
- Status: `ACTIVE`
- Has ruleset: ✅
- Auto-approve members: ✅
- Ready for testing: ✅

### **Test Users (Option 1):**
```
test.chairman@example.com    → Test Chairman
test.voter.1@example.com     → Test Voter #1
test.voter.2@example.com     → Test Voter #2
test.member.1@example.com    → Test Member #1
test.member.2@example.com    → Test Member #2
```

### **Test Users (Option 2):**
```
test.voter.1@example.com  → Test Voter #1
test.voter.2@example.com  → Test Voter #2
...
test.voter.10@example.com → Test Voter #10
```

---

## 🔥 **COMPLETE WORKFLOW:**

### **1. Setup Test Org (One-Time)**

```sql
-- Get your user ID
SELECT id FROM users WHERE email = 'your.email@example.com';
-- Result: 123e4567-e89b-12d3-a456-426614174000

-- Run quick setup (replace YOUR_USER_ID)
-- sql/quick_test_org_setup.sql
-- Result: org_id, slug='test-dev', status='ACTIVE'
```

### **2. Create Test Users**

```sql
-- Option A: 5 standard test users
-- sql/create_test_users_batch.sql - OPTION 1

-- Option B: 10 voters for voting tests
-- sql/create_test_users_batch.sql - OPTION 2

-- Option C: Use UI (recommended going forward)
-- Navigate to: /dashboard/test-dev/admin/test-users
```

### **3. Test Your Features**

```
Navigate to: /dashboard/test-dev
- Create resolutions
- Test voting (with 10 test voters)
- Test member management
- Test any feature
```

### **4. Cleanup Test Users**

```typescript
// Option A: UI (recommended)
// /dashboard/test-dev/admin/test-users
// Click "Cleanup N Test Users"

// Option B: SQL
UPDATE memberships m
SET member_status = 'LEFT',
    status_reason = 'Test completed'
FROM users u
WHERE m.user_id = u.id
  AND m.org_id = 'TEST_ORG_ID'
  AND u.email LIKE 'test.%';
```

---

## 📋 **SCRIPT COMPARISON:**

| Script | Lines | Transaction | Returns IDs | Best For |
|--------|-------|-------------|-------------|----------|
| `setup_test_organization.sql` | 200+ | Manual steps | Yes | Understanding |
| `quick_test_org_setup.sql` | 80 | Single | Yes | **Fast setup** ⭐ |
| `create_test_users_batch.sql` | 150+ | Options | Yes | Bulk users |

---

## ✅ **VERIFICATION QUERIES:**

### **Check Test Org:**
```sql
SELECT 
  slug,
  status,
  active_ruleset IS NOT NULL as has_ruleset
FROM orgs
WHERE slug = 'test-dev';
```

Expected: `status='ACTIVE', has_ruleset=true`

### **Check Your Membership:**
```sql
SELECT 
  m.role,
  m.status,
  u.email
FROM memberships m
JOIN users u ON u.id = m.user_id
JOIN orgs o ON o.id = m.org_id
WHERE o.slug = 'test-dev'
  AND u.email = 'your.email@example.com';
```

Expected: `role='OWNER', status='ACTIVE'`

### **Check Test Users:**
```sql
SELECT 
  u.email,
  m.member_status,
  COUNT(*) OVER () as total_count
FROM memberships m
JOIN users u ON u.id = m.user_id
JOIN orgs o ON o.id = m.org_id
WHERE o.slug = 'test-dev'
  AND u.email LIKE 'test.%'
ORDER BY u.email;
```

---

## 🎯 **USE CASES:**

### **Use Case 1: Voting Tests**
```sql
-- Create 10 voters
-- sql/create_test_users_batch.sql - OPTION 2

-- Then in UI:
-- 1. Create resolution
-- 2. Create vote
-- 3. Have 10 test voters vote
-- 4. Test vote tallying
```

### **Use Case 2: Member Management**
```sql
-- Create 5 diverse users
-- sql/create_test_users_batch.sql - OPTION 1

-- Then test:
-- - Member status changes
-- - Position assignments
-- - Permission checks
```

### **Use Case 3: Financial Tests**
```sql
-- Create 3 members
-- Then test:
-- - Invoice generation
-- - Payment tracking
-- - Balance calculations
```

---

## 🛡️ **SAFETY:**

All scripts are **Constitution compliant:**
- ✅ No deletions
- ✅ Proper status transitions
- ✅ Audit trail preserved
- ✅ Valid organization lifecycle

---

## 📝 **CUSTOMIZATION:**

### **Different Org Slug:**
```sql
-- In quick_test_org_setup.sql, change:
'test-dev' → 'test-voting'  -- For voting tests
'test-dev' → 'test-finance' -- For financial tests
```

### **Different User Count:**
```sql
-- In create_test_users_batch.sql, change:
generate_series(1, 10) → generate_series(1, 20)
```

### **Different Roles:**
```sql
-- Assign specific roles:
CASE 
  WHEN email LIKE '%chairman%' THEN 'OWNER'
  WHEN email LIKE '%admin%' THEN 'OWNER'
  ELSE 'MEMBER'
END
```

---

## 🔄 **CLEANUP (Later):**

### **Option 1: Mark Org as INACTIVE**
```sql
UPDATE orgs 
SET status = 'INACTIVE',
    updated_at = NOW()
WHERE slug = 'test-dev';
```

### **Option 2: Keep for Future Tests**
Do nothing - test org is isolated and harmless ✅

---

## 🆘 **TROUBLESHOOTING:**

### **Error: "Email already exists"**
User already created - that's OK! Script uses `ON CONFLICT DO NOTHING`

### **Error: "Slug already exists"**
Change slug to `test-dev-2` or cleanup old test org

### **Error: "Foreign key violation"**
Make sure org exists before creating memberships

### **Can't see test org in UI?**
Check membership: `SELECT * FROM memberships WHERE user_id = 'YOUR_ID'`

---

## ✅ **FINAL CHECKLIST:**

- [ ] Get your user_id
- [ ] Run `quick_test_org_setup.sql`
- [ ] Run `create_test_users_batch.sql` (optional)
- [ ] Verify in UI: `/dashboard/test-dev`
- [ ] Create more users via UI as needed
- [ ] Test your features freely
- [ ] Cleanup when done (UI or SQL)

---

## 🎉 **YOU'RE READY!**

**3 ways to create test org:**
1. ⚡ **SQL (fastest)** - `quick_test_org_setup.sql`
2. 🎨 **UI (future)** - Coming soon
3. 📚 **Manual** - `setup_test_organization.sql`

**Recommended:** Use SQL once, then manage users via UI!

---

**Next:** Create test users and start testing! 🚀

