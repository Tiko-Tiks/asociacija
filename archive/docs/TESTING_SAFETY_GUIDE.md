# 🧪 TESTING SAFETY GUIDE

## ⚠️ CRITICAL: Constitutional Compliance During Testing

**GOVERNANCE RULE #5:** Members are NEVER deleted.  
**Valid lifecycle:** PENDING → ACTIVE → SUSPENDED → LEFT

---

## 🎯 SAFE TESTING STRATEGIES

### **Strategy 1: Test Organization** ⭐ RECOMMENDED

Create a dedicated test organization:

```typescript
// Example test org:
{
  name: "TEST - Branduolys Development",
  slug: "test-branduolys-dev",
  org_type: "COMMUNITY",
  description: "⚠️ TEST ENVIRONMENT - Safe to experiment"
}
```

**Advantages:**
- ✅ Isolated from production data
- ✅ Can experiment freely
- ✅ Easy to identify and ignore in analytics
- ✅ Can mark org as INACTIVE later (soft delete)
- ✅ All test users contained in one place

**Cleanup:**
```typescript
// Later, if needed:
// 1. Mark test org as INACTIVE (keeps audit trail)
// 2. Or leave it - doesn't affect production
// 3. Can reuse for future testing
```

---

### **Strategy 2: Test User Convention**

Use clear naming convention for test users:

```typescript
// Test user pattern:
{
  email: "test.user.1@example.com",  // MUST start with "test."
  first_name: "Test",                 // MUST be "Test"
  last_name: "User #1"                // Descriptive
}

// More examples:
test.voter.1@example.com    → Test Voter #1
test.chairman@example.com   → Test Chairman
test.member.active@example.com → Test Active Member
```

**Why this convention?**
- Easy to identify test users
- Easy to filter in queries
- Easy to clean up with helper functions
- Clear in audit logs

---

### **Strategy 3: Test User Lifecycle**

After testing, mark test users as LEFT:

```typescript
// Cleanup after testing:
import { markTestUsersAsLeft } from '@/app/actions/test-helpers'

// Mark all test users in org as LEFT
const result = await markTestUsersAsLeft(orgId)
// Result: { success: true, count: 5 }

// They're now "soft deleted" - not shown in active lists
// But audit trail and historical data preserved ✅
```

---

## 🛠️ TEST HELPER FUNCTIONS

### **1. List Test Users**

```typescript
import { listTestUsers } from '@/app/actions/test-helpers'

const { users } = await listTestUsers(orgId)
// Returns: [
//   {
//     membership_id: "...",
//     email: "test.user.1@example.com",
//     first_name: "Test",
//     member_status: "ACTIVE"
//   },
//   ...
// ]
```

### **2. Get Test User Stats**

```typescript
import { getTestUserStats } from '@/app/actions/test-helpers'

const { stats } = await getTestUserStats(orgId)
// Returns: {
//   total: 10,
//   active: 7,
//   left: 2,
//   suspended: 1,
//   pending: 0
// }
```

### **3. Mark Test Users as LEFT**

```typescript
import { markTestUsersAsLeft } from '@/app/actions/test-helpers'

const result = await markTestUsersAsLeft(orgId)
// Marks ALL users with:
// - email starting with "test."
// - OR first_name = "Test"
// as LEFT status
```

### **4. Create Test User**

```typescript
import { createTestUser } from '@/app/actions/test-helpers'

const result = await createTestUser(
  'test.voter.5@example.com',
  'Test',
  'Voter #5'
)
// Returns: { success: true, userId: "..." }
```

---

## ✅ SAFE TESTING WORKFLOW

### **Before Testing:**

1. **Create test org** (recommended):
```bash
# In your app UI or via SQL:
INSERT INTO orgs (name, slug, org_type, status)
VALUES ('TEST - Dev Environment', 'test-dev', 'COMMUNITY', 'ACTIVE');
```

2. **Or use naming convention** in existing org:
```typescript
// All test users must follow pattern:
test.*@example.com
```

---

### **During Testing:**

1. **Create test users** with clear names:
```typescript
await createTestUser('test.member.1@example.com', 'Test', 'Member #1')
await createTestUser('test.owner@example.com', 'Test', 'Owner')
await createTestUser('test.voter@example.com', 'Test', 'Voter')
```

2. **Test your features** freely:
   - Create resolutions
   - Test voting
   - Test member management
   - Test financial features

3. **Check test user count** periodically:
```typescript
const { stats } = await getTestUserStats(orgId)
console.log(`Active test users: ${stats.active}`)
```

---

### **After Testing:**

1. **Review test users**:
```typescript
const { users } = await listTestUsers(orgId)
console.log('Test users to clean:', users)
```

2. **Mark as LEFT** (soft delete):
```typescript
const result = await markTestUsersAsLeft(orgId)
console.log(`Cleaned ${result.count} test users`)
```

3. **Verify cleanup**:
```typescript
const { stats } = await getTestUserStats(orgId)
// stats.active should be 0
// stats.left should be increased
```

---

## 🚫 WHAT NOT TO DO

### ❌ NEVER Delete Users
```typescript
// ❌ FORBIDDEN:
await supabase.from('users').delete().eq('id', userId)

// ✅ CORRECT:
await updateMemberStatus(orgId, userId, 'LEFT', 'Test completed')
```

### ❌ NEVER Delete Memberships
```typescript
// ❌ FORBIDDEN:
await supabase.from('memberships').delete().eq('id', membershipId)

// ✅ CORRECT:
// Change member_status to LEFT instead
```

### ❌ NEVER Delete Organizations
```typescript
// ❌ FORBIDDEN:
await supabase.from('orgs').delete().eq('id', orgId)

// ✅ CORRECT:
await supabase.from('orgs').update({ status: 'INACTIVE' }).eq('id', orgId)
```

---

## 📊 MONITORING TEST DATA

### **Query: Active Test Users**

```sql
-- Find active test users in org
SELECT 
  u.email,
  u.first_name,
  u.last_name,
  m.member_status,
  m.created_at
FROM memberships m
JOIN users u ON u.id = m.user_id
WHERE m.org_id = 'YOUR_ORG_ID'
  AND (u.email ILIKE 'test.%' OR u.first_name = 'Test')
  AND m.member_status != 'LEFT'
ORDER BY m.created_at DESC;
```

### **Query: Test User Activity**

```sql
-- See what test users have done (audit trail)
SELECT 
  al.action,
  al.target_table,
  al.created_at,
  u.email
FROM audit_logs al
JOIN users u ON u.id = al.user_id
WHERE al.org_id = 'YOUR_ORG_ID'
  AND (u.email ILIKE 'test.%' OR u.first_name = 'Test')
ORDER BY al.created_at DESC
LIMIT 50;
```

---

## 🎯 QUICK REFERENCE

| Action | Tool | Safe? |
|--------|------|-------|
| Create test org | UI or SQL INSERT | ✅ Yes |
| Create test user | `createTestUser()` | ✅ Yes |
| List test users | `listTestUsers()` | ✅ Yes |
| Check stats | `getTestUserStats()` | ✅ Yes |
| Cleanup | `markTestUsersAsLeft()` | ✅ Yes |
| Delete users | ❌ N/A | ❌ **FORBIDDEN** |
| Delete org | ❌ N/A | ❌ **FORBIDDEN** |

---

## 🔒 GOVERNANCE COMPLIANCE

All test helper functions are **Constitution-compliant**:

- ✅ No deletions (Rule #5)
- ✅ Audit trail preserved
- ✅ Historical data intact
- ✅ Uses LEFT status (valid lifecycle)
- ✅ Requires OWNER permission
- ✅ Logs all cleanup actions

---

## 📝 EXAMPLE: Complete Test Session

```typescript
// 1. Setup
const testOrg = await createOrg({
  name: 'TEST - Feature Development',
  slug: 'test-features',
  org_type: 'COMMUNITY'
})

// 2. Create test users
await createTestUser('test.owner@example.com', 'Test', 'Owner')
await createTestUser('test.member.1@example.com', 'Test', 'Member #1')
await createTestUser('test.member.2@example.com', 'Test', 'Member #2')

// 3. Test your features
// ... create resolutions, vote, etc ...

// 4. Check stats
const { stats } = await getTestUserStats(testOrg.id)
console.log(`Created ${stats.active} test users`)

// 5. Cleanup after testing
const { count } = await markTestUsersAsLeft(testOrg.id)
console.log(`Cleaned up ${count} test users`)

// 6. Verify
const finalStats = await getTestUserStats(testOrg.id)
console.log(`Active: ${finalStats.active}, Left: ${finalStats.left}`)
// Output: Active: 0, Left: 3 ✅
```

---

## 🆘 FAQ

**Q: Ar galiu tiesiog ištrinti test users po testavimo?**  
A: ❌ NE. Tai prieštarauja Constitution Rule #5. Naudokite LEFT statusą.

**Q: Ar LEFT users rodomi member sąraše?**  
A: Ne, jei filtruojate tik ACTIVE. Bet jie lieka duomenų bazėje.

**Q: Ar LEFT users gali balsuoti?**  
A: Ne, voting logic tikrina tik ACTIVE members.

**Q: Ar galiu reuse LEFT user?**  
A: Techniškai taip (LEFT → ACTIVE), bet geriau kurti naują.

**Q: Kas atsitiks su test user resolutions/votes?**  
A: Jie lieka duomenų bazėje (audit trail). LEFT users nebeturi teisių, bet istorija išlieka.

**Q: Ar reikia cleanup po kiekvieno test session?**  
A: Neprivaloma, bet rekomenduojama. Neleidžia test data užteršti analytics.

---

## ✅ SUMMARY

**SAFE:**
- ✅ Create test org
- ✅ Create test users (with convention)
- ✅ Mark as LEFT after testing
- ✅ Use test-helpers utilities

**FORBIDDEN:**
- ❌ Delete users
- ❌ Delete memberships
- ❌ Delete organizations
- ❌ Bypass audit logging

**REMEMBER:**
> "Members are NEVER deleted. Status changes with audit trail preserve constitutional compliance."

---

**You are now ready to test safely!** 🎉

