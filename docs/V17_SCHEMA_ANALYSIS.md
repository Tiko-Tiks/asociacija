---
**⚠️ DEPRECATED - Historical Analysis Document**

This document analyzes v17.0 schema mismatch (events vs meetings).

**Current reality (v18.8.6):**
- We use `meetings` table (NOT `events`)
- All required fields exist in `meetings`
- GA HARD MODE enforces procedural governance
- See: `docs/ACTUAL_SCHEMA_REFERENCE.md` for current schema

**Status:** Historical reference only - DO NOT USE for implementation
---

# v17.0 Schema Analysis (DEPRECATED)

## Provided Schema (v17.0)

### Events Table
- `id`, `org_id`, `title`, `description`, `start_time`, `end_time`, `location`, `event_type`, `is_public`, `created_at`, `created_by`

### Event Attendance Table
- `id`, `event_id`, `org_id`, `user_id`, `status`, `source`, `dispute_reason`, `marked_at`, `marked_by`

## Current Code Requirements

### Meetings Table (Current)
- `id`, `org_id`, `title`, `scheduled_at`, `scheduled_end?`, `location`, `meeting_type`, `status`, `published_at`, `notice_days`, `notice_sent_at`, `agenda_version`, `quorum_met`, `created_by`, `created_at`

### Meeting Attendance (Current)
- `id`, `meeting_id`, `membership_id`, `attendance_type`, `mode`, `present`, `joined_at`, `left_at`

## Missing in v17.0

### Critical Missing Fields:
1. **`status`** - Meeting status (DRAFT/PUBLISHED/COMPLETED/CANCELLED)
2. **`published_at`** - When meeting was published
3. **`notice_days`** - Notice period
4. **`quorum_met`** - Quorum status
5. **`agenda_version`** - Agenda versioning

### Missing Tables:
1. **`meeting_agenda_items`** - Agenda items
2. **`meeting_agenda_attachments`** - Attachments
3. **`meeting_protocols`** - Protocols
4. **`meeting_remote_voters`** - Remote voters

### Schema Differences:
1. **`scheduled_at`** → `start_time` (OK)
2. **`scheduled_end`** → `end_time` (OK)
3. **`membership_id`** → `user_id` (CHANGE REQUIRED)
4. **`present` boolean** → `status` text (CHANGE REQUIRED)
5. **`attendance_type`** → `source` (CHANGE REQUIRED)

## Questions

1. **Does v17.0 events table have `status` field?** (Not in provided schema)
2. **Where do agenda items go?** (Not in v17.0)
3. **Where do protocols go?** (Not in v17.0)
4. **How is quorum tracked?** (Not in v17.0)

## Recommendation

**OPTION A**: v17.0 schema is incomplete
- Add missing fields to events table
- Add missing tables (agenda_items, protocols)

**OPTION B**: v17.0 schema is simplified
- Remove agenda items functionality
- Remove protocols functionality
- Simplify quorum tracking

**OPTION C**: Current schema is correct
- Keep using `meetings` table
- Update documentation to reflect actual schema

## Decision Needed

Before migration, need to clarify:
1. Is v17.0 schema complete?
2. Are missing fields/tables intentional?
3. Should we extend v17.0 or simplify code?

