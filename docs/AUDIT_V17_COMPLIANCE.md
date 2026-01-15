# Audit Report - v17.0 Schema Compliance

**Date**: 2026-01-06  
**Schema Version**: v17.0 (GOVERNANCE LAYER)  
**Rules**: `.cursorrules` v15.1 CODE FREEZE

## Executive Summary

❌ **CRITICAL ISSUES FOUND**: 3 violations  
⚠️ **SCHEMA MISMATCHES**: Multiple  
✅ **PROFILES PRIVACY**: Compliant

---

## 1. SERVICE_ROLE IN USER-FACING CODE (Rule 6) ❌

### Status: ❌ VIOLATION

**Requirement**: Never use Supabase service_role/admin client in user-facing routes/actions.

**Violations Found**:

1. **`src/app/actions/register-member.ts`** (Line 32)
   - Uses `createAdminClient()` in public member registration
   - **Severity**: HIGH (public-facing endpoint)
   - **Fix**: Remove admin client, use authenticated context or RPC

2. **`src/app/actions/invite-member.ts`** (Line 48-49)
   - Uses `createAdminClient()` when OWNER invites members
   - **Severity**: MEDIUM (user-facing, but requires OWNER role)
   - **Fix**: Remove admin client, use authenticated context

3. **`src/app/actions/members.ts`** (Line 110-111)
   - Uses `createAdminClient()` to fetch emails for OWNER view
   - **Severity**: MEDIUM (user-facing, but requires OWNER role)
   - **Fix**: Remove admin client, use RPC or profiles table (if allowed)

**Conclusion**: ❌ **NON-COMPLIANT** - Must fix all 3 violations

---

## 2. PROFILES PRIVACY (STRICT) - Rule 8 ✅

### Status: ✅ COMPLIANT

**Requirement**: NEVER use `select('*')` on profiles.

**Findings**:
- ✅ No `select('*')` found on `profiles` table
- ✅ All profile queries use specific columns: `select('id, full_name')`

**Conclusion**: ✅ **FULLY COMPLIANT**

---

## 3. SCHEMA v17.0 MISMATCHES ❌

### Status: ❌ CRITICAL MISMATCHES

**Current Code vs v17.0 Schema**:

#### 3.1 Missing Tables (Code uses, but v17.0 doesn't have):
- ❌ `meetings` - Code uses, but v17.0 has `events` instead
- ❌ `meeting_attendance` - Code uses, but v17.0 has `event_attendance` instead
- ❌ `meeting_protocols` - Code uses, but v17.0 doesn't have
- ❌ `media_items` - Code uses, but v17.0 doesn't have

#### 3.2 New Tables (v17.0 has, but code doesn't use):
- ✅ `events` - Should replace `meetings`
- ✅ `event_attendance` - Should replace `meeting_attendance`
- ✅ `positions` - Should be used for authority
- ✅ `resolutions` - Should be used for legal decisions

#### 3.3 Column Mismatches:

**`governance.ts` Line 200**:
```typescript
.from('media_items')
.select('id, url, created_at')
```
- ❌ `media_items` table doesn't exist in v17.0
- ❌ `url` column doesn't exist
- **Fix**: Remove or replace with appropriate table

**`governance.ts` Line 400**:
```typescript
.from('media_items')
.insert({ object_id, object_type, category })
```
- ❌ `media_items` table doesn't exist in v17.0
- **Fix**: Remove or use appropriate table

**Conclusion**: ❌ **NON-COMPLIANT** - Code uses v15.1 schema, but should use v17.0

---

## 4. PROJECTS TABLE SELECT STATEMENTS ⚠️

### Status: ⚠️ NEEDS REVIEW

**v17.0 Schema**: Projects table NOT in provided schema

**Current Code**:
- `src/app/actions/projects.ts` - Multiple `select('*')` statements
- Uses columns: `id, org_id, idea_id, title, description, status, budget_eur, created_by, created_at, funding_opened_at, completed_at`

**Action Required**: 
- Verify if `projects` table exists in v17.0
- If exists, verify all selected columns match schema
- If doesn't exist, remove or migrate to appropriate table

**Conclusion**: ⚠️ **NEEDS VERIFICATION**

---

## Summary of Required Fixes

### Priority 1 (CRITICAL):
1. ❌ Remove `createAdminClient()` from `register-member.ts`
2. ❌ Remove `createAdminClient()` from `invite-member.ts`
3. ❌ Remove `createAdminClient()` from `members.ts`
4. ❌ Fix `media_items` usage in `governance.ts` (2 locations)

### Priority 2 (SCHEMA MIGRATION):
5. ⚠️ Migrate `meetings` → `events`
6. ⚠️ Migrate `meeting_attendance` → `event_attendance`
7. ⚠️ Remove or migrate `meeting_protocols`
8. ⚠️ Verify `projects` table existence

### Priority 3 (VERIFICATION):
9. ⚠️ Verify all table/column references match v17.0 schema
10. ⚠️ Update RLS policies if needed (but Rule 5 says NO RLS changes)

---

## Notes

- **Rule 4**: NO SQL DDL - Cannot alter schema
- **Rule 5**: NO RLS POLICY CHANGES - Cannot modify RLS
- **Rule 6**: NO SERVICE ROLE - Must fix violations
- **Schema v17.0**: Code must match this schema

---

**Audit Status**: ❌ **FAILED** - Critical violations found

