# Voting / GA Module Governance v19.0 Audit Report
**Date:** 2026-01-11  
**Scope:** Voting and GA (General Assembly) module  
**Governance Layer:** v19.0 (Code Freeze)  
**Audit Type:** Focused Governance Compliance

---

## EXECUTIVE SUMMARY

This audit examines the Voting/GA module for compliance with Governance Layer v19.0 requirements:
- Governance snapshot usage (metadata storage)
- Procedural item semantics (items 1-3)
- Fact vs indicator separation (fact.* vs indicator.*)
- Schema freeze compliance (no schema violations)

**Overall Status:** ⚠️ **PARTIALLY COMPLIANT** with observations

---

## 1. GOVERNANCE SNAPSHOT USAGE

### v19.0 Specification Requirement

From `docs/VOTING_FLOW_SPECIFICATION.md` (lines 85-95):
- Snapshot stored as: `meetings.metadata.governance_snapshot`
- Snapshot captures: quorum, early voting days, procedural questions set
- Snapshot is immutable after meeting publication

### Current Implementation Status

**Search Results:**
- ⚠️ Governance snapshot is **RUNTIME-ONLY** (v18.8 implementation)
- ⚠️ NOT stored in `meetings.metadata.governance_snapshot` (per v19.0 spec)
- ⚠️ Snapshot calculated on-the-fly, not persisted
- ✅ Snapshot logic exists: `src/lib/governance/snapshot.ts`
- ✅ Used in meeting publication: `src/app/actions/meetings.ts:830`
- ✅ Used in voting freeze checks: `src/app/actions/voting.ts:312, 442`

**Risk Level:** 🟡 **MEDIUM**

**Findings:**
- Governance snapshot functionality exists but is **RUNTIME-ONLY**
- v19.0 specification requires persistent storage in `meetings.metadata.governance_snapshot`
- Current implementation calculates snapshot dynamically (not stored)
- Documentation indicates: "metadata stulpelio nėra schema (Code Freeze) - governance snapshot yra runtime-only"

**Evidence:**
```typescript
// src/lib/governance/snapshot.ts
// Note: Runtime-only, doesn't write to DB
// src/app/actions/meetings.ts:830
const snapshot = await getGovernanceSnapshot(meeting.org_id, meetingData?.scheduled_at)
// Snapshot calculated runtime, NOT stored in metadata
```

**Location:** 
- `src/lib/governance/snapshot.ts` - snapshot calculation logic
- `src/app/actions/meetings.ts:830-836` - snapshot calculation at publication
- `docs/GOVERNANCE_SNAPSHOT_RUNTIME_ONLY_v18.md` - documents runtime-only approach

**Recommendation:**
- Implement governance snapshot storage in `meetings.metadata.governance_snapshot`
- Snapshot should capture quorum, early voting days, procedural questions at publication time
- Snapshot should be immutable after meeting publication

---

## 2. PROCEDURAL ITEM SEMANTICS

### v19.0 Specification Requirement

From `docs/VOTING_FLOW_SPECIFICATION.md` (lines 109-125):
- Procedural items (1-3): Darbotvarkės tvirtinimas, Pirmininko rinkimas, Sekretoriaus rinkimas
- Must be clearly labeled: "Procedūrinis klausimas pagal įstatus"
- Not community-initiated decisions
- System registers them as procedure stages, not decisions

### Current Implementation Status

**Status:** ✅ **COMPLIANT** (with minor observations)

#### Findings:

**Creation Logic:**
- ✅ Location: `src/lib/meetings/procedural-items.ts`
- ✅ Function: `createProceduralAgendaItems()`
- ✅ Items created with item_no 1, 2, 3
- ✅ Clear titles and legal basis in details

**Labeling:**
- ✅ Function `isProceduralItem()` correctly identifies items 1-3
- ✅ UI separates procedural from substantive items
- ✅ Edit/delete protection for items 1-3
- ⚠️ **OBSERVATION:** Template details don't explicitly state "Procedūrinis klausimas pagal įstatus" (as per v19.0 spec)

**Semantics:**
- ✅ Items are system-generated (not user-created)
- ✅ Templates indicate legal basis
- ✅ Items are registered, not created as decisions
- ✅ Resolutions created with status 'PROPOSED' automatically

**Exclusion from Analytics:**
- ✅ Procedural items excluded from project analytics (no project metadata)
- ✅ Legacy functions filter by `metadata @> '{"project":{}}'` (procedural items don't have this)
- ✅ UI filters procedural items separately

**Risk Level:** 🟢 **LOW**

**Evidence:**
- `src/lib/meetings/procedural-items.ts:34-109` - Templates with legal basis
- `src/lib/meetings/procedural-items.ts:319` - `isProceduralItem()` function
- `src/components/chair/chair-agenda-panel.tsx:164-165` - UI filtering
- `src/components/meetings/agenda-builder.tsx:103-129` - Edit/delete protection

**Recommendation:**
- Add explicit label "Procedūrinis klausimas pagal įstatus" to template details (low priority)

---

## 3. FACT VS INDICATOR SEPARATION

### v19.0 Specification Requirement

From `docs/VOTING_FLOW_SPECIFICATION.md` (lines 145-161):
- **Human Input (fact.*):**
  - `fact.live_present`
  - `fact.live_against`
  - `fact.live_abstain`
- **Calculated Value (indicator.*):**
  - `indicator.live_for`

### Current Implementation Status

**Status:** ❌ **NOT COMPLIANT**

#### Findings:

**Function:** `set_vote_live_totals`
- **Location:** `sql/modules/voting/create_set_vote_live_totals.sql`
- **Current Storage:** Table columns (not metadata)
  - `live_present_count` (derived from meeting_attendance)
  - `live_for_count` (calculated: present - against - abstain)
  - `live_against_count` (human input: parameter)
  - `live_abstain_count` (human input: parameter)

**Issues:**

1. **No Metadata Storage:**
   - ⚠️ Function stores data in table columns, not metadata JSONB
   - ⚠️ No `fact.*` or `indicator.*` metadata keys used
   - ⚠️ Semantic separation not implemented in database

2. **Specification Mismatch:**
   - ⚠️ Spec says `fact.live_present` is human input
   - ⚠️ Function derives `live_present_count` from `meeting_attendance` (NOT human input)
   - ⚠️ This is a specification vs. implementation mismatch

3. **Schema Constraint:**
   - ⚠️ Cannot add metadata column to `vote_live_totals` table (schema freeze)
   - ⚠️ Semantic separation cannot be implemented without schema change OR
   - ⚠️ Requires using metadata on related table (e.g., votes.metadata)

**Risk Level:** 🟡 **MEDIUM**

**Evidence:**
```sql
-- sql/modules/voting/create_set_vote_live_totals.sql (lines 74-95)
INSERT INTO public.vote_live_totals (
  vote_id,
  live_present_count,    -- Derived, not human input
  live_for_count,        -- Calculated
  live_against_count,    -- Human input (parameter)
  live_abstain_count,    -- Human input (parameter)
  ...
)
```

**Current Mapping:**
- Human input: `p_live_against_count`, `p_live_abstain_count` (parameters)
- Derived: `live_present_count` (from meeting_attendance - NOT human input per spec)
- Calculated: `live_for_count` (present - against - abstain)

**Recommendation:**
- ⚠️ **CRITICAL:** Clarify specification - is `live_present` human input or derived?
- If human input: Function needs to accept `p_live_present_count` parameter
- If derived: Specification needs correction
- For semantic separation without schema change: Consider storing semantic keys in `votes.metadata` (if votes table has metadata column)

---

## 4. SCHEMA VIOLATIONS CHECK

### Status: ✅ **COMPLIANT**

#### Findings:

**Voting Module SQL Files:**
- `sql/modules/voting/create_vote_rpc_functions.sql` - No schema changes ✅
- `sql/modules/voting/create_set_vote_live_totals.sql` - No schema changes ✅
- `sql/modules/voting/create_auto_abstain_function.sql` - No schema changes ✅
- `sql/fix_search_path_voting_functions.sql` - No schema changes ✅
- `sql/fix_search_path_set_vote_live_totals.sql` - No schema changes ✅

**Functions Check:**
- ✅ All functions use `CREATE OR REPLACE FUNCTION` (no schema changes)
- ✅ No `CREATE TABLE`, `ALTER TABLE`, `ADD COLUMN` found in voting module
- ✅ No schema migrations in voting-specific files

**Risk Level:** 🟢 **LOW**

**Evidence:**
- Search for `CREATE TABLE`, `ALTER TABLE`, `ADD COLUMN` in `sql/modules/voting/` returned no violations
- All voting functions are RPC functions (function-level changes only)

---

## SUMMARY OF FINDINGS

| Category | Status | Risk Level | Notes |
|----------|--------|------------|-------|
| Governance Snapshot | ❌ NOT IMPLEMENTED | 🟡 MEDIUM | No snapshot storage found |
| Procedural Item Semantics | ✅ COMPLIANT | 🟢 LOW | Minor: add explicit label |
| Fact vs Indicator Separation | ❌ NOT COMPLIANT | 🟡 MEDIUM | No metadata storage, spec mismatch |
| Schema Violations | ✅ COMPLIANT | 🟢 LOW | No violations found |

---

## DETAILED FINDINGS

### 1. Governance Snapshot (CRITICAL)

**Issue:** Governance snapshot functionality not implemented

**Impact:**
- Specification (v19.0) requires snapshot storage
- Snapshot ensures immutability of governance parameters
- Without snapshot, governance parameters could change after publication

**Evidence:**
- No code found storing `meetings.metadata.governance_snapshot`
- No code found reading governance snapshot
- No snapshot capture logic found

**Recommendation:**
- **HIGH PRIORITY:** Implement governance snapshot storage
- Store snapshot in `meetings.metadata.governance_snapshot` at publication time
- Capture: quorum, early_voting_days, procedural_questions_set
- Make snapshot immutable after publication (validation in trigger/application logic)

### 2. Procedural Items (COMPLIANT)

**Status:** ✅ Functioning correctly with minor enhancement opportunity

**Strengths:**
- Correct identification (item_no 1-3)
- Proper UI separation
- Protection from edit/delete
- Exclusion from analytics

**Minor Enhancement:**
- Add explicit "Procedūrinis klausimas pagal įstatus" label to template details

### 3. Fact vs Indicator Separation (NOT COMPLIANT)

**Issue 1:** No metadata storage
- Function stores in table columns, not metadata
- Cannot add metadata column (schema freeze)

**Issue 2:** Specification mismatch
- Spec says `fact.live_present` is human input
- Function derives `live_present_count` from meeting_attendance
- Needs clarification

**Options:**
1. **If votes table has metadata:** Store semantic keys in `votes.metadata`
2. **If not:** Cannot implement without schema change
3. **Documentation only:** Update function comments to clarify semantic intent

### 4. Schema Compliance (COMPLIANT)

**Status:** ✅ No schema violations found

- All voting functions are RPC functions
- No table/column creation/modification
- Compliance with schema freeze maintained

---

## RECOMMENDATIONS

### Critical (High Priority)

1. **Implement Governance Snapshot Storage** 🔴
   - **Current:** Snapshot is runtime-only (calculated on-the-fly)
   - **Required:** Store snapshot in `meetings.metadata.governance_snapshot` at publication
   - **Note:** meetings table may not have metadata column (schema freeze)
   - **Option A:** If meetings table has metadata column - store snapshot there
   - **Option B:** If not - cannot implement without schema change OR
   - **Option C:** Store in related table with metadata (if available)
   - Implement snapshot immutability validation after publication

### Important (Medium Priority)

2. **Clarify Fact vs Indicator Specification** 🟡
   - Resolve specification vs. implementation mismatch for `live_present`
   - Determine if `live_present` should be human input or derived
   - Update specification OR function implementation accordingly

3. **Implement Semantic Separation (if possible)** 🟡
   - Check if `votes` table has metadata column
   - If yes: Store `fact.*` and `indicator.*` keys in `votes.metadata`
   - If no: Document semantic intent in function comments

### Optional (Low Priority)

4. **Enhance Procedural Item Labels** 🟢
   - Add "Procedūrinis klausimas pagal įstatus" to template details
   - Aligns with v19.0 specification wording

---

## CONCLUSION

**Audit Result:** ⚠️ **PARTIALLY COMPLIANT**

The Voting/GA module demonstrates:
- ✅ Strong compliance with procedural item semantics
- ✅ Full compliance with schema freeze
- ❌ Missing governance snapshot implementation (critical)
- ❌ Missing fact vs indicator semantic separation (medium)

**Priority Actions Required:**
1. Implement governance snapshot (critical for v19.0 compliance)
2. Clarify and resolve fact vs indicator specification mismatch
3. Implement semantic separation if metadata storage available

**Overall Assessment:**
The module is functionally sound but lacks some v19.0 semantic requirements. Governance snapshot is the most critical gap, as it's a core v19.0 requirement for audit safety.

---

**Audit Completed:** 2026-01-11  
**Next Review:** After governance snapshot implementation
