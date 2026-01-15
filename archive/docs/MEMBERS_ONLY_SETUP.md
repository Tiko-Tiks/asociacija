# ✅ PATAISYTA: Test Members Only Setup

## 🎯 **PAKEITIMAI:**

### **1. SQL Script Atnaujintas** ✅
**File:** `sql/create_test_users_with_auth.sql`

**Ištaisyta:**
- ❌ Removed: `test. Member,3@example.com` (tarpas + kablelis)
- ❌ Removed: `test. Member.4@example.com` (tarpas)
- ✅ Fixed: `test.member.3@example.com`
- ✅ Fixed: `test.member.4@example.com`
- ❌ Removed: test.owner@example.com (OWNER)
- ❌ Removed: test.chairman@example.com (MEMBER su specialia role)
- ✅ ALL users now MEMBER role only

**Nauji test users:**
```
1. test.member.1@example.com  → Test Member #1
2. test.member.2@example.com  → Test Member #2
3. test.member.3@example.com  → Test Member #3
4. test.member.4@example.com  → Test Member #4
5. test.voter@example.com     → Test Voter
```

**Visi:** MEMBER role, Password: Test123!

---

### **2. UI Switcher Atnaujintas** ✅
**File:** `src/components/dev/test-user-switcher.tsx`

**Pakeista:**
- Removed OWNER user (test.owner)
- Removed Chairman user (test.chairman)
- Updated to show 5 MEMBER users
- Color-coded for easy identification
- Added note about needing separate OWNER

**UI Shows:**
```
👤 Test Member #1    (blue)
👤 Test Member #2    (green)
👤 Test Member #3    (purple)
👤 Test Member #4    (orange)
🗳️ Test Voter        (gray)
```

---

## 🚀 **KAIP NAUDOTI:**

### **Step 1: Run SQL Script**
```sql
-- File: sql/create_test_users_with_auth.sql
-- Already has your org ID: 678b0788-b544-4bf8-8cf5-44dfb2185a52
-- Just run it!
```

### **Step 2: Create Auth Users in Supabase**
```
Supabase Dashboard → Authentication → Users

Create 5 users:
1. test.member.1@example.com / Test123!
2. test.member.2@example.com / Test123!
3. test.member.3@example.com / Test123!
4. test.member.4@example.com / Test123!
5. test.voter@example.com / Test123!

✅ Auto Confirm User = ON
```

### **Step 3: Use Switcher**
```
1. Navigate: /dev-tools
2. See 5 MEMBER users
3. Click "Switch" to any user
4. Test member features!
```

---

## 👥 **5 TEST MEMBERS:**

```
╔═══════════════════════════════════════════════╗
║         TEST MEMBERS (All MEMBER role)        ║
╠═══════════════════════════════════════════════╣
║ 1. test.member.1@example.com                  ║
║    Purpose: General member actions            ║
║    Color: Blue 👤                             ║
╠═══════════════════════════════════════════════╣
║ 2. test.member.2@example.com                  ║
║    Purpose: Multiple member interactions      ║
║    Color: Green 👤                            ║
╠═══════════════════════════════════════════════╣
║ 3. test.member.3@example.com                  ║
║    Purpose: Voting scenarios                  ║
║    Color: Purple 👤                           ║
╠═══════════════════════════════════════════════╣
║ 4. test.member.4@example.com                  ║
║    Purpose: Member permissions                ║
║    Color: Orange 👤                           ║
╠═══════════════════════════════════════════════╣
║ 5. test.voter@example.com                     ║
║    Purpose: Voting features                   ║
║    Color: Gray 🗳️                             ║
╚═══════════════════════════════════════════════╝

Password: Test123! (all)
Org: test-dev (678b0788-b544-4bf8-8cf5-44dfb2185a52)
```

---

## 🎯 **MEMBER CAPABILITIES:**

### **✅ KĄ GALI MEMBER:**
- View resolutions
- Vote on proposals
- Create draft resolutions
- View member dashboard
- Participate in meetings
- Access member features
- See events, projects
- View invoices

### **❌ KO NEGALI (Need OWNER):**
- Approve resolutions
- Manage member status
- Access admin features
- Change org settings
- Assign positions
- Delete content

---

## 🔥 **TESTING SCENARIOS:**

### **Scenario 1: Multi-Member Voting**
```
1. Login as your OWNER account
2. Create resolution & start vote
3. Switch to test.member.1@example.com → Vote FOR
4. Switch to test.member.2@example.com → Vote AGAINST
5. Switch to test.member.3@example.com → Vote FOR
6. Switch to test.voter@example.com → Vote FOR
7. Back to OWNER → Close vote
8. Check results: 3 FOR, 1 AGAINST
✅ Multi-member voting tested!
```

### **Scenario 2: Member Permissions**
```
1. Switch to test.member.1@example.com
2. Try to access admin page → Should block
3. Try to approve resolution → Should block
4. Try to create draft → Should work ✅
5. Try to vote → Should work ✅
✅ Permission boundaries tested!
```

### **Scenario 3: Member Interactions**
```
1. test.member.1 creates draft
2. test.member.2 views draft
3. OWNER approves → becomes PROPOSED
4. test.member.1, test.member.2, test.voter all vote
5. OWNER closes vote
✅ Full member lifecycle tested!
```

---

## 📊 **QUICK REFERENCE:**

| User | Email | Purpose | Vote Test |
|------|-------|---------|-----------|
| Member #1 | test.member.1@example.com | General | ✅ |
| Member #2 | test.member.2@example.com | Interactions | ✅ |
| Member #3 | test.member.3@example.com | Voting | ✅ |
| Member #4 | test.member.4@example.com | Permissions | ✅ |
| Voter | test.voter@example.com | Voting focus | ✅ |

---

## ✅ **VERIFICATION:**

### **Check Users in Database:**
```sql
SELECT 
  u.email,
  u.first_name,
  u.last_name,
  m.role,
  m.member_status
FROM users u
JOIN memberships m ON m.user_id = u.id
WHERE m.org_id = '678b0788-b544-4bf8-8cf5-44dfb2185a52'
  AND u.email LIKE 'test.%@example.com'
ORDER BY u.email;
```

**Expected output:**
```
email                        first_name  last_name   role    member_status
test.member.1@example.com    Test        Member #1   MEMBER  ACTIVE
test.member.2@example.com    Test        Member #2   MEMBER  ACTIVE
test.member.3@example.com    Test        Member #3   MEMBER  ACTIVE
test.member.4@example.com    Test        Member #4   MEMBER  ACTIVE
test.voter@example.com       Test        Voter       MEMBER  ACTIVE
```

---

## 💡 **IMPORTANT NOTES:**

### **⚠️ No OWNER in Test Users**
- Visi 5 users yra MEMBER role
- OWNER actions reikia naudoti savo tikrą accountą
- Arba sukurti separate OWNER test user manually

### **✅ Good for Testing:**
- Member perspectives
- Voting with multiple users
- Member permissions
- Member dashboard
- Member interactions

### **❌ Need Separate OWNER for:**
- Approval flows
- Admin features
- Settings changes
- Member management

---

## 🎉 **SUMMARY:**

**Pataisyta:**
- ✅ Email errors fixed (no spaces, commas)
- ✅ All users are MEMBER role
- ✅ Org ID already filled in (678b0788...)
- ✅ UI switcher updated
- ✅ 5 members ready to test

**Ready to use:**
1. Run SQL script
2. Create auth users in Supabase
3. Navigate to `/dev-tools`
4. Start switching! 🔄

---

**Dabar turite 5 test members su teisingais emails ir visi MEMBER role!** ✅

