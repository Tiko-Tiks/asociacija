# Pre-Test Checklist - v17.0 Compliance

## ✅ Ištaisyta

### 1. Service_role User-Facing Code
- ✅ `register-member.ts` - Pašalintas
- ✅ `invite-member.ts` - Pašalintas  
- ✅ `members.ts` - Pašalintas
- ⚠️ `admin/` katalogo failai - **ACCEPTABLE** (admin operations, not user-facing)

### 2. Profiles Privacy
- ✅ Nėra `select('*')` ant profiles
- ✅ Visi queries naudoja `select('id, full_name')`

### 3. Media_items
- ✅ Pašalintas iš `governance.ts` (2 vietos)

---

## ⚠️ Schema Mismatches (v17.0)

### CRITICAL: Meetings vs Events

**Current Code Uses**:
- `meetings` table
- `meeting_attendance` table
- `meeting_agenda_items` table
- `meeting_agenda_attachments` table
- `meeting_protocols` table

**v17.0 Schema Has**:
- `events` table (with `event_type` = 'MEETING')
- `event_attendance` table

**Impact**: 
- ❌ Code uses old schema tables
- ⚠️ May cause runtime errors if v17.0 schema is deployed

**Files Affected**:
- `src/app/actions/meetings.ts` (many references)
- `src/app/actions/governance.ts` (meetings, meeting_attendance)
- `src/app/actions/voting.ts` (meetings)
- `src/app/actions/meeting-attendance.ts` (meetings, meeting_attendance)
- `src/app/actions/published-meetings.ts` (meetings)
- `src/app/actions/protocols.ts` (meeting_protocols)
- `src/app/actions/dashboard.ts` (meetings, meeting_attendance)

**Recommendation**: 
- ⚠️ **CRITICAL** - Schema mismatch will cause failures
- Need to decide: Use v17.0 schema OR keep current schema
- If v17.0: Need migration plan
- If current: Update documentation

---

## ✅ Projects Table

**Schema v15.1/v17.0**: Projects table exists with columns:
- `id, org_id, idea_id, title, description, status, budget_eur, created_by, created_at, funding_opened_at, completed_at`

**Code Uses**: `select('*')` - **ACCEPTABLE** (all columns exist)

**Status**: ✅ **OK** - No issues

---

## 📋 Test Readiness

### Ready for Testing:
- ✅ Service_role violations fixed
- ✅ Profiles privacy compliant
- ✅ Media_items removed
- ✅ Projects table OK

### ⚠️ Blockers:
- ❌ **Schema mismatch** - Code uses `meetings` but v17.0 has `events`
- ⚠️ Need clarification: Which schema is actually deployed?

### Questions:
1. Is v17.0 schema actually deployed in database?
2. Or is current code using v15.1 schema?
3. Should we migrate code to v17.0 or keep current?

---

## Next Steps

1. **Clarify Schema**: Confirm which schema is deployed
2. **If v17.0**: Plan migration from `meetings` → `events`
3. **If v15.1**: Update documentation to reflect actual schema
4. **Test**: After schema clarification, proceed with testing

---

**Status**: ⚠️ **BLOCKED** - Schema mismatch needs clarification

