# 🔄 TEST USER SWITCHER - Setup Guide

## 🎯 **KĄ SUKŪRIAU:**

### **1. Test Users with Auth** ✅
**File:** `sql/create_test_users_with_auth.sql`

Creates 5 test users with known credentials:
- `test.owner@example.com` - OWNER
- `test.chairman@example.com` - MEMBER (Chairman)
- `test.member.1@example.com` - MEMBER
- `test.member.2@example.com` - MEMBER
- `test.voter@example.com` - MEMBER

**Password:** `Test123!` (same for all)

---

### **2. Test User Switcher UI** ✅
**File:** `src/components/dev/test-user-switcher.tsx`

Features:
- One-click switch between test users
- Shows current user
- Copy credentials button
- User role badges
- Purpose descriptions
- Dev-only rendering

---

### **3. Dev Tools Page** ✅
**File:** `src/app/(dashboard)/dev-tools/page.tsx`

Complete dev dashboard with:
- Test user switcher
- Test org status
- Test user stats
- Quick actions
- Current session info
- Documentation links

**Route:** `/dev-tools`

---

## 🚀 **SETUP (3 Steps):**

### **Step 1: Create Test Org** (if not done)
```sql
-- Run: sql/quick_test_org_setup.sql
-- Result: test-dev org created
```

### **Step 2: Create Test Users with Auth**

**Option A: Via Supabase Dashboard** (Recommended)

```
1. Go to: Supabase Dashboard → Authentication → Users
2. Click "Add user"
3. For each user:
   Email: test.owner@example.com
   Password: Test123!
   ✅ Auto Confirm User
   
4. Repeat for all 5 users:
   - test.owner@example.com
   - test.chairman@example.com
   - test.member.1@example.com
   - test.member.2@example.com
   - test.voter@example.com
```

**Option B: Via Auth API** (Programmatic)

```typescript
// Helper script (run once)
const users = [
  'test.owner@example.com',
  'test.chairman@example.com',
  'test.member.1@example.com',
  'test.member.2@example.com',
  'test.voter@example.com',
]

for (const email of users) {
  await supabase.auth.admin.createUser({
    email,
    password: 'Test123!',
    email_confirm: true,
  })
}
```

### **Step 3: Link Users to Test Org**
```sql
-- Run: sql/create_test_users_with_auth.sql
-- This creates public.users and memberships
```

---

## 🎨 **USAGE:**

### **Access Dev Tools:**

```
Navigate to: /dev-tools
```

You'll see:
- 📋 List of 5 test users
- 🔄 "Switch" button for each
- 👤 Current user indicator
- 📋 Copy credentials button
- ℹ️ Purpose descriptions

### **Switch Between Users:**

1. Click "Switch" button next to any user
2. Automatically logs in as that user
3. Redirects to `/dashboard/test-dev`
4. ✅ Now testing from that user's perspective!

### **Test Different Perspectives:**

```
1. Login as test.owner@example.com
   → Test owner actions (approve, settings)
   
2. Switch to test.member.1@example.com  
   → Test member actions (view, vote)
   
3. Switch to test.chairman@example.com
   → Test chairman features (meetings)
   
4. Switch to test.voter@example.com
   → Test voting flow
```

---

## 📊 **WHAT YOU CAN TEST:**

### **As Owner (test.owner@example.com):**
- ✅ Approve resolutions
- ✅ Manage members
- ✅ Change settings
- ✅ Access admin features
- ✅ Create & approve anything

### **As Member (test.member.1@example.com):**
- ✅ View resolutions
- ✅ Vote on proposals
- ✅ Create draft resolutions
- ✅ See member dashboard
- ❌ Cannot approve
- ❌ Cannot access admin

### **As Chairman (test.chairman@example.com):**
- ✅ Everything member can do
- ✅ Plus: Can be assigned Chairman position
- ✅ Test meeting flow

### **As Voter (test.voter@example.com):**
- ✅ Focus on voting features
- ✅ Test vote casting
- ✅ Test early voting

---

## 🔥 **EXAMPLE WORKFLOW:**

### **Test Resolution Approval Flow:**

```
1. Visit: /dev-tools
2. Login as test.member.1@example.com (click Switch)
3. Create draft resolution
4. Switch to test.owner@example.com
5. Approve the resolution
6. Switch back to test.member.1@example.com
7. See approved resolution
✅ Tested full flow from both perspectives!
```

### **Test Voting Flow:**

```
1. Login as test.owner@example.com
2. Create resolution & start vote
3. Switch to test.voter@example.com
4. Cast vote FOR
5. Switch to test.member.1@example.com
6. Cast vote AGAINST
7. Switch back to test.owner@example.com
8. Close vote & see results
✅ Tested voting from multiple users!
```

---

## 🛠️ **DEV TOOLS PAGE FEATURES:**

### **Test User Switcher:**
- 5 pre-configured users
- One-click switch
- Current user highlight
- Copy credentials button
- Role badges

### **Test Org Info:**
- Org name, slug, status
- Quick link to dashboard
- Verification status

### **Test User Stats:**
- Total, Active, Left counts
- Link to management page

### **Quick Actions:**
- Jump to dashboard
- Manage test users
- Test org dashboard

### **Current Session:**
- Shows logged-in user
- User ID, email
- Last sign in time

---

## 🎯 **CREDENTIALS QUICK REFERENCE:**

```
═══════════════════════════════════════════
    TEST USER CREDENTIALS
═══════════════════════════════════════════

All passwords: Test123!

test.owner@example.com       → OWNER
test.chairman@example.com    → MEMBER (Chairman)
test.member.1@example.com    → MEMBER
test.member.2@example.com    → MEMBER  
test.voter@example.com       → MEMBER

Organization: test-dev
Dev Tools: /dev-tools
Dashboard: /dashboard/test-dev

═══════════════════════════════════════════
```

---

## 🔒 **SECURITY:**

### **Dev-Only Checks:**

```typescript
// In component:
if (process.env.NODE_ENV !== 'development') {
  return null // Don't render
}

// In page:
if (process.env.NODE_ENV !== 'development') {
  redirect('/') // Block access
}
```

### **Production Safety:**
- ✅ Only renders in development
- ✅ Page redirects in production
- ✅ No exposure of credentials
- ✅ Clear visual warnings

### **Best Practices:**
- Never commit production passwords
- Use different passwords in staging
- Delete test users before production
- Keep test org separate

---

## 📱 **UI FEATURES:**

### **User Card Shows:**
```
┌─────────────────────────────────────────┐
│ 👑 Test Owner            [OWNER] [Current] │
│ Test owner actions, approvals, settings  │
│ test.owner@example.com [📋 Copy]        │
│                              [Switch]   │
└─────────────────────────────────────────┘
```

### **Color Coding:**
- 👑 Owner - Yellow
- 👥 Chairman - Blue
- 👤 Members - Gray
- 🗳️ Voter - Green

### **Status Badges:**
- `Current` - You're logged in as this user
- `OWNER` / `MEMBER` - Role badge
- `DEV ONLY` - Page warning badge

---

## 🎨 **INTEGRATION:**

### **Add Link to Navigation:**

```tsx
// In your navigation menu
{process.env.NODE_ENV === 'development' && (
  <Link href="/dev-tools">
    <TestTube className="mr-2 h-4 w-4" />
    Dev Tools
    <Badge variant="outline" className="ml-2">DEV</Badge>
  </Link>
)}
```

### **Add Keyboard Shortcut:**

```tsx
// Command palette
{
  id: 'dev-tools',
  label: 'Open Dev Tools',
  shortcut: '⌘+D',
  action: () => router.push('/dev-tools'),
  hidden: process.env.NODE_ENV !== 'development',
}
```

---

## ✅ **VERIFICATION:**

### **Check Setup:**

```sql
-- Verify all test users exist
SELECT 
  u.email,
  m.role,
  m.member_status,
  EXISTS(SELECT 1 FROM auth.users au WHERE au.email = u.email) as has_auth
FROM users u
LEFT JOIN memberships m ON m.user_id = u.id
JOIN orgs o ON o.id = m.org_id
WHERE u.email LIKE 'test.%@example.com'
  AND o.slug = 'test-dev'
ORDER BY u.email;
```

Expected: All 5 users with `has_auth = true`

### **Test Switching:**

1. Go to `/dev-tools`
2. Click "Switch" on any user
3. Should login and redirect
4. Check dashboard shows correct user
5. Switch to another user
6. ✅ Should switch successfully

---

## 🆘 **TROUBLESHOOTING:**

### **"Login failed: Invalid login credentials"**
→ User doesn't exist in `auth.users`. Create via Supabase Dashboard.

### **"Can't see dev tools page"**
→ Check `process.env.NODE_ENV === 'development'`

### **"User switches but shows wrong org"**
→ User might not have membership in test-dev. Run SQL script.

### **"Switch button disabled"**
→ You're already logged in as that user (Current badge).

---

## 📚 **FILES CREATED:**

```
✅ sql/create_test_users_with_auth.sql
   - SQL script for user setup
   
✅ src/components/dev/test-user-switcher.tsx
   - Switcher component (400+ lines)
   
✅ src/app/(dashboard)/dev-tools/page.tsx
   - Dev tools page with full dashboard
```

---

## 🎉 **READY TO USE!**

**Setup Steps:**
1. ✅ Create test users in Supabase Dashboard
2. ✅ Run SQL script to link users
3. ✅ Navigate to `/dev-tools`
4. ✅ Start switching and testing!

**Time:** 5 minutes setup, instant switching after!

---

**Next:** Open `/dev-tools` and start testing! 🚀

