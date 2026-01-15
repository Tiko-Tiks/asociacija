# Testing Start Guide

## 🎯 Starting Point: Meetings Flow

### Why Start Here?
- Meetings are the core of the system
- Other features depend on meetings
- Most complex workflow
- Highest business value

---

## Test 1: Create Meeting (DRAFT)

### Steps:
1. Navigate to organization dashboard
2. Click "Create Meeting" or "Naujas susirinkimas"
3. Fill in:
   - Title
   - Scheduled date/time
   - Location (optional)
4. Click "Create" or "Sukurti"

### Expected Result:
- ✅ Meeting created with status DRAFT
- ✅ Redirected to meeting edit page
- ✅ Can see meeting in meetings list
- ✅ Can add agenda items

### Server Action:
- `createMeetingGA()` in `src/app/actions/meetings.ts`
- Uses RPC: `create_meeting_ga`

### What to Check:
- [ ] Meeting appears in database
- [ ] Status is DRAFT
- [ ] Created_by is current user
- [ ] Org_id is correct
- [ ] No errors in console
- [ ] Audit log entry (if applicable)

---

## Test 2: Add Agenda Items

### Steps:
1. Open meeting (DRAFT status)
2. Click "Add Agenda Item" or "Pridėti klausimą"
3. Fill in:
   - Item number
   - Title
   - Summary (optional)
   - Details (optional)
4. Save

### Expected Result:
- ✅ Agenda item created
- ✅ Appears in agenda list
- ✅ Can edit/delete (if DRAFT)

### Server Action:
- `addAgendaItem()` in `src/app/actions/meetings.ts`
- Uses RPC: `add_agenda_item`

### What to Check:
- [ ] Agenda item in database
- [ ] Item_no is correct
- [ ] Meeting_id is correct
- [ ] Can add multiple items
- [ ] Items ordered correctly

---

## Test 3: Publish Meeting

### Steps:
1. Open meeting (DRAFT)
2. Ensure all mandatory agenda items exist:
   - Chairman selection
   - Secretary selection
   - Agenda confirmation
3. Click "Publish" or "Publikuoti"

### Expected Result:
- ✅ Meeting status changes to PUBLISHED
- ✅ Published_at timestamp set
- ✅ Resolutions created for all agenda items
- ✅ Votes created for all resolutions
- ✅ Members can see meeting
- ✅ Members can vote

### Server Action:
- `publishMeeting()` in `src/app/actions/meetings.ts`

### What to Check:
- [ ] Status is PUBLISHED
- [ ] Published_at is set
- [ ] Resolutions created (one per agenda item)
- [ ] Votes created (one per resolution)
- [ ] Members can access meeting
- [ ] Audit log entry

---

## Test 4: Mark Attendance

### Steps:
1. As OWNER/BOARD, open published meeting
2. View attendance list
3. Mark members as present/absent
4. Save attendance

### Expected Result:
- ✅ Attendance records saved
- ✅ Quorum calculated automatically
- ✅ Can see attendance count
- ✅ Remote attendance tracked separately

### Server Action:
- `markAttendance()` in `src/app/actions/meeting-attendance.ts`

### What to Check:
- [ ] Attendance in database
- [ ] Present count correct
- [ ] Quorum_met calculated
- [ ] Remote voters tracked
- [ ] Can update attendance

---

## Test 5: Vote on Items

### Steps:
1. As MEMBER, open published meeting
2. View agenda items
3. Cast vote on each item:
   - FOR (Už)
   - AGAINST (Prieš)
   - ABSTAIN (Susilaikė)
4. Confirm vote

### Expected Result:
- ✅ Vote recorded
- ✅ Vote totals updated
- ✅ Cannot vote twice
- ✅ Can see own vote

### Server Action:
- `castVote()` in `src/app/actions/voting.ts`
- Uses RPC: `cast_vote`

### What to Check:
- [ ] Vote in database
- [ ] Choice is correct
- [ ] Channel is correct (IN_PERSON/REMOTE)
- [ ] Vote totals updated
- [ ] Cannot vote again
- [ ] Audit log entry

---

## Test 6: Complete Meeting

### Steps:
1. As OWNER/BOARD, open published meeting
2. All agenda items have votes
3. Click "Complete Meeting" or "Užbaigti susirinkimą"

### Expected Result:
- ✅ Meeting status changes to COMPLETED
- ✅ All votes closed
- ✅ Auto-abstain for remote voters who didn't vote
- ✅ Cannot vote after completion
- ✅ Protocol can be generated

### Server Action:
- `completeMeeting()` in `src/app/actions/meetings.ts`

### What to Check:
- [ ] Status is COMPLETED
- [ ] All votes status is CLOSED
- [ ] Auto-abstain votes created
- [ ] Cannot vote after completion
- [ ] Audit log entry

---

## Test 7: Generate Protocol

### Steps:
1. Open completed meeting
2. Click "Generate Protocol" or "Generuoti protokolą"
3. Review protocol
4. Finalize protocol

### Expected Result:
- ✅ Protocol generated
- ✅ Contains all meeting data
- ✅ Can export as PDF
- ✅ Protocol is immutable after finalization

### Server Action:
- `generateProtocol()` in `src/app/actions/protocols.ts`

### What to Check:
- [ ] Protocol in database
- [ ] Contains snapshot
- [ ] Snapshot_hash is correct
- [ ] Can export PDF
- [ ] Immutable after FINAL

---

## Common Issues to Watch For

### RLS Violations
- Error code: `42501`
- Should surface as `auth_violation` error
- Not silent failures

### Audit Failures
- Should log to console.error
- Should not block operation
- Should be visible in logs

### Empty Results
- NULL/empty can be normal (no access)
- Don't treat as error
- Check RLS policies

### Schema Mismatches
- Use `meetings` table (not `events`)
- Use `meeting_attendance` (not `event_attendance`)
- Check column names match schema

---

## Quick Test Checklist

### Basic Flow (5 minutes)
- [ ] Create meeting
- [ ] Add 1 agenda item
- [ ] Publish meeting
- [ ] Mark 1 attendance
- [ ] Cast 1 vote
- [ ] Complete meeting

### Full Flow (15 minutes)
- [ ] Create meeting with 3 agenda items
- [ ] Publish meeting
- [ ] Mark all attendances
- [ ] Cast votes on all items
- [ ] Complete meeting
- [ ] Generate protocol

---

## Next Steps After Testing

1. **If all tests pass**: Proceed to Phase 3 (Governance)
2. **If issues found**: Document and fix
3. **If critical issues**: Stop and fix before continuing

---

**Ready to start?** Begin with Test 1: Create Meeting

