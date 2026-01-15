# V2 Member Registration Tests

**STATUS: FINAL**  
**VERSION: 2.0**  
**FROZEN: Governance-locked, no modifications without approval**

## Test Cases

### 1. PRE_ORG org cannot register members

**Test Method**: Script (`scripts/test-member-registration-v2.ts`)

**Expected Result**: 
- Registration attempt to PRE_ORG org should return error: "Bendruomenė dar neaktyvi"
- Audit log entry: `PRE_ORG_ACCESS_BLOCKED` with `entrypoint='member_registration_v2'`

**Test Logic**:
- Create test PRE_ORG (status='ONBOARDING', metadata.fact.pre_org=true)
- Attempt to register member
- Verify registration is blocked
- Verify error message contains "neaktyvi"

**Status**: ✅ PASS / ❌ FAIL

---

### 2. Consent-based member stays PENDING after window end

**Test Method**: Script (`scripts/test-member-registration-v2.ts`)

**Expected Result**:
- Member registered with consent-based approval should have:
  - `member_status = 'PENDING'`
  - `metadata.fact.consent_window_started_at` set
  - `metadata.fact.consent_window_ends_at` set (7 days from start)
- After consent window ends, status should remain `PENDING`
- No automatic transition to `ACTIVE`

**Test Logic**:
- Register member to org with `governance.new_member_approval = 'consent-based'`
- Verify membership is created with PENDING status and consent window metadata
- Simulate consent window ending (set end date to past)
- Verify status is still PENDING (no auto-approval)

**Status**: ✅ PASS / ❌ FAIL

---

### 3. Manual approval required to become ACTIVE

**Test Method**: Script (`scripts/test-member-registration-v2.ts`)

**Expected Result**:
- Member registered with approval required should have `member_status = 'PENDING'`
- Status should NOT change automatically
- Only explicit call to `approveMemberV2()` should change status to `ACTIVE`
- Approval requires proper authorization based on `governance.new_member_approval`

**Test Logic**:
- Register member to org with `governance.new_member_approval = 'chairman'`
- Verify membership is created with PENDING status
- Verify status does not change automatically
- Verify manual approval is required (logic test)

**Status**: ✅ PASS / ❌ FAIL

---

## Running Tests

### Script Tests

```bash
npm run test:member-v2
```

Or directly:

```bash
tsx scripts/test-member-registration-v2.ts
```

### Unit Tests

```bash
npm test src/app/__tests__/member-registration-v2.test.ts
```

---

## UI Hints

### Member Status Display

The `MemberStatusHint` component shows:

1. **'Laukiama patvirtinimo'** (Waiting for approval)
   - For PENDING members without consent window
   - Badge: Gray with clock icon

2. **'Prieštaravimo terminas aktyvus (X d.)'** (Consent window active)
   - For PENDING members with active consent window
   - Badge: Yellow with clock icon
   - Shows days remaining

3. **'Patvirtinta'** (Approved)
   - For ACTIVE members with `metadata.fact.approved_at` set
   - Badge: Green with checkmark icon
   - Only shown after manual approval

4. **'Aktyvus'** (Active)
   - For ACTIVE members without `approved_at` (auto-approved)
   - Badge: Green

### Where Hints Are Shown

- **Members List** (`/dashboard/[slug]/members`): Each member shows status hint
- **Member Dashboard** (`/dashboard/[slug]`): Current user's status hint
- **Member Registration Form**: Success message after registration

---

## Test Results Summary

| Test Case | Method | Status | Notes |
|-----------|--------|--------|-------|
| PRE_ORG blocking | Script | ⏳ PENDING | Run `npm run test:member-v2` |
| Consent window no auto-approval | Script | ⏳ PENDING | Run `npm run test:member-v2` |
| Manual approval required | Script | ⏳ PENDING | Run `npm run test:member-v2` |

---

## Manual Testing Checklist

- [ ] Register member to PRE_ORG org → Should be blocked
- [ ] Register member with consent-based approval → Should create PENDING with consent window
- [ ] Wait for consent window to end → Status should remain PENDING
- [ ] Manually approve member → Status should change to ACTIVE
- [ ] Verify UI hints show correct status in members list
- [ ] Verify UI hints show correct status in member dashboard
