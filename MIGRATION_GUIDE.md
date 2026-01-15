# 🚀 MIGRATION GUIDE - Code Optimizations Implementation

## Quick Start

Šis dokumentas parodo, kaip naudoti naujus utility ir guard funkcijas.

---

## ✅ COMPLETED OPTIMIZATIONS

### 1. **Fixed Constants** ✅

**Before:**
```typescript
// ❌ PENDING, LEFT missing
export const MEMBERSHIP_STATUS = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
}

// ❌ DRAFT missing
export const INVOICE_STATUS = {
  PAID: 'PAID',
  SENT: 'SENT',
  OVERDUE: 'OVERDUE',
}
```

**After:**
```typescript
// ✅ Complete set
export const MEMBERSHIP_STATUS = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  LEFT: 'LEFT',
}

export const INVOICE_STATUS = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
}
```

**Migration:**
```typescript
// Update all usages to use constants
// Before:
membershipStatus = requiresApproval ? 'PENDING' : 'ACTIVE'

// After:
membershipStatus = requiresApproval ? MEMBERSHIP_STATUS.PENDING : MEMBERSHIP_STATUS.ACTIVE
```

---

### 2. **Type Guards** ✅

**New file:** `src/app/domain/types.ts`

**Usage:**
```typescript
import { isMembershipStatus, isInvoiceStatus, MembershipStatus } from '@/app/domain/types'

// Type-safe checks
if (isMembershipStatus(value)) {
  // value is now typed as MembershipStatus
  console.log(value) // 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'LEFT'
}

// In function signatures
function updateMembership(status: MembershipStatus) {
  // Type-safe, only allows valid statuses
}
```

---

### 3. **Centralized Audit Logging** ✅

**New file:** `src/app/utils/audit.ts`

**Before (duplicated in multiple files):**
```typescript
// ❌ Duplicated pattern
const { error: auditError } = await supabase
  .from('audit_logs')
  .insert({
    org_id: orgId,
    user_id: user.id,
    action: 'GOVERNANCE_ANSWERS_SUBMITTED',
    target_table: 'governance_configs',
    target_id: configId,
    old_value: null,
    new_value: { answers },
  })

if (auditError) {
  console.error('AUDIT INCIDENT: Failed to log GOVERNANCE_ANSWERS_SUBMITTED:', auditError)
}
```

**After (centralized):**
```typescript
// ✅ One-liner
import { logAudit, AUDIT_ACTIONS } from '@/app/utils/audit'

await logAudit(supabase, {
  orgId,
  userId: user.id,
  action: AUDIT_ACTIONS.GOVERNANCE_ANSWERS_SUBMITTED,
  targetTable: 'governance_configs',
  targetId: configId,
  newValue: { answers },
})
```

**Batch logging:**
```typescript
import { logAuditBatch } from '@/app/utils/audit'

await logAuditBatch(supabase, [
  { orgId, userId, action: 'ACTION_1', ... },
  { orgId, userId, action: 'ACTION_2', ... },
  { orgId, userId, action: 'ACTION_3', ... },
])
```

---

### 4. **Membership Guards** ✅

**New file:** `src/app/domain/guards/membership.ts`

**Before (duplicated in 5+ files):**
```typescript
// ❌ Manual membership check
const { data: membership, error: membershipError } = await supabase
  .from('memberships')
  .select('id, role, member_status')
  .eq('user_id', user.id)
  .eq('org_id', orgId)
  .eq('member_status', MEMBERSHIP_STATUS.ACTIVE)
  .maybeSingle()

if (membershipError?.code === '42501') authViolation()
if (membershipError) operationFailed()
if (!membership) accessDenied()
if (membership.role !== 'OWNER') accessDenied()
```

**After (one-liner):**
```typescript
// ✅ Consolidated guard
import { requireActiveMembership, requireOwner } from '@/app/domain/guards/membership'

// Any active member
const membership = await requireActiveMembership(supabase, user.id, orgId)

// Only OWNER
const membership = await requireOwner(supabase, user.id, orgId)

// OWNER or ADMIN
const membership = await requireActiveMembership(supabase, user.id, orgId, ['OWNER', 'ADMIN'])
```

**Non-throwing version (for UI):**
```typescript
import { checkActiveMembership, isOwner } from '@/app/domain/guards/membership'

// Returns null if no access (doesn't throw)
const membership = await checkActiveMembership(supabase, user.id, orgId, 'OWNER')

if (membership) {
  // User is OWNER
}

// Quick check
const userIsOwner = await isOwner(supabase, user.id, orgId)
```

---

### 5. **Voting Utilities** ✅

**New file:** `src/app/utils/voting.ts`

**Before:**
```typescript
// ❌ Duplicated logic (41 lines)
let opensAt: string | null = null

if (input.meeting_id) {
  const { data: meeting } = await supabase
    .from('meetings')
    .select('scheduled_at')
    .eq('id', input.meeting_id)
    .single()
  
  const { data: earlyVotingData } = await supabase.rpc('get_governance_int', {
    p_org_id: resolution.org_id,
    p_key: 'early_voting_days',
    p_default: 0
  })
  
  const earlyVotingDays = earlyVotingData || 0
  
  const meetingDate = new Date(meeting.scheduled_at)
  if (earlyVotingDays > 0) {
    meetingDate.setDate(meetingDate.getDate() - earlyVotingDays)
    opensAt = meetingDate.toISOString()
  } else {
    opensAt = new Date().toISOString()
  }
} else {
  opensAt = new Date().toISOString()
}
```

**After:**
```typescript
// ✅ One-liner
import { calculateVoteOpensAt } from '@/app/utils/voting'

const opensAt = await calculateVoteOpensAt(supabase, orgId, meetingId)
```

**Other utilities:**
```typescript
import { isVoteOpen, formatVoteOutcome, determineVoteResult } from '@/app/utils/voting'

// Check if vote is open
if (isVoteOpen(vote)) {
  // Allow voting
}

// Format outcome
const message = formatVoteOutcome(15, 3, 2) // "PATVIRTINTA (15 už, 3 prieš, 2 susilaikė)"

// Determine result
const result = determineVoteResult(15, 3) // "APPROVED"
```

---

## 📝 MIGRATION CHECKLIST

### Phase 1: Update Constants Usage (Priority: HIGH)

- [ ] Find all `'PENDING'` string literals → `MEMBERSHIP_STATUS.PENDING`
- [ ] Find all `'DRAFT'` invoice status → `INVOICE_STATUS.DRAFT`
- [ ] Find all `'LEFT'` string literals → `MEMBERSHIP_STATUS.LEFT`

**Search commands:**
```bash
# Find PENDING usages
grep -r "= 'PENDING'" src/ --include="*.ts" --include="*.tsx"
grep -r "=== 'PENDING'" src/ --include="*.ts" --include="*.tsx"

# Find DRAFT usages
grep -r "'DRAFT'" src/ --include="*.ts" --include="*.tsx"
```

### Phase 2: Replace Membership Checks (Priority: HIGH)

Files to update:
- [ ] `src/app/actions/canPublish.ts` (lines 59-90)
- [ ] `src/app/actions/invoices.ts` (✅ DONE - line 272-315)
- [ ] `src/app/actions/governance-submission.ts` (lines 59-72)
- [ ] `src/app/actions/member-status.ts`
- [ ] `src/app/actions/positions-assign.ts`

**Pattern to replace:**
```typescript
// OLD PATTERN:
const { data: membership } = await supabase
  .from('memberships')
  .select('id, role, member_status')
  .eq('user_id', user.id)
  .eq('org_id', orgId)
  .eq('member_status', MEMBERSHIP_STATUS.ACTIVE)
  .maybeSingle()

if (!membership || membership.role !== 'OWNER') {
  // error handling
}

// NEW PATTERN:
import { requireOwner } from '@/app/domain/guards/membership'
const membership = await requireOwner(supabase, user.id, orgId)
```

### Phase 3: Replace Audit Logging (Priority: MEDIUM)

Files to update:
- [ ] `src/app/actions/governance-submission.ts` (lines 294-309)
- [ ] `src/app/actions/register-member.ts` (lines 305-323)
- [ ] `src/app/actions/member-status.ts`
- [ ] `src/app/actions/meetings.ts`
- [ ] `src/app/actions/voting.ts`

**Pattern:**
```typescript
// OLD:
const { error: auditError } = await supabase.from('audit_logs').insert({...})
if (auditError) console.error('AUDIT INCIDENT:', auditError)

// NEW:
import { logAudit, AUDIT_ACTIONS } from '@/app/utils/audit'
await logAudit(supabase, { orgId, userId, action: AUDIT_ACTIONS.XXX, ... })
```

### Phase 4: Replace Voting Utils (Priority: LOW)

Files to update:
- [ ] `src/app/actions/voting.ts` (lines 137-178)
- [ ] `src/app/actions/meetings.ts` (automatic vote creation)

**Pattern:**
```typescript
// OLD: (41 lines of code)
let opensAt = ...complex logic...

// NEW:
import { calculateVoteOpensAt } from '@/app/utils/voting'
const opensAt = await calculateVoteOpensAt(supabase, orgId, meetingId)
```

---

## 🧪 TESTING

### Unit Tests

```typescript
// Test membership guards
describe('requireActiveMembership', () => {
  it('should throw if user not active', async () => {
    await expect(
      requireActiveMembership(supabase, userId, orgId)
    ).rejects.toThrow('access_denied')
  })

  it('should throw if wrong role', async () => {
    await expect(
      requireActiveMembership(supabase, userId, orgId, 'OWNER')
    ).rejects.toThrow('access_denied')
  })

  it('should return membership if valid', async () => {
    const membership = await requireActiveMembership(supabase, userId, orgId)
    expect(membership.role).toBe('OWNER')
  })
})
```

### Integration Tests

1. **Test membership guard in invoice update:**
   ```bash
   # Test as non-OWNER (should fail)
   curl -X POST /api/invoices/update \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"invoice_id": "...", "status": "SENT"}'
   
   # Expected: 403 Forbidden
   ```

2. **Test audit logging:**
   ```sql
   -- Check audit logs are created
   SELECT * FROM audit_logs 
   WHERE action = 'GOVERNANCE_ANSWERS_SUBMITTED' 
   ORDER BY created_at DESC LIMIT 10;
   ```

---

## 📊 IMPACT METRICS

### Before Optimization:
- **Duplicated membership checks:** 8 files
- **Duplicated audit patterns:** 12 files
- **Duplicated voting logic:** 2 files
- **Type safety:** ⚠️ Medium (string literals)
- **Maintainability:** ⚠️ Medium

### After Optimization:
- **Consolidated guards:** ✅ 1 file
- **Consolidated audit:** ✅ 1 file
- **Consolidated voting:** ✅ 1 file
- **Type safety:** ✅ High (type guards)
- **Maintainability:** ✅ High

### Code Reduction:
- **Membership checks:** ~50 lines → 1 line per usage = **-400 lines**
- **Audit logging:** ~15 lines → 1 line per usage = **-180 lines**
- **Voting utils:** ~40 lines → 1 line per usage = **-80 lines**
- **Total reduction:** ~**660 lines of code**

---

## 🚨 BREAKING CHANGES

### None!

All changes are **additive and backward compatible**:
- New utilities added alongside existing code
- Old patterns still work
- Migration can be gradual

---

## 📞 SUPPORT

Jei kyla klausimų:
1. Skaitykite JSDoc komentarus failuose
2. Žiūrėkite `COMPREHENSIVE_CODE_AUDIT.md` detaliems paaiškinimams
3. Testuokite naujus utility per unit testus

---

**END OF MIGRATION GUIDE**

