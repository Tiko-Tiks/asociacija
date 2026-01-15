# 🚀 QUICK START: Testing Safely

## ⚡ **TL;DR**

**Ar saugu testuoti?** ✅ **TAIP**  
**Ar galima ištrinti test users?** ❌ **NE**  
**Kaip "pašalinti" test users?** ✅ **Pažymėti kaip LEFT**

---

## 🎯 **2 MINUTE SETUP**

### **Step 1: Sukurti Test User** (5 sek)

```typescript
import { createTestUser } from '@/app/actions/test-helpers'

await createTestUser(
  'test.user.1@example.com',  // ⚠️ MUST start with "test."
  'Test',                      // ⚠️ MUST be "Test"  
  'User #1'                    // Any descriptor
)
```

### **Step 2: Testuoti** (laisvai)

```typescript
// Daryk ką nori:
// - Create resolutions
// - Vote
// - Test member management
// - etc.
```

### **Step 3: Cleanup** (5 sek)

```typescript
import { markTestUsersAsLeft } from '@/app/actions/test-helpers'

await markTestUsersAsLeft(orgId)
// ✅ Visi test users dabar LEFT status
// ✅ Audit trail išlieka
// ✅ Constitution compliant
```

---

## 📋 **NAMING CONVENTION**

### ✅ **CORRECT TEST USERS:**

```
test.user.1@example.com          → Test User #1
test.voter@example.com           → Test Voter
test.chairman@example.com        → Test Chairman  
test.member.active@example.com   → Test Active Member
test.owner@example.com           → Test Owner
```

### ❌ **WRONG (won't auto-cleanup):**

```
user1@example.com               → User One
john.test@example.com           → John Test
developer@example.com           → Developer
```

---

## 🛠️ **AVAILABLE TOOLS**

| Function | Usage | Result |
|----------|-------|--------|
| `createTestUser()` | Sukurti test user | Returns userId |
| `listTestUsers()` | Parodyti test users | Array of users |
| `getTestUserStats()` | Gauti statistiką | Stats object |
| `markTestUsersAsLeft()` | Cleanup | Count of cleaned |

---

## 🔥 **FULL EXAMPLE**

```typescript
import { 
  createTestUser, 
  listTestUsers,
  getTestUserStats,
  markTestUsersAsLeft 
} from '@/app/actions/test-helpers'

// === SETUP ===
// 1. Create test users
await createTestUser('test.owner@example.com', 'Test', 'Owner')
await createTestUser('test.member.1@example.com', 'Test', 'Member #1')
await createTestUser('test.member.2@example.com', 'Test', 'Member #2')

// 2. Check what we have
const { stats } = await getTestUserStats(orgId)
console.log(`Created ${stats.active} test users`) // 3

// === TESTING ===
// 3. Test your features freely
// ... your test code here ...

// === CLEANUP ===
// 4. List test users before cleanup
const { users } = await listTestUsers(orgId)
console.log('Test users:', users.map(u => u.email))

// 5. Mark as LEFT (soft delete)
const { count } = await markTestUsersAsLeft(orgId)
console.log(`Cleaned ${count} test users`)

// 6. Verify cleanup
const finalStats = await getTestUserStats(orgId)
console.log(`Active: ${finalStats.active}, Left: ${finalStats.left}`)
// Output: Active: 0, Left: 3 ✅
```

---

## 🚨 **IMPORTANT RULES**

### ✅ **ALLOWED:**
- Create test users with `test.` email prefix
- Mark test users as LEFT after testing
- Keep test users in database (audit trail)
- Reuse test org for multiple test sessions

### ❌ **FORBIDDEN:**
- Delete users (`DELETE FROM users`)
- Delete memberships (`DELETE FROM memberships`)
- Delete organizations
- Bypass audit logging

---

## 💡 **TIPS**

### **Tip 1: Use Test Organization**
```typescript
// Create dedicated test org (recommended):
{
  name: "TEST - Development",
  slug: "test-dev",
  description: "⚠️ TEST ENVIRONMENT"
}
// All test data isolated ✅
```

### **Tip 2: Check Stats Often**
```typescript
// During long test session:
const { stats } = await getTestUserStats(orgId)
if (stats.active > 10) {
  console.warn('⚠️ Many test users, consider cleanup')
}
```

### **Tip 3: Batch Cleanup**
```typescript
// Clean up at end of day/sprint:
await markTestUsersAsLeft(testOrgId)
// Removes clutter from active members list
```

---

## 🎯 **ONE-LINER SCRIPTS**

### **Create 5 test voters:**
```typescript
for (let i = 1; i <= 5; i++) {
  await createTestUser(`test.voter.${i}@example.com`, 'Test', `Voter #${i}`)
}
```

### **Check test user count:**
```typescript
const { stats } = await getTestUserStats(orgId)
console.log(`Active: ${stats.active}, Left: ${stats.left}`)
```

### **Cleanup all test users:**
```typescript
const { count } = await markTestUsersAsLeft(orgId)
console.log(`✅ Cleaned ${count} test users`)
```

---

## 📊 **SQL QUERIES (optional)**

### **Manual check test users:**
```sql
SELECT 
  u.email,
  u.first_name,
  m.member_status
FROM memberships m
JOIN users u ON u.id = m.user_id
WHERE m.org_id = 'YOUR_ORG_ID'
  AND (u.email ILIKE 'test.%' OR u.first_name = 'Test')
ORDER BY m.created_at DESC;
```

### **Count by status:**
```sql
SELECT 
  m.member_status,
  COUNT(*) as count
FROM memberships m
JOIN users u ON u.id = m.user_id
WHERE m.org_id = 'YOUR_ORG_ID'
  AND (u.email ILIKE 'test.%' OR u.first_name = 'Test')
GROUP BY m.member_status;
```

---

## ✅ **CHECKLIST**

Before testing:
- [ ] Created test org OR using proper naming convention
- [ ] Know how to cleanup (markTestUsersAsLeft)

During testing:
- [ ] All test users start with `test.` email
- [ ] All test users have first_name = `Test`
- [ ] Testing features freely

After testing:
- [ ] Run `markTestUsersAsLeft(orgId)`
- [ ] Verify cleanup with `getTestUserStats(orgId)`
- [ ] Audit trail preserved ✅

---

## 🆘 **EMERGENCY CLEANUP**

If you accidentally created many users without `test.` prefix:

```typescript
// Option 1: Manually mark each as LEFT
await updateMemberStatus(orgId, userId, 'LEFT', 'Test cleanup')

// Option 2: SQL (if you know what you're doing)
UPDATE memberships 
SET member_status = 'LEFT',
    status_reason = 'Test cleanup'
WHERE org_id = 'ORG_ID' 
  AND user_id IN ('id1', 'id2', 'id3');
```

---

## 📚 **MORE INFO**

Full documentation: `TESTING_SAFETY_GUIDE.md`  
Test helpers code: `src/app/actions/test-helpers.ts`

---

**Happy Testing! 🎉**

Remember: **LEFT status, NOT delete** ✅

