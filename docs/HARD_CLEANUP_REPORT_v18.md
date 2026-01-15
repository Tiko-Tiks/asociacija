# HARD CLEANUP REPORT - v18.8.6

**Data:** 2025-01-09  
**Versija:** v18.8.6  
**Authoritative Sources:**
- TECH SPEC v18.x
- SCHEMA v17.0 (Governance Layer)
- GA HARD MODE (v18.8.x)

---

## EXECUTIVE SUMMARY

Atliekamas **strukturinis valymas** prieš **TECH SPEC v18** ir **SCHEMA v17.0**.

**Filosofija:**
> Institutional system. Anything that violates governance determinism,
> procedural lock-in, or physical primacy MUST NOT EXIST.

**Principas:** REDUCE SURFACE. REMOVE CONFUSION. ENFORCE CONSTITUTION.

---

## ❌ FILES TO DELETE

### sql/archive/ (Legacy voting SQL - SAFE TO DELETE)

**Priežastis:** Archive yra debug/check scripts, ne production logic

1. ❌ `sql/archive/check_cast_vote_signature.sql`
2. ❌ `sql/archive/check_vote_channel_enum.sql`
3. ❌ `sql/archive/check_vote_choice_enum.sql`
4. ❌ `sql/archive/check_vote_choice_only.sql`
5. ❌ `sql/archive/check_votes_for_meeting.sql`
6. ❌ `sql/archive/enable_immediate_voting_direct.sql`
7. ❌ `sql/archive/enable_immediate_voting_test.sql`

**Justification:**
- Archive folder = debug/exploration scripts
- NOT used in production
- Pre-date GA HARD MODE
- May contain conflicting logic

**Action:** **DELETE ALL**

---

### docs/ (Legacy v17 Migration docs - DEPRECATE)

**Priežastis:** Kalba apie `events` lentelę, bet sistema naudoja `meetings`

1. ⚠️ `docs/V17_MIGRATION_PLAN.md`
   - Describes migration TO events table
   - **Reality:** We use meetings table
   - **Action:** **DEPRECATE** su header

2. ⚠️ `docs/V17_SCHEMA_ANALYSIS.md`
   - Analyzes events vs meetings mismatch
   - Historical document
   - **Action:** **DEPRECATE** su header

**Justification:**
- These docs describe PLAN, not reality
- Confusion source: "Should we use events?"
- Answer: NO - meetings is canonical (v18)

**Action:** **ADD DEPRECATION HEADER**, not delete (historical value)

---

### docs/ (Other legacy docs - EVALUATE)

3. ⚠️ `docs/MIGRATION_BLOCKERS.md`
   - Pre-v18 migration analysis
   - May have historical value
   - **Action:** **KEEP** (historical reference)

4. ⚠️ `docs/MIGRATION_STRATEGY.md`
   - Pre-v18 strategy
   - **Action:** **KEEP** (historical reference)

5. ⚠️ `docs/CLEANUP_STRATEGY.md`
   - Generic cleanup strategy
   - **Action:** **KEEP** (still relevant)

6. ⚠️ `docs/AUDIT_V17_COMPLIANCE.md`
   - v17 audit compliance
   - **Action:** **KEEP** (compliance record)

---

## ⚠️ FILES TO DEPRECATE (Header added)

### Legacy v17 Docs (Add DEPRECATION WARNING)

**Header to add:**

```markdown
---
**⚠️ DEPRECATED - Historical Document**

This document describes v17.0 migration planning (events table approach).

**Current reality (v18.8):**
- We use `meetings` table (not `events`)
- See: `docs/ACTUAL_SCHEMA_REFERENCE.md` for current schema
- See: `docs/VOTING_FLOW_SPECIFICATION.md` for GA HARD MODE

**This document kept for historical reference only.**
---
```

**Files:**
1. `docs/V17_MIGRATION_PLAN.md`
2. `docs/V17_SCHEMA_ANALYSIS.md`

---

## ✅ CANONICAL FILES (KEEP - Single Source of Truth)

### Primary Specifications:

1. ✅ `docs/VOTING_FLOW_SPECIFICATION.md` (v18.8.1)
   - **PRIMARY SPEC** for all voting/GA
   - Authoritative reference

2. ✅ `docs/ACTUAL_SCHEMA_REFERENCE.md`
   - Current deployed schema
   - Uses `meetings` (not `events`)

3. ✅ `docs/TECHNICAL_SPECIFICATION.md`
   - v18.x tech spec
   - General architecture

4. ✅ `README.md`
   - Entry point
   - Correct links to v18.x

### GA HARD MODE Series:

5-12. ✅ All `docs/GA_*.md` files
   - GA_MODE_CONFIGURATION.md
   - GA_HARD_MODE_IMPLEMENTATION.md
   - GA_HARD_MODE_STRENGTHENING.md
   - GA_HARD_MODE_DEFENSE_IN_DEPTH.md
   - GA_PROCEDURAL_ITEMS.md
   - GA_PROCEDURAL_SEQUENCE.md
   - GA_COMPLETION_VALIDATION.md
   - GA_HARD_MODE_DEPLOYMENT_GUIDE.md
   - GA_HARD_MODE_CLEANUP_REPORT.md

### Analysis Docs (Still useful):

13. ✅ `docs/SERVER_ACTIONS_ANALYSIS.md`
14. ✅ `docs/COMPONENTS_ANALYSIS.md`
15. ✅ `docs/RPC_FUNCTIONS_ANALYSIS.md`
16. ✅ `docs/SQL_DATABASE_CLEANUP.md`
17. ✅ `docs/QUICK_REFERENCE.md`

---

## 🔎 CODE AUDIT

### src/app/actions/voting.ts

**Status:** ✅ **CLEAN**

- New functions: GA HARD MODE aware
- Old functions: `@deprecated` but kept
- **NO REMOVAL** - backward compatibility

**Violations:** NONE

---

### src/app/actions/meetings.ts

**Status:** ✅ **CLEAN**

- Uses governance snapshot
- Enforces procedural items
- Validates completion

**Violations:** NONE

---

### src/lib/ (Helpers)

**Status:** ✅ **CLEAN**

All new helpers align with v18.8:
- `src/lib/config/ga-mode.ts` ✅
- `src/lib/governance/snapshot.ts` ✅
- `src/lib/meetings/procedural-items.ts` ✅
- `src/lib/meetings/ga-completion.ts` ✅

**Violations:** NONE

---

### src/components/voting/

**Status:** ✅ **UPDATED**

All 3 components now use new wrappers:
- `voting-section.tsx` ✅
- `vote-modal.tsx` ✅
- `agenda-item-voting.tsx` ✅ (meetings/)

**Violations:** NONE (after cleanup)

---

## 🔍 GOVERNANCE CONSISTENCY CHECK

### ❌ **Violations NOT FOUND**

Checked for:
- ✅ Dynamic governance reads AFTER publish → NONE
- ✅ Current governance instead of snapshot → NONE (uses snapshot)
- ✅ Authority from role instead of positions → NOT IN VOTING (positions used elsewhere correctly)
- ✅ GA treated like OPINION → NONE (GA HARD MODE enforced)

**Conclusion:** Code is v17.0 compliant

---

## FINAL CLEANUP ACTIONS

### **Files to DELETE:**

```
sql/archive/check_cast_vote_signature.sql
sql/archive/check_vote_channel_enum.sql
sql/archive/check_vote_choice_enum.sql
sql/archive/check_vote_choice_only.sql
sql/archive/check_votes_for_meeting.sql
sql/archive/enable_immediate_voting_direct.sql
sql/archive/enable_immediate_voting_test.sql
```

**Total:** 7 SQL archive files

---

### **Files to DEPRECATE (add header):**

```
docs/V17_MIGRATION_PLAN.md
docs/V17_SCHEMA_ANALYSIS.md
```

**Total:** 2 legacy planning docs

---

### **Files to KEEP (Canonical):**

**Specs:**
- `docs/VOTING_FLOW_SPECIFICATION.md` (**PRIMARY**)
- `docs/ACTUAL_SCHEMA_REFERENCE.md`
- `docs/TECHNICAL_SPECIFICATION.md`
- `README.md`

**GA HARD MODE (9 docs):**
- All `docs/GA_*.md` files

**Analysis (5 docs):**
- SERVER_ACTIONS_ANALYSIS.md
- COMPONENTS_ANALYSIS.md
- RPC_FUNCTIONS_ANALYSIS.md
- SQL_DATABASE_CLEANUP.md
- QUICK_REFERENCE.md

**Historical/Reference (keep but not primary):**
- MIGRATION_BLOCKERS.md
- MIGRATION_STRATEGY.md
- AUDIT_V17_COMPLIANCE.md
- SCHEMA_DECISION.md

**Total canonical/useful:** 20+ docs

---

## SUMMARY

### **Actions Taken:**

| Action | Count | Details |
|--------|-------|---------|
| 🗑️ **Files to DELETE** | 7 | SQL archive voting checks |
| ⚠️ **Files to DEPRECATE** | 2 | V17 migration planning docs |
| ✅ **Files KEPT** | 25+ | Canonical v18.x docs + code |
| 🔧 **Components UPDATED** | 3 | Use new GA HARD MODE wrappers |
| 📝 **Index UPDATED** | 1 | docs/INDEX.md with GA section |

### **Deprecated Functions (kept):**

| Function | Status | Replacement |
|----------|--------|-------------|
| `canCastVote()` | @deprecated | `canCastVoteWithSnapshot()` |
| `castVote()` | @deprecated | `castVoteWithValidation()` |
| `closeVote()` | @deprecated | `closeVoteWithValidation()` |
| `applyVoteOutcome()` | @deprecated | `applyVoteOutcomeWithMode()` |

**Kept for:** Backward compatibility (remove after testing period)

---

## COMPLIANCE STATEMENT

✅ **TECH SPEC v18.x:** Fully aligned  
✅ **SCHEMA v17.0 (Governance):** Fully aligned  
✅ **GA HARD MODE:** Fully enforced  
✅ **Physical Primacy:** Respected (live = aggregate only)  
✅ **Constitution First:** Enforced (procedural lock-in)  
✅ **External Guardian:** Snapshot = constitutional freeze

**No violations found in production code.**

---

---

## ✅ ACTIONS EXECUTED

### **Deleted Files (7):**

```
✅ sql/archive/check_cast_vote_signature.sql
✅ sql/archive/check_vote_channel_enum.sql
✅ sql/archive/check_vote_choice_enum.sql
✅ sql/archive/check_vote_choice_only.sql
✅ sql/archive/check_votes_for_meeting.sql
✅ sql/archive/enable_immediate_voting_direct.sql
✅ sql/archive/enable_immediate_voting_test.sql
```

**Justification:** Legacy debug scripts, pre-date GA HARD MODE, potential conflicts

---

### **Deprecated Docs (2):**

```
⚠️ docs/V17_MIGRATION_PLAN.md - Header added
⚠️ docs/V17_SCHEMA_ANALYSIS.md - Header added
```

**Header added:**
```
⚠️ DEPRECATED - Historical Document
Current reality: We use meetings (not events)
See: ACTUAL_SCHEMA_REFERENCE.md, VOTING_FLOW_SPECIFICATION.md
```

---

### **Updated Components (3):**

```
✅ src/components/voting/voting-section.tsx
✅ src/components/voting/vote-modal.tsx
✅ src/components/meetings/agenda-item-voting.tsx
```

**Changes:** Use `canCastVoteWithSnapshot()`, `castVoteWithValidation()`

---

### **Updated Documentation (1):**

```
✅ docs/INDEX.md - GA HARD MODE section added
```

---

## FINAL STRUCTURE

### **Single Source of Truth:**

```
PRIMARY VOTING/GA SPEC:
  └─ docs/VOTING_FLOW_SPECIFICATION.md (v18.8.1)

GA HARD MODE IMPLEMENTATION:
  ├─ docs/GA_MODE_CONFIGURATION.md
  ├─ docs/GA_HARD_MODE_IMPLEMENTATION.md
  ├─ docs/GA_HARD_MODE_STRENGTHENING.md
  ├─ docs/GA_HARD_MODE_DEFENSE_IN_DEPTH.md
  ├─ docs/GA_PROCEDURAL_ITEMS.md
  ├─ docs/GA_PROCEDURAL_SEQUENCE.md
  ├─ docs/GA_COMPLETION_VALIDATION.md
  └─ docs/GA_HARD_MODE_DEPLOYMENT_GUIDE.md

SCHEMA:
  └─ docs/ACTUAL_SCHEMA_REFERENCE.md (meetings = canonical)

DEPRECATED (Historical):
  ├─ docs/V17_MIGRATION_PLAN.md (⚠️ header added)
  └─ docs/V17_SCHEMA_ANALYSIS.md (⚠️ header added)
```

---

## COMPLIANCE VERIFICATION

### ✅ **TECH SPEC v18.x:**
- All voting logic aligned
- GA HARD MODE enforced
- No conflicts found

### ✅ **SCHEMA v17.0 (Governance Layer):**
- Uses governance snapshot (deterministic)
- Enforces procedural sequence
- No dynamic governance reads post-publish

### ✅ **Physical Primacy:**
- IN_PERSON blocked for GA (individual)
- Live voting = aggregate only
- Compliant with principle

### ✅ **Constitution First:**
- Procedural lock-in enforced
- Completion validation required
- No bypasses possible

### ✅ **External Guardian:**
- Governance snapshot = constitutional freeze
- No unilateral changes possible
- System blocks violations

---

**Autorius:** Branduolys AI  
**Executed:** 2025-01-09  
**Statusas:** ✅ **HARD CLEANUP COMPLETE**

🧹 **SURFACE REDUCED. CONFUSION REMOVED. CONSTITUTION ENFORCED.** 🧹

