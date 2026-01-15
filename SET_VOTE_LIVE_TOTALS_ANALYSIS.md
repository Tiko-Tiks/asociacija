# set_vote_live_totals Function Analysis
**Date:** 2026-01-11  
**Purpose:** Ensure semantic separation: fact.* for human input, indicator.* for calculated values  
**Constraint:** NO schema changes - adjust metadata keys only

---

## CURRENT FUNCTION LOCATION

**Primary Implementation:**
- `sql/modules/voting/create_set_vote_live_totals.sql`
- `sql/fix_search_path_set_vote_live_totals.sql` (fixed version)

**Usage:**
- `src/app/actions/live-voting.ts` - calls the RPC function

---

## CURRENT FUNCTION SIGNATURE

```sql
CREATE OR REPLACE FUNCTION public.set_vote_live_totals(
  p_vote_id uuid,
  p_live_against_count int,      -- Human input
  p_live_abstain_count int        -- Human input
)
RETURNS TABLE(
  ok boolean,
  reason text,
  live_present_count int,         -- Derived from meeting_attendance
  live_for_count int              -- Calculated: present - against - abstain
)
```

---

## CURRENT LOGIC

1. **live_present_count**: Derived from `meeting_attendance` (NOT a parameter)
   ```sql
   SELECT COUNT(*) INTO v_computed_live_present_count
   FROM public.meeting_attendance
   WHERE meeting_id = v_meeting_id
     AND present = true
     AND mode = 'IN_PERSON';
   ```

2. **live_for_count**: Calculated value
   ```sql
   v_computed_live_for_count := v_computed_live_present_count - p_live_against_count - p_live_abstain_count;
   ```

3. **Storage**: Data stored in `vote_live_totals` table columns:
   - `live_present_count` (derived, not human input)
   - `live_for_count` (calculated)
   - `live_against_count` (human input: p_live_against_count)
   - `live_abstain_count` (human input: p_live_abstain_count)

---

## v19.0 SPECIFICATION REQUIREMENT

From `docs/VOTING_FLOW_SPECIFICATION.md` (lines 145-161):

### Human Input (fact.*):
- `fact.live_present`
- `fact.live_against`
- `fact.live_abstain`

### Calculated Value (indicator.*):
- `indicator.live_for`

---

## ANALYSIS

### Current vs. Specification Mismatch

**Issue 1:** Specification says `fact.live_present` is human input, but function derives it from `meeting_attendance`

**Issue 2:** Function stores data in table columns, not metadata JSONB

**Issue 3:** Function takes only 2 human inputs (against, abstain), not 3 (present, against, abstain)

### Semantic Mapping (Current Function)

**Human Input (Parameters):**
- `p_live_against_count` → Should map to `fact.live_against`
- `p_live_abstain_count` → Should map to `fact.live_abstain`

**Derived (NOT human input):**
- `live_present_count` → Derived from meeting_attendance (NOT `fact.live_present` per spec)

**Calculated:**
- `live_for_count` → Should map to `indicator.live_for`

---

## RECOMMENDATION

Since the user said "Do NOT change schema. If needed, adjust metadata keys only":

**Current Situation:**
- Function uses table columns (not metadata)
- Schema freeze prevents adding metadata column to vote_live_totals table

**Options:**

1. **If vote_live_totals table has metadata column:**
   - Store semantic keys in metadata JSONB:
     ```jsonb
     {
       "fact": {
         "live_against": <value>,
         "live_abstain": <value>
       },
       "indicator": {
         "live_for": <value>
       }
     }
     ```
   - Keep column values for compatibility
   - Update function to also write metadata

2. **If vote_live_totals table does NOT have metadata column:**
   - Cannot store metadata (schema freeze)
   - Function behavior must remain as-is
   - Semantic separation cannot be implemented in database
   - Documentation/comments can clarify semantic intent

**Note:** The specification's `fact.live_present` doesn't match current function (which derives present_count from meeting_attendance). This is a specification vs. implementation mismatch that needs clarification.

---

## NEXT STEPS

1. ✅ Function located: `sql/modules/voting/create_set_vote_live_totals.sql`
2. ⚠️ Check if `vote_live_totals` table has metadata column
3. ⚠️ Clarify specification vs. implementation mismatch for `live_present`
4. ⚠️ Implement metadata storage if table has metadata column
5. ⚠️ Update function comments to clarify semantic separation
