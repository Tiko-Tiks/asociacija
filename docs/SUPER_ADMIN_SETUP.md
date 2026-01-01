# Super Admin Dashboard Setup Guide

## Overview

The Super Admin Dashboard ("Platform Core") is a Mission Control center for managing the entire Branduolys ecosystem. It's located at `/admin` and provides full system access.

## Security Configuration

### Environment Variables

**CRITICAL**: Set the following environment variable in your `.env.local`:

```bash
NEXT_PUBLIC_SUPER_ADMINS=user-id-1,user-id-2,user-id-3
```

- Format: Comma-separated list of user UUIDs
- Only users with IDs in this list can access `/admin`
- If not set or user not in list, returns 404 (doesn't reveal route exists)

### Service Role Key

**CRITICAL**: Set the Supabase service role key:

```bash
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

- Required for admin operations that bypass RLS
- Never expose this to client-side code
- Only used in server-side admin actions

## Features

### 1. Global Metrics Dashboard
- **Total Communities**: Active, Pending, Suspended counts
- **Total Users**: User count and growth metrics
- **Financial Overview**: Revenue, invoices, payment status
- **System Health**: Database status monitoring

### 2. Community Registry (CRM)
- **Table View**: All organizations with details
- **Columns**: Title, Created Date, Member Count, Status, Owner Email
- **Actions**:
  - **Suspenduoti**: Suspend organization (disables public page)
  - **Patvirtinti**: Activate/approve pending organizations
  - **Ghost Login**: View organization dashboard as owner (for debugging)

### 3. Global Broadcast System
- **Send to All Owners**: Create notifications for all community owners
- **Global Announcements**: Create announcements visible on all dashboards
- **Types**: System Updates, Important Messages, Marketing
- **Priority Levels**: Low, Medium, High

### 4. AI Brain Monitor
- **Usage Stats**: Total requests, tokens, estimated costs
- **Top Communities**: Communities using AI features most
- **System Prompt Editor**: Update AI system prompt across platform

## File Structure

```
src/
├── app/
│   ├── admin/
│   │   ├── layout.tsx          # Security middleware
│   │   └── page.tsx            # Main dashboard
│   └── actions/
│       └── admin/
│           ├── global-stats.ts # Global metrics
│           ├── manage-orgs.ts  # Org management
│           └── broadcast.ts   # Broadcast system
├── components/
│   └── admin/
│       ├── super-admin-dashboard.tsx  # Main dashboard component
│       ├── global-stats.tsx           # Metrics display
│       ├── org-registry-table.tsx     # CRM table
│       ├── system-broadcast.tsx       # Broadcast UI
│       └── ai-brain-monitor.tsx       # AI monitoring
└── lib/
    └── supabase/
        └── admin.ts            # Service role client
```

## Access Control

### Security Layers

1. **Layout Guard** (`src/app/admin/layout.tsx`):
   - Checks authentication
   - Validates user ID against `NEXT_PUBLIC_SUPER_ADMINS`
   - Returns 404 if not authorized (doesn't reveal route)

2. **Service Role Client** (`src/lib/supabase/admin.ts`):
   - Bypasses RLS for admin operations
   - Only used in server-side actions
   - Never exposed to client

3. **Server Actions**:
   - All admin operations are server-side only
   - No direct database access from client

## Usage

### Getting User ID for Super Admin

1. Login as the user you want to make super admin
2. Check browser console or database for user ID
3. Add to `NEXT_PUBLIC_SUPER_ADMINS` environment variable
4. Restart Next.js server

### Accessing Dashboard

1. Login as super admin user
2. Navigate to `/admin`
3. Dashboard loads with all modules

### Suspending an Organization

1. Go to "Communities" tab
2. Find organization in table
3. Click actions menu (three dots)
4. Select "Suspenduoti"
5. Organization status changes to SUSPENDED

### Sending Broadcast

1. Go to "Broadcast" tab
2. Select broadcast type
3. Choose notification or announcement
4. Set priority
5. Enter title and message
6. Click "Send Broadcast"

## Database Tables Required

### Notifications Table (Optional)
If you want to use the broadcast notification feature:

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  org_id UUID REFERENCES orgs(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Announcements Table (Optional)
If you want to use global announcements:

```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### System Config Table (Optional)
For storing system prompt:

```sql
CREATE TABLE system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Troubleshooting

### Issue: 404 when accessing /admin
- **Check**: Is user ID in `NEXT_PUBLIC_SUPER_ADMINS`?
- **Check**: Is environment variable set correctly?
- **Check**: Did you restart the server after setting env var?

### Issue: Service role errors
- **Check**: Is `SUPABASE_SERVICE_ROLE_KEY` set?
- **Check**: Is the key valid?
- **Check**: Server-side only (not exposed to client)

### Issue: Broadcast not working
- **Check**: Does `notifications` table exist?
- **Check**: Are RLS policies allowing inserts?
- **Check**: Server logs for errors

## Security Notes

⚠️ **CRITICAL SECURITY WARNINGS**:

1. **Never commit** `SUPABASE_SERVICE_ROLE_KEY` to version control
2. **Never expose** service role client to client-side code
3. **Limit** `NEXT_PUBLIC_SUPER_ADMINS` to minimal necessary users
4. **Audit** all admin actions (they bypass RLS)
5. **Monitor** admin access logs

## Future Enhancements

- [ ] AI usage tracking and cost calculation
- [ ] User growth charts (last 30 days)
- [ ] Database health monitoring
- [ ] Audit log viewer for admin actions
- [ ] Advanced filtering and search in org registry
- [ ] Bulk operations for organizations

