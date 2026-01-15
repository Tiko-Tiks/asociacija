# Voting / GA Module Governance v19.0 Audit Report (Final)
**Status:** ✅ **ACCEPTED**  
**Date:** 2026-01-11  
**Scope:** Voting and GA (General Assembly) module  
**Governance Layer:** v19.0 (Code Freeze)  
**Audit Type:** Focused Governance Compliance - Final Review

---

## EXECUTIVE SUMMARY

This final audit examines the Voting/GA module for compliance with Governance Layer v19.0 requirements, focusing on:
- **Governance snapshot presence** - Storage in `meetings.metadata.governance_snapshot`
- **Snapshot immutability** - Protection against modification after publication
- **Fact vs indicator semantic correctness** - Proper separation of human input (fact.*) vs derived/calculated values (indicator.*)

**Overall Status:** ✅ **COMPLIANT** with all critical requirements met

---

## 1. GOVERNANCE SNAPSHOT PRESENCE

### v19.0 Specification Requirement

From `docs/VOTING_FLOW_SPECIFICATION.md` (lines 85-104):
- Snapshot stored as: `meetings.metadata.governance_snapshot`
- Snapshot captures: quorum, early voting days, procedural item numbers
- Snapshot captured at meeting publication time
- Snapshot is immutable after publication

### Implementation Status: ✅ **COMPLIANT**

#### Findings:

**1. Snapshot Capture at Publication:**
- ✅ Location: `src/app/actions/meetings.ts:810-860`
- ✅ Function: `publishMeeting()` captures snapshot after `publish_meeting` RPC
- ✅ Captures quorum, early_voting_days, procedural_item_numbers
- ✅ Stores in `meetings.metadata.governance_snapshot`
- ✅ Includes `captured_at` timestamp

**Evidence:**
```typescript
// src/app/actions/meetings.ts:835-846
const snapshot = await getGovernanceSnapshot(meeting.org_id, meetingData?.scheduled_at)

const snapshotWithProceduralItems = {
  ...snapshot,
  procedural_item_numbers: proceduralItemNumbers,
  captured_at: new Date().toISOString(),
}

await saveMeetingSnapshot(meetingId, snapshotWithProceduralItems)
```

**2. Snapshot Storage:**
- ✅ Location: `src/lib/governance/snapshot.ts:94-155`
- ✅ Function: `saveMeetingSnapshot()` stores snapshot in `meetings.metadata.governance_snapshot`
- ✅ Uses proper JSONB structure
- ✅ Preserves existing metadata

**Evidence:**
```typescript
// src/lib/governance/snapshot.ts:131-140
const updatedMetadata = {
  ...currentMetadata,
  governance_snapshot: snapshotWithTimestamp,
}

const { error } = await supabase
  .from('meetings')
  .update({ metadata: updatedMetadata })
  .eq('id', meetingId)
```

**3. Snapshot Content:**
- ✅ Includes `quorum_percentage`
- ✅ Includes `early_voting_days`
- ✅ Includes `procedural_item_numbers` (array of item numbers 1-3)
- ✅ Includes `captured_at` timestamp
- ✅ Includes `freeze_at` and `scheduled_at` references

**Risk Level:** 🟢 **LOW**

**Conclusion:**
Governance snapshot is **properly captured and stored** in `meetings.metadata.governance_snapshot` at publication time. Implementation aligns with v19.0 specification requirements.

---

## 2. SNAPSHOT IMMUTABILITY

### v19.0 Specification Requirement

From `docs/VOTING_FLOW_SPECIFICATION.md` (lines 85-104):
- Snapshot is immutable after meeting publication (status = PUBLISHED)
- Snapshot can only be set during publication
- No modifications allowed after publication

### Implementation Status: ✅ **COMPLIANT**

#### Findings:

**1. Immutability Check:**
- ✅ Location: `src/lib/governance/snapshot.ts:114-123`
- ✅ Function: `saveMeetingSnapshot()` checks meeting status
- ✅ Blocks modification if meeting is PUBLISHED and snapshot exists
- ✅ Throws error with clear message

**Evidence:**
```typescript
// src/lib/governance/snapshot.ts:114-123
// Governance v19.0: Snapshot is IMMUTABLE after publication
// If meeting is PUBLISHED and snapshot already exists, block modification
if (meeting.status === 'PUBLISHED' && existingSnapshot) {
  console.error('[saveMeetingSnapshot] Cannot modify governance snapshot for PUBLISHED meeting:', {
    meeting_id: meetingId,
    status: meeting.status,
    existing_snapshot_captured_at: existingSnapshot.captured_at,
  })
  throw new Error('Governance snapshot is immutable for PUBLISHED meetings. Snapshot can only be set during publication.')
}
```

**2. Logic Flow:**
- ✅ Snapshot is set AFTER `publish_meeting` RPC changes status to PUBLISHED
- ✅ First call during publication: status is PUBLISHED, snapshot doesn't exist → allows set (correct)
- ✅ Subsequent calls: status is PUBLISHED, snapshot exists → blocks modification (correct)
- ✅ Error message clearly explains the restriction

**3. Protection Level:**
- ✅ Application-level protection via `saveMeetingSnapshot()` function
- ✅ All snapshot updates must go through this function
- ⚠️ **OBSERVATION:** Direct metadata updates (bypassing function) are not protected at database level
- ✅ Governance-compliant: Application logic is sufficient for controlled access patterns

**Risk Level:** 🟢 **LOW**

**Conclusion:**
Snapshot immutability is **properly enforced** at the application level. The implementation correctly blocks modifications to `governance_snapshot` for PUBLISHED meetings while allowing the initial snapshot to be set during publication.

---

## 3. FACT VS INDICATOR SEMANTIC CORRECTNESS

### v19.0 Specification Requirement

From `docs/VOTING_FLOW_SPECIFICATION.md` (lines 145-163):
- **Human Input (fact.*):** Only `fact.live_against` and `fact.live_abstain`
- **Derived/Calculated (indicator.*):** `indicator.live_present` (derived from meeting_attendance) and `indicator.live_for` (calculated)
- `live_present` is NOT human input - it is derived from `meeting_attendance` table

### Implementation Status: ✅ **COMPLIANT**

#### Findings:

**1. Function Implementation:**
- ✅ Location: `sql/modules/voting/create_set_vote_live_totals.sql`
- ✅ Function: `set_vote_live_totals()`
- ✅ Human input parameters: `p_live_against_count`, `p_live_abstain_count` (only 2 parameters)
- ✅ Derived value: `live_present_count` calculated from `meeting_attendance` (NOT a parameter)
- ✅ Calculated value: `live_for_count` = present - against - abstain

**Evidence:**
```sql
-- sql/modules/voting/create_set_vote_live_totals.sql:64-73
-- Derive live_present_count from meeting_attendance
SELECT COUNT(*) INTO v_computed_live_present_count
FROM public.meeting_attendance
WHERE meeting_id = v_meeting_id
  AND present = true
  AND mode = 'IN_PERSON';

-- Calculate live_for_count (must be >= 0)
v_computed_live_for_count := v_computed_live_present_count - p_live_against_count - p_live_abstain_count;
```

**2. Semantic Metadata Writes:**
- ✅ Location: `sql/modules/voting/create_set_vote_live_totals.sql:112-203`
- ✅ Writes `fact.live_against` (human input)
- ✅ Writes `fact.live_abstain` (human input)
- ✅ Writes `indicator.live_present` (derived from meeting_attendance)
- ✅ Writes `indicator.live_for` (calculated value)
- ✅ Stores in `votes.metadata` if available, otherwise `resolution.metadata`
- ✅ Preserves existing metadata structure

**Evidence:**
```sql
-- sql/modules/voting/create_set_vote_live_totals.sql:128-155
-- Set fact.live_against (human input)
v_updated_vote_metadata := jsonb_set(
  v_updated_vote_metadata,
  ARRAY['fact', 'live_against'],
  to_jsonb(p_live_against_count),
  true
);
-- Set fact.live_abstain (human input)
v_updated_vote_metadata := jsonb_set(
  v_updated_vote_metadata,
  ARRAY['fact', 'live_abstain'],
  to_jsonb(p_live_abstain_count),
  true
);
-- Set indicator.live_present (derived)
v_updated_vote_metadata := jsonb_set(
  v_updated_vote_metadata,
  ARRAY['indicator', 'live_present'],
  to_jsonb(v_computed_live_present_count),
  true
);
-- Set indicator.live_for (calculated)
v_updated_vote_metadata := jsonb_set(
  v_updated_vote_metadata,
  ARRAY['indicator', 'live_for'],
  to_jsonb(v_computed_live_for_count),
  true
);
```

**3. Documentation Alignment:**
- ✅ Location: `docs/VOTING_FLOW_SPECIFICATION.md:145-163`
- ✅ Correctly defines `fact.live_against` and `fact.live_abstain` as human input (only 2)
- ✅ Correctly defines `indicator.live_present` as derived from `meeting_attendance`
- ✅ Correctly defines `indicator.live_for` as calculated
- ✅ Includes clarification that `live_present` is NOT human input

**Risk Level:** 🟢 **LOW**

**Conclusion:**
Fact vs indicator semantic separation is **correctly implemented**. The function only accepts 2 human inputs (against, abstain), derives `live_present` from `meeting_attendance`, calculates `live_for`, and writes semantic metadata with proper namespace separation (fact.* for human input, indicator.* for derived/calculated values).

---

## SUMMARY OF FINDINGS

| Category | Status | Risk Level | Notes |
|----------|--------|------------|-------|
| Governance Snapshot Presence | ✅ COMPLIANT | 🟢 LOW | Snapshot properly captured and stored in `meetings.metadata.governance_snapshot` at publication |
| Snapshot Immutability | ✅ COMPLIANT | 🟢 LOW | Application-level protection blocks modifications for PUBLISHED meetings |
| Fact vs Indicator Semantics | ✅ COMPLIANT | 🟢 LOW | Correct semantic separation: only 2 human inputs (fact.*), derived/calculated values (indicator.*) |

---

## RECOMMENDATIONS

### Critical (None)
All critical requirements are met. No critical recommendations.

### Optional Enhancements (Low Priority)

1. **Database-Level Snapshot Protection (Optional):**
   - Consider adding a database trigger to prevent direct metadata updates that bypass `saveMeetingSnapshot()`
   - Current application-level protection is sufficient for controlled access patterns
   - Database-level protection would provide defense-in-depth

2. **Snapshot Validation (Optional):**
   - Consider adding validation to ensure snapshot contains all required fields before saving
   - Current implementation assumes snapshot structure is correct
   - Validation would provide additional safety

---

## CONCLUSION

The Voting / GA module is **fully compliant** with Governance Layer v19.0 requirements:

1. ✅ **Governance snapshot is properly captured and stored** in `meetings.metadata.governance_snapshot` at publication time, including quorum, early voting days, and procedural item numbers.

2. ✅ **Snapshot immutability is properly enforced** at the application level, blocking modifications to `governance_snapshot` for PUBLISHED meetings while allowing the initial snapshot to be set during publication.

3. ✅ **Fact vs indicator semantic separation is correctly implemented**, with only 2 human inputs (`fact.live_against`, `fact.live_abstain`) and proper use of `indicator.*` namespace for derived/calculated values (`indicator.live_present`, `indicator.live_for`).

All implementations align with the v19.0 specification requirements and Governance Layer principles.

---

**Audit Completed:** 2026-01-11  
**Auditor:** AI Governance Compliance Check  
**Next Review:** As needed for future Governance Layer updates
