# Governance Audit Report
**Date:** 2026-01-11  
**Scope:** Branduolys Repository  
**Governance Layer:** v19.0 (Code Freeze)  
**Audit Type:** Internal Governance Compliance

---

## EXECUTIVE SUMMARY

This audit checks compliance with Governance Layer v19.0 rules:
- Schema freeze (NO new tables/columns)
- Metadata Registry compliance (namespaced keys only)
- AI role limits (interpretative only)
- UI/Product layer boundaries (no legal authority)

**Overall Status:** ✅ **COMPLIANT** with minor observations

---

## 1. SCHEMA VIOLATIONS CHECK

### Status: ✅ **COMPLIANT** (with historical context)

#### Findings:

**Historical Migration Files:**
- `sql/consolidated_all.sql` contains `ALTER TABLE ADD COLUMN` statements
  - Lines 196-197: `ALTER TABLE public.orgs ADD COLUMN logo_url TEXT;`
  - Lines 302-303: `ALTER TABLE public.community_applications ADD COLUMN registration_number TEXT;`
  - Lines 320-321: `ALTER TABLE public.community_applications ADD COLUMN address TEXT;`
  - Lines 117-119: `ALTER TABLE public.governance_questions` constraint modifications

**Assessment:**
- These appear to be **historical/legacy migration files** from pre-v19.0
- `consolidated_all.sql` is documented as full schema, not active migrations
- **Active migrations** (`supabase/migrations/`) are compliant:
  - `20260111_validate_metadata_trigger.sql` - No schema changes ✅
  - `20260111_create_legacy_functions.sql` - No schema changes ✅

**Risk Level:** 🟢 **LOW**
- Historical files, not active migrations
- Active migrations directory is clean

**Evidence:**
```sql
-- sql/consolidated_all.sql (lines 196-197)
ALTER TABLE public.orgs 
ADD COLUMN logo_url TEXT;
```

**Trigger Disable/Enable Patterns:**
- Multiple SQL files contain `ALTER TABLE ... DISABLE TRIGGER` / `ENABLE TRIGGER`
  - `sql/fix_all_published_meetings.sql`
  - `sql/close_latest_meeting_votes.sql`
  - `sql/fix_latest_meeting_resolutions.sql`
  - `sql/close_votes_and_approve.sql`

**Assessment:**
- These are **temporary trigger disables** for data fixes, not schema changes
- Standard pattern for maintenance operations
- ✅ **COMPLIANT** - does not violate schema freeze

---

## 2. METADATA REGISTRY COMPLIANCE

### Status: ✅ **COMPLIANT**

#### Findings:

**Database-Level Protection:**
- ✅ `validate_metadata` trigger is active and properly configured
  - File: `supabase/migrations/20260111_validate_metadata_trigger.sql`
  - Enforces namespaced prefixes: `fact.*`, `indicator.*`, `project.*`, `ui.*`, `template.*`, `ai.*`
  - Validates sub-prefix requirement (e.g., `project.tag`, not just `project`)
  - Blocks structural field duplication (title, status, created_at, org_id)
  - Protects APPROVED resolutions from metadata changes

**Migration Files:**
- ✅ `20260111_create_legacy_functions.sql` correctly uses `project.*` namespace
  - Lines 38, 45, 46: `metadata @> '{"project":{}}'`
  - Lines 58, 67, 76: Proper nested access to `metadata -> 'project' -> ...`

**TypeScript Code:**
- Observed metadata usage in `src/app/actions/member-requirements.ts` (lines 93-96, 134-143, 158-167, 182-184)
  - **Assessment:** These are TypeScript object properties, NOT database metadata JSONB
  - Structure appears to be for UI notifications/requirements system
  - ✅ **COMPLIANT** - not database metadata field

**Risk Level:** 🟢 **LOW**
- Database-level enforcement via trigger ✅
- Active migrations use correct namespaces ✅
- TypeScript metadata is separate concern ✅

**Evidence:**
```typescript
// src/app/actions/member-requirements.ts (line 93-96)
metadata: {
  missingFields,
},
```
**Note:** This is TypeScript interface metadata, not database JSONB metadata.

---

## 3. AI OVERREACH CHECK

### Status: ✅ **COMPLIANT**

#### Findings:

**No Automatic Decision Creation:**
- ✅ No code found that automatically creates resolutions, facts, or audit records
- ✅ Resolution status changes require explicit user action

**Vote Outcome Application:**
- File: `sql/close_votes_and_approve.sql`
  - Updates resolution status to APPROVED based on vote results
  - **Assessment:** ✅ **COMPLIANT** - This is a **post-vote administrative action**
  - Requires trigger disable/enable (human-controlled process)
  - Not automatic - requires manual SQL execution or explicit server action

**Server Actions:**
- `src/app/actions/vote-management.ts` - `closeVoteAndApplyResults()`
  - Returns result but requires explicit call
  - ✅ **COMPLIANT** - Human-in-the-loop required

**Risk Level:** 🟢 **LOW**
- No automatic AI-driven decision making found
- All resolution status changes require explicit action

**Evidence:**
```typescript
// src/app/actions/vote-management.ts (line 85)
const result: 'APPROVED' | 'REJECTED' = votesFor > votesAgainst ? 'APPROVED' : 'REJECTED'
```
**Assessment:** Calculation only, requires explicit application via `apply_resolution_result` RPC.

---

## 4. UI/PRODUCT LAYER LEGAL AUTHORITY CHECK

### Status: ✅ **COMPLIANT** (with minor observations)

#### Findings:

**Documentation Wording:**
- ✅ `README.md` (line 145): "Official decisions use `resolutions`"
  - **Assessment:** ✅ **COMPLIANT** - Factual description, not system claiming authority

- ✅ `README.md` (line 146): "APPROVED resolutions are **immutable**"
  - **Assessment:** ✅ **COMPLIANT** - Technical description

- ✅ `README.md` (line 147): "Projects are operational, not legal decisions"
  - **Assessment:** ✅ **COMPLIANT** - Clear distinction

**UI Labels:**
- `src/app/actions/generate-protocol-pdf.ts` (lines 607-614, 841-891)
  - Contains decision text generation: "Patvirtinti susirinkimo darbotvarkę", "Išrinkti susirinkimo pirmininku"
  - **Assessment:** ✅ **COMPLIANT** - These are **template strings for protocol documents**
  - Protocol is a record of decisions, not the system making decisions
  - Generated based on existing vote results (human decisions already made)

- `src/app/actions/voting.ts` (line 781)
  - Comment: "TEST MODE: Calculating results without legal consequences"
  - **Assessment:** ✅ **COMPLIANT** - Explicitly states no legal consequences

**Component Labels:**
- `src/components/chair/chair-agenda-panel.tsx`, `procedural-items-panel.tsx`
  - Display resolution status labels
  - **Assessment:** ✅ **COMPLIANT** - Read-only display of existing data

**Risk Level:** 🟢 **LOW**
- UI components display existing decisions, do not claim to make decisions
- Protocol generation is documentation of decisions, not decision-making

**Evidence:**
```typescript
// src/app/actions/generate-protocol-pdf.ts (line 850-851)
if (isAgendaApprovalItem && isApproved) {
  decisionText = 'Patvirtinti susirinkimo darbotvarkę.'
}
```
**Assessment:** Template string for protocol document, not system decision.

---

## SUMMARY OF FINDINGS

| Category | Status | Risk Level | Notes |
|----------|--------|------------|-------|
| Schema Freeze | ✅ COMPLIANT | 🟢 LOW | Historical files present, active migrations clean |
| Metadata Registry | ✅ COMPLIANT | 🟢 LOW | Trigger enforcement active, correct namespace usage |
| AI Overreach | ✅ COMPLIANT | 🟢 LOW | No automatic decision creation found |
| UI Legal Authority | ✅ COMPLIANT | 🟢 LOW | UI displays records, doesn't claim authority |

---

## RECOMMENDATIONS

### Optional (Non-Critical):

1. **Documentation Clarity:**
   - Consider adding a comment in `sql/consolidated_all.sql` header indicating it's a historical snapshot (pre-v19.0)
   - Helps future auditors distinguish from active migration files

2. **Code Comments:**
   - The trigger disable/enable pattern in maintenance SQL files is correct
   - Consider standardizing with governance comments explaining why trigger disable is necessary

3. **TypeScript Metadata:**
   - Consider renaming `metadata` property in `member-requirements.ts` to `details` or `data`
   - Reduces potential confusion with database JSONB metadata field
   - **Low priority** - current naming is acceptable

### No Critical Issues Found

✅ All governance rules are being followed  
✅ Active codebase is compliant with v19.0 requirements  
✅ Historical files do not violate current governance

---

## CONCLUSION

**Audit Result: ✅ COMPLIANT**

The repository demonstrates strong compliance with Governance Layer v19.0 rules:
- Active migrations respect schema freeze
- Metadata Registry rules are enforced at database level
- AI role is properly limited to interpretative functions
- UI/Product layer correctly represents records without claiming legal authority

No critical violations found. Minor recommendations are optional improvements for clarity.

---

**Audit Completed:** 2026-01-11  
**Next Review:** As needed for new migrations or significant changes
