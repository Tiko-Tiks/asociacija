---
**⚠️ DEPRECATED - Historical Planning Document**

This document describes v17.0 migration planning (events table approach).

**Current reality (v18.8.6):**
- We use `meetings` table (NOT `events`)
- GA HARD MODE procedural enforcement active
- See: `docs/ACTUAL_SCHEMA_REFERENCE.md` for current deployed schema
- See: `docs/VOTING_FLOW_SPECIFICATION.md` (v18.8.1) for GA/voting

**Status:** Historical reference only - DO NOT USE for implementation
---

# v17.0 Schema Migration Plan (DEPRECATED)

## Schema Changes

### OLD (v15.1) → NEW (v17.0)

| Old Table | New Table | Notes |
|-----------|-----------|-------|
| `meetings` | `events` | Add `event_type = 'MEETING'` filter |
| `meeting_attendance` | `event_attendance` | Same structure |
| `meeting_agenda_items` | ❓ | **NOT IN v17.0** - Need clarification |
| `meeting_agenda_attachments` | ❓ | **NOT IN v17.0** - Need clarification |
| `meeting_protocols` | ❓ | **NOT IN v17.0** - Need clarification |
| `meeting_remote_voters` | ❓ | **NOT IN v17.0** - Need clarification |

## Events Table Structure (v17.0)

```sql
events (
  id uuid,
  org_id uuid,
  title text,
  description text,
  start_time timestamptz,
  end_time timestamptz,
  location text,
  event_type text,  -- 'MEETING' / 'WORK' / 'ADMIN' / 'REPRESENTATION' / 'OTHER'
  is_public boolean,
  created_at timestamptz,
  created_by uuid
)
```

## Event Attendance Table Structure (v17.0)

```sql
event_attendance (
  id uuid,
  event_id uuid,  -- FK → events (not meeting_id!)
  org_id uuid,
  user_id uuid,
  status text,  -- 'PRESENT' / 'ABSENT' / 'EXCUSED'
  source text,  -- 'SELF' / 'ADMIN' / 'SYSTEM'
  dispute_reason text,
  marked_at timestamptz,
  marked_by uuid
)
```

## Key Differences

1. **meetings → events**: 
   - `scheduled_at` → `start_time`
   - `scheduled_end` → `end_time`
   - Add `event_type = 'MEETING'` filter everywhere
   - Add `location` field

2. **meeting_attendance → event_attendance**:
   - `meeting_id` → `event_id`
   - `present` boolean → `status` text ('PRESENT' / 'ABSENT' / 'EXCUSED')
   - Add `source`, `dispute_reason`, `marked_by` fields

3. **Missing Tables**:
   - `meeting_agenda_items` - NOT in v17.0
   - `meeting_agenda_attachments` - NOT in v17.0
   - `meeting_protocols` - NOT in v17.0
   - `meeting_remote_voters` - NOT in v17.0

## Migration Strategy

### Phase 1: Core Tables
1. Replace `meetings` → `events` with `event_type = 'MEETING'`
2. Replace `meeting_attendance` → `event_attendance`
3. Update column names: `scheduled_at` → `start_time`, `present` → `status`

### Phase 2: Missing Tables
- **Option A**: Remove functionality (agenda items, protocols, remote voters)
- **Option B**: Use alternative storage (JSONB in events table?)
- **Option C**: Keep old tables if they exist in actual DB

### Phase 3: Components
- Update all components that use meetings
- Update UI to reflect new schema

## Files to Migrate

### High Priority:
1. `src/app/actions/meetings.ts` - Core meetings logic
2. `src/app/actions/meeting-attendance.ts` - Attendance logic
3. `src/app/actions/governance.ts` - Uses meetings
4. `src/app/actions/voting.ts` - Uses meetings

### Medium Priority:
5. `src/app/actions/published-meetings.ts`
6. `src/app/actions/dashboard.ts`
7. `src/app/actions/protocols.ts`

### Components:
8. `src/components/meetings/*` - All meeting components

## Questions

1. **Agenda Items**: Where do they go in v17.0? JSONB in events?
2. **Protocols**: Where do they go in v17.0?
3. **Remote Voters**: How to handle in v17.0?
4. **Voting**: How does voting work with events?

## Next Steps

1. Start with core `meetings.ts` migration
2. Test each migration step
3. Update components after actions are migrated

