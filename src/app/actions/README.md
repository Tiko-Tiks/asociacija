# Server Actions Directory

All server-side logic lives here. Each file exports one or more server actions.

## File Organization

### Core Actions
- `auth.ts` - Authentication (login, logout, password reset, membership state)
- `organizations.ts` - Organization CRUD operations
- `members.ts` - Member management, invitations
- `onboarding.ts` - Onboarding status and readiness checks
- `onboarding-status.ts` - Onboarding workflow status

### Governance
- `governance.ts` - Main governance operations
- `governance-config.ts` - Governance configuration
- `governance-questions.ts` - Questionnaire management
- `governance-draft.ts` - Draft governance handling
- `governance-submission.ts` - Submit governance for review
- `governance-compliance.ts` - Compliance checking
- `consents.ts` - Member consents management
- `org-activation.ts` - Organization activation workflow

### Voting & Resolutions
- `resolutions.ts` - Resolution CRUD and voting
- `voting.ts` - Voting logic
- `live-voting.ts` - Live voting updates
- `get-vote-by-resolution.ts` - Get vote details

### Projects & Ideas
- `projects.ts` - Project management
- `ideas.ts` - Idea management
- `projectMembers.ts` - Project member operations
- `projectMemberMutations.ts` - Project member mutations
- `projectAuditLog.ts` - Project audit logging

### Meetings & Protocols
- `meetings.ts` - Meeting management
- `meeting-attendance.ts` - Attendance tracking
- `protocols.ts` - Protocol management
- `generate-protocol-pdf.ts` - PDF generation

### Admin
- `admin.ts` - Admin operations
- `admin/global-stats.ts` - Global statistics
- `admin/manage-orgs.ts` - Organization management
- `admin/governance-questions.ts` - Governance questions admin
- `admin/org-review.ts` - Organization review
- `admin/broadcast.ts` - System broadcasts
- `admin/seed-system-core.ts` - System seeding
- `admin/update-org.ts` - Update organization
- `admin/branduolys-content.ts` - Content management

### Other
- `dashboard.ts` - Dashboard data
- `command-center.ts` - Command center data
- `member-dashboard.ts` - Member dashboard
- `member-profile.ts` - Member profile
- `member-requirements.ts` - Member requirements
- `member-status.ts` - Member status operations
- `positions.ts` - Position management
- `positions-assign.ts` - Position assignment
- `check-board-position.ts` - Board position checks
- `events.ts` - Event management
- `history.ts` - History/audit logs
- `audit-logs.ts` - Audit log queries
- `invoices.ts` - Invoice management
- `public-registry.ts` - Public organization registry
- `public-community-page.ts` - Public community page data
- `system-news.ts` - System news
- `ai-copilot.ts` - AI copilot functionality
- `update-profile.ts` - Profile updates
- `accept-invite.ts` - Accept membership invitation

### Internal Helpers
- `_guards.ts` - Permission guards (internal use)
- `_audit.ts` - Audit helpers (internal use)

## Patterns

### Server Action Structure
```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/app/actions/_guards'

export async function actionName(params: Type) {
  const supabase = await createClient()
  await requireAuth(supabase)
  
  // ... logic
  
  return result
}
```

### Error Handling
```typescript
import { authViolation, rlsBlocked } from '@/app/domain/errors'

try {
  // ... operation
} catch (error) {
  if (error.code === 'PGRST301') throw rlsBlocked()
  throw error
}
```

### Audit Logging
```typescript
import { logAudit } from '@/app/actions/_audit'

await logAudit(supabase, {
  org_id: orgId,
  action: 'ACTION_NAME',
  old_value: oldData,
  new_value: newData,
})
```

## Notes

- All actions use `'use server'` directive
- All actions use authenticated Supabase client (not service_role)
- RLS policies enforce access control
- Critical actions should log to audit_logs (soft mode)

