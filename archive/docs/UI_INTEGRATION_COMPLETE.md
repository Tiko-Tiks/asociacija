# 🎨 UI INTEGRATION - TEST HELPERS

## ✅ **SUKURTI KOMPONENTAI:**

### **1. Test User Management Page** (Full Featured)
**File:** `src/app/(dashboard)/dashboard/[slug]/admin/test-users/page.tsx`

**Route:** `/dashboard/{slug}/admin/test-users`

**Features:**
- ✅ Create test users form
- ✅ Statistics dashboard (4 cards)
- ✅ Test user list (Active + Left)
- ✅ Cleanup button
- ✅ Quick templates
- ✅ Real-time stats update

**Access:** OWNER only

---

### **2. Test User Management Component** (React)
**File:** `src/components/admin/test-user-management.tsx`

**Features:**
- Create test user form with validation
- Live statistics (Total, Active, Left, Other)
- Test user list with status badges
- Bulk cleanup functionality
- Quick email templates
- Success/error messages
- Loading states

---

### **3. Test User Stats Widget** (Dashboard Widget)
**File:** `src/components/admin/test-user-stats-widget.tsx`

**Features:**
- Compact card for dashboard
- Shows total/active/left counts
- Warning if active tests exist
- Link to full management page
- Auto-hides if no test users

**Usage:**
```tsx
// Add to owner dashboard:
<TestUserStatsWidget orgId={org.id} orgSlug={org.slug} />
```

---

## 🎯 **KAIP NAUDOTI:**

### **Option 1: Direct Access (Recommended)**

Pridėkite link į admin navigation:

```tsx
// src/components/navigation/admin-nav.tsx
<NavItem 
  href={`/dashboard/${slug}/admin/test-users`}
  icon={<Users />}
>
  Test Users
</NavItem>
```

### **Option 2: Dashboard Widget**

Pridėkite widget į owner dashboard:

```tsx
// src/app/(dashboard)/dashboard/[slug]/page.tsx
import { TestUserStatsWidget } from '@/components/admin/test-user-stats-widget'

// In your dashboard layout:
{isOwner && (
  <TestUserStatsWidget orgId={org.id} orgSlug={org.slug} />
)}
```

---

## 📸 **SCREENSHOTS (konceptuali struktūra):**

### **Test User Management Page:**

```
┌─────────────────────────────────────────────────────┐
│ Test User Management                                │
│ Valdykite test users development/testing metu      │
├─────────────────────────────────────────────────────┤
│ ⚠️ Development Only: Šis įrankis skirtas tik...   │
├─────────────────────────────────────────────────────┤
│ [Total: 10] [Active: 7] [Left: 2] [Other: 1]      │
├──────────────────────┬──────────────────────────────┤
│ 📝 Sukurti Test User │ 🗑️  Cleanup Actions          │
│                      │                              │
│ Email:               │ Cleanup 7 Test Users         │
│ [test.user.1@...]    │ [Cleanup Button]             │
│                      │                              │
│ First Name:          │ Quick Templates:             │
│ [Test]               │ • test.voter.1@...           │
│                      │ • test.chairman@...          │
│ Last Name:           │ • test.member.1@...          │
│ [User #1]            │                              │
│                      │                              │
│ [Sukurti Test User]  │                              │
└──────────────────────┴──────────────────────────────┘

Test Users (10)
┌─────────────────────────────────────────────────────┐
│ Active (7)                                          │
│ • Test User #1    test.user.1@...    [ACTIVE]     │
│ • Test Voter      test.voter@...     [ACTIVE]     │
│ ...                                                 │
│                                                     │
│ Left (2)                                            │
│ • Test Old User   test.old@...       [LEFT]       │
│ ...                                                 │
└─────────────────────────────────────────────────────┘
```

### **Dashboard Widget:**

```
┌──────────────────────┐
│ Test Users      👥   │
│                      │
│ 10 total             │
│ [7 active] [2 left]  │
│                      │
│ ⚠️ Test users        │
│    reikia cleanup    │
│                      │
│ [Manage Test Users →]│
└──────────────────────┘
```

---

## 🚀 **INTEGRATION STEPS:**

### **Step 1: Add Route to Navigation**

Update your admin navigation menu:

```tsx
// Example: src/components/navigation/admin-menu.tsx
import { Users, Settings, BarChart } from 'lucide-react'

const adminMenuItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: BarChart },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  { href: '/admin/test-users', label: 'Test Users', icon: Users }, // ← ADD THIS
]
```

### **Step 2: Add Widget to Dashboard (Optional)**

```tsx
// src/app/(dashboard)/dashboard/[slug]/page.tsx
import { TestUserStatsWidget } from '@/components/admin/test-user-stats-widget'

export default async function DashboardPage({ params }: PageProps) {
  // ... existing code ...

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Existing widgets */}
      <StatWidget title="Members" value={memberCount} />
      <StatWidget title="Resolutions" value={resolutionCount} />
      
      {/* Add test user widget for OWNER */}
      {isOwner && (
        <TestUserStatsWidget 
          orgId={selectedOrg.id} 
          orgSlug={selectedOrg.slug} 
        />
      )}
    </div>
  )
}
```

### **Step 3: Test the UI**

1. Login as OWNER
2. Navigate to `/dashboard/{slug}/admin/test-users`
3. Create test user
4. View statistics update
5. Test cleanup functionality

---

## 🎨 **UI FEATURES:**

### **1. Form Validation:**
```tsx
// Email validation
if (!email.startsWith('test.')) {
  // Shows warning in UI
}

// Real-time validation
onChange={(e) => setEmail(e.target.value)}
```

### **2. Quick Templates:**
```tsx
// Click to auto-fill form
<button onClick={() => {
  setEmail('test.voter.1@example.com')
  setLastName('Voter #1')
}}>
  test.voter.1@example.com
</button>
```

### **3. Statistics Cards:**
```tsx
// Live updating stats
useEffect(() => {
  loadStats()
}, [orgId])

// Shows: Total, Active, Left, Other
<Card>
  <CardTitle>Active</CardTitle>
  <div className="text-2xl">{stats.active}</div>
</Card>
```

### **4. Status Badges:**
```tsx
// Color-coded by status
<Badge variant="outline" className="bg-green-50">
  ACTIVE
</Badge>

<Badge variant="outline">
  LEFT
</Badge>
```

### **5. Cleanup Confirmation:**
```tsx
// Safety confirmation
if (!confirm('Ar tikrai norite pažymėti visus test users kaip LEFT?')) {
  return
}
```

---

## 🔒 **SECURITY:**

### **Access Control:**
```tsx
// Page level - OWNER only
if (membership.role !== MEMBERSHIP_ROLE.OWNER) {
  redirect(`/dashboard/${params.slug}`)
}
```

### **Server Actions:**
```typescript
// All actions require OWNER permission
const { data: membership } = await supabase
  .from('memberships')
  .select('role')
  .eq('role', MEMBERSHIP_ROLE.OWNER)
  // ... throws if not OWNER
```

---

## 📱 **RESPONSIVE DESIGN:**

```tsx
// Mobile-first grid
<div className="grid gap-4 md:grid-cols-2">
  {/* Forms side-by-side on desktop */}
</div>

<div className="grid gap-4 md:grid-cols-4">
  {/* 4 stat cards on desktop, stacked on mobile */}
</div>
```

---

## 🎯 **EXAMPLE WORKFLOW (UI):**

1. **Navigate:** `/dashboard/my-org/admin/test-users`
2. **See Stats:** Total: 3, Active: 3, Left: 0
3. **Click Template:** "test.voter.1@example.com"
4. **Form Auto-fills:** Email and Last Name populated
5. **Click Create:** "✅ Test user sukurtas"
6. **Stats Update:** Total: 4, Active: 4
7. **List Updates:** New user appears in Active section
8. **After Testing:** Click "Cleanup 4 Test Users"
9. **Confirm:** Modal confirmation
10. **Success:** "✅ Pažymėta 4 test users kaip LEFT"
11. **Stats Update:** Active: 0, Left: 4
12. **List Updates:** Users moved to Left section (grayed out)

---

## 🐛 **ERROR HANDLING:**

### **User-Friendly Messages:**
```tsx
// Success
setMessage({ 
  type: 'success', 
  text: '✅ Test user sukurtas: test.user.1@example.com' 
})

// Error
setMessage({ 
  type: 'error', 
  text: 'User su tokiu email jau egzistuoja' 
})
```

### **Loading States:**
```tsx
<Button disabled={loading}>
  {loading ? 'Kuriama...' : 'Sukurti Test User'}
</Button>
```

---

## 📋 **FILES CREATED:**

```
✅ src/app/(dashboard)/dashboard/[slug]/admin/test-users/page.tsx
   - Full page with access control
   
✅ src/components/admin/test-user-management.tsx
   - Main management component (400+ lines)
   
✅ src/components/admin/test-user-stats-widget.tsx
   - Dashboard widget (compact)
```

**Total:** 3 files, ~600 lines of UI code

---

## 🎉 **READY TO USE!**

**Pridėkite link į navigation ir galite naudoti:**

```tsx
<Link href="/dashboard/{slug}/admin/test-users">
  Test User Management
</Link>
```

**Arba dashboard widget:**

```tsx
<TestUserStatsWidget orgId={org.id} orgSlug={org.slug} />
```

---

**Ar norite:**
1. Pamatyti kaip pridėti link į navigation menu?
2. Sukurti migration scriptą test org sukūrimui?
3. Dar kažką pridėti?

