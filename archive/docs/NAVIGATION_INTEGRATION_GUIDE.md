# 🎯 NAVIGATION INTEGRATION GUIDE

## Kaip pridėti Test User Management į navigaciją

---

## 📋 **OPTION 1: Admin Dropdown Menu** (Recommended)

Jei turite admin dropdown navigation:

```tsx
// Example: src/components/navigation/admin-dropdown.tsx
import { 
  Settings, 
  Users, 
  BarChart, 
  TestTube  // ← Add this icon
} from 'lucide-react'

const adminMenuItems = [
  {
    href: (slug: string) => `/dashboard/${slug}/admin/settings`,
    label: 'Settings',
    icon: Settings,
  },
  {
    href: (slug: string) => `/dashboard/${slug}/admin/analytics`,
    label: 'Analytics',
    icon: BarChart,
  },
  // ⭐ ADD THIS:
  {
    href: (slug: string) => `/dashboard/${slug}/admin/test-users`,
    label: 'Test Users',
    icon: TestTube,
    badge: process.env.NODE_ENV === 'development' ? 'DEV' : null,
  },
]
```

---

## 📋 **OPTION 2: Sidebar Navigation**

Jei turite sidebar su admin section:

```tsx
// Example: src/components/navigation/sidebar.tsx
<nav className="space-y-2">
  {/* Regular items */}
  <NavItem href="/dashboard">Dashboard</NavItem>
  <NavItem href="/resolutions">Resolutions</NavItem>
  
  {/* Admin section - OWNER only */}
  {isOwner && (
    <>
      <div className="pt-4 pb-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase">
          Admin
        </h3>
      </div>
      <NavItem href={`/dashboard/${slug}/admin/settings`}>
        <Settings className="h-4 w-4 mr-2" />
        Settings
      </NavItem>
      
      {/* ⭐ ADD THIS: */}
      {process.env.NODE_ENV === 'development' && (
        <NavItem href={`/dashboard/${slug}/admin/test-users`}>
          <TestTube className="h-4 w-4 mr-2" />
          Test Users
          <Badge variant="outline" className="ml-auto">DEV</Badge>
        </NavItem>
      )}
    </>
  )}
</nav>
```

---

## 📋 **OPTION 3: Command Palette (⌘K)**

Jei turite command palette:

```tsx
// Example: src/components/command-palette.tsx
import { useCommandPalette } from '@/hooks/use-command-palette'

const adminCommands = [
  {
    id: 'test-users',
    label: 'Manage Test Users',
    description: 'Create and cleanup test users',
    icon: TestTube,
    action: () => router.push(`/dashboard/${slug}/admin/test-users`),
    keywords: ['test', 'users', 'development', 'cleanup'],
    hidden: process.env.NODE_ENV !== 'development',
  },
]
```

---

## 📋 **OPTION 4: Quick Actions in Dashboard**

Pridėti kaip quick action card:

```tsx
// Example: src/app/(dashboard)/dashboard/[slug]/page.tsx
{isOwner && process.env.NODE_ENV === 'development' && (
  <Card className="hover:border-primary cursor-pointer">
    <Link href={`/dashboard/${slug}/admin/test-users`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Test Users
        </CardTitle>
        <CardDescription>
          Manage test users for development
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TestUserStatsWidget orgId={org.id} orgSlug={org.slug} />
      </CardContent>
    </Link>
  </Card>
)}
```

---

## 🎯 **COMPLETE EXAMPLE: Sidebar Implementation**

### **File:** `src/components/navigation/sidebar.tsx`

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { 
  LayoutDashboard,
  FileText,
  Users,
  Calendar,
  Settings,
  TestTube,
  ChevronDown
} from 'lucide-react'

interface SidebarProps {
  orgSlug: string
  isOwner: boolean
}

export function Sidebar({ orgSlug, isOwner }: SidebarProps) {
  const pathname = usePathname()
  const [adminExpanded, setAdminExpanded] = useState(true)

  const mainItems = [
    {
      href: `/dashboard/${orgSlug}`,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      href: `/dashboard/${orgSlug}/resolutions`,
      label: 'Resolutions',
      icon: FileText,
    },
    {
      href: `/dashboard/${orgSlug}/members`,
      label: 'Members',
      icon: Users,
    },
    {
      href: `/dashboard/${orgSlug}/events`,
      label: 'Events',
      icon: Calendar,
    },
  ]

  const adminItems = [
    {
      href: `/dashboard/${orgSlug}/admin/settings`,
      label: 'Settings',
      icon: Settings,
    },
    {
      href: `/dashboard/${orgSlug}/admin/test-users`,
      label: 'Test Users',
      icon: TestTube,
      badge: 'DEV',
      devOnly: true,
    },
  ]

  return (
    <aside className="w-64 border-r bg-card h-screen sticky top-0">
      <div className="p-6">
        <h2 className="text-lg font-semibold">Navigation</h2>
      </div>

      <nav className="px-3 space-y-1">
        {/* Main Navigation */}
        {mainItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              pathname === item.href
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}

        {/* Admin Section */}
        {isOwner && (
          <>
            <div className="pt-6 pb-2 px-3">
              <button
                onClick={() => setAdminExpanded(!adminExpanded)}
                className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground uppercase hover:text-foreground"
              >
                Admin
                <ChevronDown 
                  className={cn(
                    "h-3 w-3 transition-transform",
                    adminExpanded && "rotate-180"
                  )} 
                />
              </button>
            </div>

            {adminExpanded && adminItems.map((item) => {
              // Hide dev-only items in production
              if (item.devOnly && process.env.NODE_ENV !== 'development') {
                return null
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                    pathname === item.href
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  {item.badge && (
                    <Badge variant="outline" className="ml-auto text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              )
            })}
          </>
        )}
      </nav>
    </aside>
  )
}
```

---

## 🎨 **WITH VISUAL INDICATOR**

Pridėti visual indicator, kad yra aktyvių test users:

```tsx
// src/components/navigation/test-user-nav-item.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TestTube } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getTestUserStats } from '@/app/actions/test-helpers'

interface TestUserNavItemProps {
  orgId: string
  orgSlug: string
  className?: string
}

export function TestUserNavItem({ orgId, orgSlug, className }: TestUserNavItemProps) {
  const [activeCount, setActiveCount] = useState(0)

  useEffect(() => {
    loadStats()
  }, [orgId])

  const loadStats = async () => {
    const result = await getTestUserStats(orgId)
    if (result.success) {
      setActiveCount(result.stats.active)
    }
  }

  return (
    <Link
      href={`/dashboard/${orgSlug}/admin/test-users`}
      className={className}
    >
      <TestTube className="h-4 w-4 mr-2" />
      Test Users
      {activeCount > 0 && (
        <Badge variant="outline" className="ml-auto bg-yellow-50 text-yellow-700">
          {activeCount}
        </Badge>
      )}
    </Link>
  )
}
```

**Usage:**
```tsx
<TestUserNavItem 
  orgId={org.id} 
  orgSlug={org.slug}
  className="flex items-center px-3 py-2 hover:bg-muted"
/>
```

---

## 🔒 **ACCESS CONTROL PATTERN**

Universal pattern for showing admin items:

```tsx
// Helper function
function canAccessAdminTools(role: string, env: string) {
  return role === 'OWNER' && env === 'development'
}

// Usage in navigation
{canAccessAdminTools(userRole, process.env.NODE_ENV) && (
  <Link href="/admin/test-users">Test Users</Link>
)}
```

---

## 🎯 **ENVIRONMENT-AWARE DISPLAY**

Hide completely in production:

```tsx
// Option 1: Environment variable
{process.env.NODE_ENV === 'development' && (
  <Link href="/admin/test-users">Test Users</Link>
)}

// Option 2: Feature flag
{process.env.NEXT_PUBLIC_ENABLE_TEST_TOOLS === 'true' && (
  <Link href="/admin/test-users">Test Users</Link>
)}

// Option 3: Org-based (test orgs only)
{org.slug.startsWith('test-') && (
  <Link href="/admin/test-users">Test Users</Link>
)}
```

---

## 📱 **MOBILE NAVIGATION**

For mobile menu/drawer:

```tsx
// src/components/navigation/mobile-menu.tsx
<Sheet>
  <SheetContent side="left">
    <nav className="space-y-4">
      {/* Regular items */}
      <MobileNavItem href="/dashboard">Dashboard</MobileNavItem>
      
      {/* Admin section */}
      {isOwner && (
        <>
          <Separator />
          <div className="text-xs font-semibold text-muted-foreground uppercase">
            Admin
          </div>
          
          {process.env.NODE_ENV === 'development' && (
            <MobileNavItem href={`/dashboard/${slug}/admin/test-users`}>
              <TestTube className="h-4 w-4" />
              Test Users
              <Badge className="ml-2">DEV</Badge>
            </MobileNavItem>
          )}
        </>
      )}
    </nav>
  </SheetContent>
</Sheet>
```

---

## ✅ **QUICK CHECKLIST**

- [ ] Choose navigation pattern (sidebar/dropdown/command)
- [ ] Add route to navigation config
- [ ] Add OWNER role check
- [ ] Add environment check (development only)
- [ ] Add visual indicator (optional)
- [ ] Test navigation link works
- [ ] Test access control (non-OWNER can't access)
- [ ] Test in mobile view

---

## 🎉 **COMPLETE EXAMPLE FILE**

See full implementation in:
- `NAVIGATION_INTEGRATION_EXAMPLE.tsx` (next file)

**Choose the pattern that fits your existing navigation structure!**

