# Audit Fixes - v15.1 Compliance

## Issues Found

### 1. SERVICE_ROLE IN USER-FACING CODE (Rule 6)
**Status**: ❌ VIOLATION

**Locations**:
- `src/app/actions/register-member.ts` - Line 32: `createAdminClient()` used in public member registration
- `src/app/actions/invite-member.ts` - Line 48-49: `createAdminClient()` used when OWNER invites members
- `src/app/actions/members.ts` - Line 110-111: `createAdminClient()` used to fetch emails for OWNER

**Fix Required**: Remove service_role usage, use authenticated user context only.

---

### 2. MEDIA_ITEMS.URL COLUMN (Non-existent)
**Status**: ❌ VIOLATION

**Location**: 
- `src/app/actions/governance.ts` - Line 200: `select('id, url, created_at')` from `media_items`
- Schema v15.1: `media_items` table does NOT exist. Should use `meeting_protocols` table.

**Fix Required**: 
- Replace `media_items` with `meeting_protocols`
- Remove `url` column (doesn't exist)
- Use correct columns: `id, meeting_id, pdf_path, pdf_bucket, created_at`

---

### 3. PROJECTS SELECT STATEMENTS
**Status**: ⚠️ NEEDS REVIEW

**Locations**:
- `src/app/actions/projects.ts` - Multiple `select('*')` statements
- Schema v15.1 columns: `id, org_id, idea_id, title, description, status, budget_eur, created_by, created_at, funding_opened_at, completed_at`
- No `cover_image_url` found (good)

**Fix Required**: Verify all selected columns exist in schema.

---

## Fixes Applied

### Fix 1: Remove service_role from register-member.ts
- Replace `createAdminClient()` with authenticated user context
- Use RPC functions or authenticated queries instead

### Fix 2: Remove service_role from invite-member.ts  
- Replace `createAdminClient()` with authenticated user context
- Use RPC functions to check user existence

### Fix 3: Remove service_role from members.ts
- Replace `createAdminClient()` with authenticated user context
- Use RPC functions or profiles table (if allowed) for emails

### Fix 4: Fix media_items in governance.ts
- Replace `media_items` with `meeting_protocols`
- Remove `url` column
- Use `pdf_path` and `pdf_bucket` for file access

### Fix 5: Verify projects select statements
- Ensure all selected columns exist in schema v15.1

