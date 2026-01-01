# Voting Module Governance Audit Report

## Executive Summary

This audit reviews the voting/resolution system for governance compliance. The focus is on:
- Quorum calculation
- Voting eligibility
- Resolution lifecycle
- Immutability after approval
- Prevention of pre/post voting abuse

## Audit Process

1. **Run `sql/audit_voting_governance.sql`** - Identifies issues
2. **Review findings** - Check for blockers
3. **Apply fixes** - Run `sql/fix_voting_governance.sql`
4. **Re-audit** - Verify fixes resolved issues

## Expected Issues & Fixes

### 1. Status Constraint Missing
**Issue**: `resolutions.status` may not have CHECK constraint enforcing valid values (DRAFT, PROPOSED, APPROVED, REJECTED)

**Fix**: Adds CHECK constraint `resolutions_status_check`

**Severity**: BLOCKER (allows invalid status values)

### 2. Immutability Violation
**Issue**: APPROVED resolutions can be modified (title, content, status, etc.)

**Fix**: Creates trigger `prevent_approved_resolution_update_trigger` that blocks all updates to APPROVED resolutions except `updated_at`

**Severity**: BLOCKER (violates legal immutability requirement)

### 3. Missing Adoption Fields
**Issue**: APPROVED resolutions may not have `adopted_at` and `adopted_by` set

**Fix**: 
- Updates existing APPROVED resolutions to set missing fields
- Creates trigger `ensure_approved_resolution_adoption_trigger` to auto-set fields when status becomes APPROVED

**Severity**: BLOCKER (missing audit trail)

### 4. Quorum Calculation Missing
**Issue**: No function or view for quorum calculation

**Fix**: 
- Adds `quorum_percentage` column to `org_rulesets` if missing
- Creates function `calculate_quorum(org_id, total_members, present_members)`
- Creates view `voting_eligibility` for eligibility checks

**Severity**: WARNING (functionality incomplete but not blocking)

### 5. Voting Eligibility Not Enforced
**Issue**: No database-level enforcement of voting eligibility

**Fix**: Creates view `voting_eligibility` that checks:
- Member status = ACTIVE
- Org status = ACTIVE
- Active ruleset exists

**Severity**: WARNING (should be enforced in application logic)

## Governance Rules Enforced

### ✅ Physical Primacy
- No fake online voting (system only records decisions made in physical world)
- Resolutions are legal acts, not UI actions

### ✅ Immutability
- APPROVED resolutions cannot be modified (enforced by trigger)
- Only `updated_at` can change for audit purposes

### ✅ Audit Trail
- `adopted_at` and `adopted_by` required for APPROVED resolutions
- Triggers ensure fields are set automatically

### ✅ Status Lifecycle
- Valid statuses enforced by CHECK constraint
- Status transitions should be validated in application logic

## SQL Scripts

### Audit Script
```sql
sql/audit_voting_governance.sql
```
- Checks table structures
- Verifies constraints
- Tests immutability
- Analyzes resolution lifecycle
- Reviews RLS policies
- Generates summary report

### Fix Script
```sql
sql/fix_voting_governance.sql
```
- Creates missing tables/columns
- Adds CHECK constraints
- Creates immutability triggers
- Ensures adoption fields
- Adds quorum calculation
- Creates voting eligibility view
- Enables RLS
- Creates indexes

## Testing Checklist

After applying fixes, verify:

- [ ] APPROVED resolutions cannot be updated (try UPDATE on title/content)
- [ ] Status constraint rejects invalid values (try INSERT with status='INVALID')
- [ ] APPROVED resolutions have `adopted_at` and `adopted_by` set
- [ ] Quorum function calculates correctly
- [ ] Voting eligibility view returns correct results
- [ ] RLS policies prevent unauthorized access

## Verdict

**Status**: PENDING (run audit script first)

**Expected Outcome**:
- If audit finds blockers → Apply fixes → Re-audit → "OK for testing" or "BLOCKER"
- If audit finds no blockers → "OK for testing"

## Notes

1. **Voting Tables**: The audit checks for `votes`, `ballots`, and `voting_sessions` tables. If these don't exist, it means voting is not yet implemented at the database level (only resolutions exist).

2. **Quorum Storage**: Quorum percentage should be stored in `org_rulesets.quorum_percentage` (from governance config). The fix script adds this column if missing.

3. **Application Logic**: Database constraints enforce data integrity, but application logic should also validate:
   - Voting eligibility before allowing votes
   - Quorum calculation before approving resolutions
   - Status transitions (DRAFT → PROPOSED → APPROVED/REJECTED)

4. **RLS Policies**: The audit checks existing RLS policies but doesn't modify them. Ensure policies prevent:
   - Non-members from viewing resolutions
   - Non-OWNER from approving/rejecting
   - Unauthorized status changes

