# Actual Database Schema Reference

**Last Updated**: 2026-01-06  
**Source**: `sql/consolidated_all.sql`  
**Status**: Current deployed schema

## Core Tables

### `orgs`
Organization/community table.
- `id`, `name`, `slug`, `status`, `created_at`

### `memberships`
User-organization relationship (technical access).
- `id`, `org_id`, `user_id`, `role` (OWNER/MEMBER), `member_status` (PENDING/ACTIVE/SUSPENDED/LEFT), `status_reason`, `joined_at`, `left_at`, `created_at`

### `profiles`
User profiles (privacy: only `id, full_name` in public contexts).
- `id`, `full_name`, `first_name`, `last_name`, `email?`, `phone?`, `metadata?`

---

## Governance Tables

### `positions`
Organizational positions (authority, not technical role).
- `id`, `org_id`, `user_id`, `title`, `start_date`, `end_date`, `is_active`, `created_at`

### `resolutions`
Legal resolutions/decisions.
- `id`, `org_id`, `resolution_number`, `title`, `content`, `status` (DRAFT/PROPOSED/APPROVED/REJECTED), `visibility` (BOARD/MEMBERS/PUBLIC), `adopted_at`, `adopted_by`, `created_at`, `created_by`

---

## Meetings Tables (CURRENT SCHEMA)

### `meetings`
GA meetings.
- `id`, `org_id`, `title`, `scheduled_at`, `scheduled_end?`, `location`, `meeting_type`, `status` (DRAFT/PUBLISHED/CANCELLED/COMPLETED), `published_at`, `notice_days`, `notice_sent_at`, `agenda_version`, `quorum_met`, `created_by`, `created_at`

### `meeting_attendance`
Meeting attendance tracking.
- `id`, `meeting_id`, `membership_id`, `attendance_type` (IN_PERSON/REMOTE), `mode` (IN_PERSON/WRITTEN/REMOTE), `present` (boolean), `joined_at`, `left_at`

### `meeting_agenda_items`
Agenda items for meetings.
- `id`, `meeting_id`, `item_no`, `title`, `summary`, `details`, `resolution_id`, `created_by`, `created_at`, `updated_at`

### `meeting_agenda_attachments`
Attachments for agenda items.
- `id`, `agenda_item_id`, `storage_bucket`, `storage_path`, `file_name`, `mime_type`, `size_bytes`, `uploaded_by`, `uploaded_at`

### `meeting_protocols`
Meeting protocols (immutable after finalization).
- `id`, `org_id`, `meeting_id`, `protocol_number`, `version`, `status` (DRAFT/FINAL), `snapshot` (JSONB), `snapshot_hash`, `pdf_bucket`, `pdf_path`, `created_by`, `created_at`, `finalized_by`, `finalized_at`

### `meeting_remote_voters`
Remote voters tracking (view or table).
- Used for tracking remote voters separately

---

## Voting Tables

### `votes`
Voting records.
- `id`, `org_id`, `meeting_id`, `resolution_id`, `kind` (GA/OPINION), `status` (OPEN/CLOSED), `opens_at`, `closes_at`, `created_at`

### `ballots`
Individual votes.
- `id`, `vote_id`, `membership_id`, `choice` (FOR/AGAINST/ABSTAIN), `channel` (IN_PERSON/WRITTEN/REMOTE), `cast_at`, `signed_by`

### `simple_votes`
Simple voting (alternative voting system).
- `id`, `org_id`, `title`, `description`, `status`, `created_at`

### `simple_vote_ballots`
Simple vote ballots.
- `id`, `simple_vote_id`, `membership_id`, `choice`, `cast_at`

---

## Projects & Ideas

### `projects`
Projects.
- `id`, `org_id`, `idea_id`, `title`, `description`, `status` (PLANNING/FUNDING/IN_PROGRESS/COMPLETED/CANCELLED), `budget_eur`, `created_by`, `created_at`, `funding_opened_at`, `completed_at`

### `ideas`
Ideas.
- `id`, `org_id`, `title`, `summary`, `details`, `status` (DRAFT/OPEN/PASSED/FAILED/NOT_COMPLETED/ARCHIVED), `public_visible`, `created_by`, `created_at`, `opened_at`, `closed_at`, `passed_at`

---

## Events (if exists)

### `events` (if deployed)
General events (may include meetings).
- `id`, `org_id`, `title`, `description`, `start_time`, `end_time`, `location`, `event_type` (MEETING/WORK/ADMIN/REPRESENTATION/OTHER), `is_public`, `created_at`, `created_by`

### `event_attendance` (if deployed)
Event attendance.
- `id`, `event_id`, `org_id`, `user_id`, `status` (PRESENT/ABSENT/EXCUSED), `source` (SELF/ADMIN/SYSTEM), `dispute_reason`, `marked_at`, `marked_by`

**Note**: Check if `events` table exists. Current code uses `meetings` table.

---

## Audit & Compliance

### `audit_logs`
Immutable audit log.
- `id`, `org_id`, `user_id`, `action`, `target_table`, `target_id`, `old_value` (JSONB), `new_value` (JSONB), `ip_address`, `created_at`

### `business_events`
Business events.
- `id`, `org_id`, `event_type`, `actor_id`, `payload` (JSONB), `created_at`

---

## Other Tables

### `member_consents`
Member consents.
- `id`, `user_id`, `org_id`, `consent_type`, `version_id`, `agreed_at`, `ip_address`

### `community_applications`
Community registration applications.
- `id`, `community_name`, `contact_person`, `email`, `description`, `status`, `created_at`, `updated_at`, `reviewed_by`, `reviewed_at`, `admin_notes`, `token`, `token_expires_at`, `registration_number`

### `org_review_requests`
Organization review requests.
- Various fields for review process

---

## Key Differences from v17.0 Documentation

1. **Meetings vs Events**:
   - Current: Uses `meetings` table
   - v17.0 doc: Suggests `events` table
   - **Decision**: Keep `meetings` table (current schema)

2. **Attendance**:
   - Current: `meeting_attendance` with `membership_id`, `present` boolean
   - v17.0 doc: `event_attendance` with `user_id`, `status` text
   - **Decision**: Keep `meeting_attendance` (current schema)

3. **Agenda Items**:
   - Current: `meeting_agenda_items` table exists
   - v17.0 doc: Not mentioned
   - **Decision**: Keep `meeting_agenda_items` (current schema)

4. **Protocols**:
   - Current: `meeting_protocols` table exists
   - v17.0 doc: Not mentioned
   - **Decision**: Keep `meeting_protocols` (current schema)

---

## Schema Status

**Current Deployed Schema**: Uses `meetings` table structure  
**Code Compatibility**: ✅ Code matches current schema  
**v17.0 Documentation**: Reference only (not deployed)

---

## Usage Notes

- All queries should use `meetings` table (not `events`)
- Attendance uses `meeting_attendance` with `membership_id`
- Agenda items use `meeting_agenda_items`
- Protocols use `meeting_protocols`
- No migration needed - current schema is correct

