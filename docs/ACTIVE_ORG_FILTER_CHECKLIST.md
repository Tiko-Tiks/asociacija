# ACTIVE ORG FILTER ENFORCEMENT - CHECKLIST

## Summary
All RPC functions and SQL views that reference `orgs` or `memberships` have been updated to:
1. Enforce hard filter: `WHERE orgs.status = 'ACTIVE'`
2. Explicitly EXCLUDE any logic using `status != 'SUSPENDED'` or `status IN (...)`
3. Add guard to exclude PRE_ORG: `NOT (orgs.status = 'ONBOARDING' AND orgs.metadata->'fact'->>'pre_org' = 'true')`

## Modified Files

### VIEWS

- [x] `sql/modules/members/create_member_debts_view.sql`
  - Added `INNER JOIN orgs o ON o.id = m.org_id`
  - Added `AND o.status = 'ACTIVE'`
  - Added `AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')`

- [x] `sql/modules/finance/schedule_overdue_invoices.sql`
  - View: `overdue_invoices_summary`
  - Added `AND o.status = 'ACTIVE'`
  - Added `AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')`

- [x] `sql/modules/projects/create_ideas_projects_module.sql`
  - View query: `total_active_members` calculation
  - Added `INNER JOIN public.orgs o ON o.id = m.org_id`
  - Added `AND o.status = 'ACTIVE'`
  - Added `AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')`

### RPC FUNCTIONS - VOTING MODULE

- [x] `sql/modules/voting/create_vote_rpc_functions.sql`
  - Function: `can_cast_vote`
    - Membership check query updated
  - Function: `cast_vote`
    - Membership check query updated
  - Function: `close_vote`
    - Membership check query updated (2 occurrences)
    - Positions check query updated
  - Function: `apply_vote_outcome`
    - Membership check query updated (2 occurrences)
    - Positions check query updated

- [x] `sql/modules/voting/create_simple_vote_rpc_functions.sql`
  - Function: `can_cast_simple_vote`
    - Membership check query updated
  - Function: `cast_simple_vote`
    - Membership check query updated

- [x] `sql/modules/voting/enforce_one_member_one_vote.sql`
  - Function: `can_register_in_person`
    - Membership check query updated
  - Function: `register_in_person_attendance`
    - OWNER/BOARD check queries updated (2 occurrences)
  - Function: `unregister_in_person_attendance`
    - OWNER/BOARD check queries updated (2 occurrences)

### RPC FUNCTIONS - MEETINGS MODULE

- [x] `sql/modules/meetings/create_meeting_agenda_rpc_functions.sql`
  - Function: `can_schedule_meeting`
    - Membership check query updated (1 occurrence)
    - Positions check query updated (1 occurrence)
  - Multiple functions with membership checks (6+ occurrences total)
    - All updated with org status filter

- [x] `sql/modules/protocols/create_protocol_rpc_functions.sql`
  - Function: `build_meeting_protocol_snapshot`
    - `total_active_members` calculation updated
  - Multiple functions with membership checks (3+ occurrences total)
    - All updated with org status filter

- [x] `sql/fix_search_path_meeting_quorum_status.sql`
  - Function: `meeting_quorum_status`
    - Total active members count updated
    - IN_PERSON attendees count updated
    - REMOTE voters count updated

### RPC FUNCTIONS - IDEAS MODULE

- [x] `sql/modules/ideas/create_ideas_rpc_functions.sql`
  - Function: `rpc_create_idea`
    - Membership check query updated
  - Function: `rpc_add_comment`
    - Membership check query updated
  - Function: `rpc_promote_to_resolution_draft`
    - Membership check query updated

### RPC FUNCTIONS - PROJECTS MODULE

- [x] `sql/modules/projects/create_ideas_projects_rpc.sql`
  - Multiple functions with membership checks (9+ occurrences total)
    - All updated with org status filter

- [x] `sql/modules/projects/create_ideas_projects_rls.sql`
  - RLS policies updated (18+ occurrences total)
    - All membership checks updated with org status filter

- [x] `sql/modules/projects/create_ideas_projects_module.sql`
  - View query updated

### RPC FUNCTIONS - ORGANIZATIONS MODULE

- [x] `sql/modules/organizations/create_org_review_rpc.sql`
  - Function: `is_org_owner`
    - Updated with org status filter
  - Multiple functions with membership checks (4+ occurrences total)
    - All updated with org status filter

- [x] `sql/modules/organizations/create_org_review_rls.sql`
  - RLS policies updated (2 occurrences)
    - All membership checks updated with org status filter

### RLS POLICIES

- [x] `sql/modules/meetings/fix_meeting_attendance_rls.sql`
  - OWNER policy updated (2 occurrences)
  - Members view policy updated (1 occurrence)

- [x] `sql/modules/ideas/create_ideas_rls_policies.sql`
  - Ideas SELECT policy updated
  - Idea comments SELECT policy updated
  - Idea comments INSERT policy updated

## Pattern Applied

All queries follow this pattern:

```sql
FROM public.memberships m
INNER JOIN public.orgs o ON o.id = m.org_id
WHERE ...
  AND m.member_status = 'ACTIVE'
  AND o.status = 'ACTIVE'
  AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')
```

For views:
```sql
FROM memberships m
INNER JOIN orgs o ON o.id = m.org_id
WHERE m.member_status = 'ACTIVE'
  AND o.status = 'ACTIVE'
  AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')
```

## Excluded Files (Onboarding-Only)

The following files were NOT modified as they are onboarding-only queries:
- `sql/modules/organizations/create_community_applications_table.sql`
- `sql/modules/organizations/assign_existing_users_to_org.sql`
- Any queries in V2 onboarding routes

## Notes

1. **PRE_ORG Status**: The filter excludes organizations with `status = 'ONBOARDING'` AND `metadata->'fact'->>'pre_org' = 'true'` to exclude V2 onboarding organizations that haven't completed the process.

2. **Hard Filter**: All queries now enforce `orgs.status = 'ACTIVE'` as a hard requirement. No soft filters like `status != 'SUSPENDED'` or `status IN (...)` are used.

3. **Consistency**: All membership checks now consistently:
   - Join with `orgs` table
   - Filter for `ACTIVE` status
   - Exclude `PRE_ORG` organizations

4. **Member Status**: The pattern uses `m.member_status = 'ACTIVE'` (not `m.status = 'ACTIVE'`) to match the actual column name in the `memberships` table.

## Verification

To verify all changes:
1. Search for remaining `FROM.*memberships` without `INNER JOIN.*orgs`
2. Search for `orgs.status` filters that don't include the PRE_ORG exclusion
3. Test each modified function with a PRE_ORG organization to ensure it's excluded
