# Migration Blockers - v17.0 Schema

## ⚠️ CRITICAL: Schema Incompleteness

### Missing Fields in `events` Table

**Current Code Needs**:
- `status` (DRAFT/PUBLISHED/COMPLETED/CANCELLED) - **CRITICAL**
- `published_at` - When meeting was published
- `notice_days` - Notice period requirement
- `quorum_met` - Quorum status (boolean)
- `agenda_version` - Agenda versioning

**v17.0 Has**:
- `start_time`, `end_time`, `event_type`, `location`, `is_public`

**Impact**: Cannot track meeting lifecycle without `status` field.

---

### Missing Tables

1. **`meeting_agenda_items`** - **CRITICAL**
   - Used in: `meetings.ts`, `governance.ts`, `published-meetings.ts`
   - Purpose: Agenda items for meetings
   - **v17.0**: Not provided

2. **`meeting_protocols`** - **CRITICAL**
   - Used in: `protocols.ts`, `governance.ts`
   - Purpose: Meeting protocols/records
   - **v17.0**: Not provided

3. **`meeting_agenda_attachments`** - **MEDIUM**
   - Used in: `meetings.ts`, `published-meetings.ts`
   - Purpose: Attachments for agenda items
   - **v17.0**: Not provided

4. **`meeting_remote_voters`** - **MEDIUM**
   - Used in: `meeting-attendance.ts`
   - Purpose: Track remote voters
   - **v17.0**: Not provided

---

### Schema Column Mismatches

1. **`meeting_attendance.membership_id`** → **`event_attendance.user_id`**
   - Current: Uses `membership_id`
   - v17.0: Uses `user_id`
   - **Impact**: Need to get `user_id` from `membership_id`

2. **`meeting_attendance.present`** → **`event_attendance.status`**
   - Current: `present` boolean
   - v17.0: `status` text ('PRESENT'/'ABSENT'/'EXCUSED')
   - **Impact**: Need to convert boolean to text

3. **`meeting_attendance.attendance_type`** → **`event_attendance.source`**
   - Current: `attendance_type` (IN_PERSON/REMOTE)
   - v17.0: `source` (SELF/ADMIN/SYSTEM)
   - **Impact**: Different semantics

---

## Migration Options

### Option 1: Extend v17.0 Schema (NOT ALLOWED)
- ❌ Rule 4: NO SQL DDL - Cannot add fields/tables
- ❌ Cannot extend schema

### Option 2: Simplify Code
- Remove agenda items functionality
- Remove protocols functionality
- Simplify attendance tracking
- **Impact**: Major functionality loss

### Option 3: Keep Current Schema
- Continue using `meetings` table
- Update documentation
- **Impact**: Code doesn't match v17.0 documentation

---

## Recommendation

**STOP MIGRATION** - v17.0 schema is incomplete for current functionality.

**Questions to Answer**:
1. Is v17.0 schema actually deployed?
2. Are missing fields/tables intentional?
3. Should we:
   - A) Keep current schema (meetings)
   - B) Simplify code to match v17.0
   - C) Wait for complete v17.0 schema

---

**Status**: ⚠️ **BLOCKED** - Cannot migrate without schema clarification

