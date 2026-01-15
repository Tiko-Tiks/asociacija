# Testing Plan - Branduolys v18.8

**Status**: Code Freeze – Production  
**Priority**: Critical functionality first

---

## Testing Phases

### Phase 1: Compliance & Security ✅ (COMPLETED)
- ✅ Service_role violations fixed
- ✅ Profiles privacy compliant
- ✅ Media_items removed
- ✅ Schema documented

### Phase 2: Core Functionality (START HERE)
**Priority**: HIGH

#### 2.1 Meetings (CRITICAL)
- [ ] Create meeting (DRAFT)
- [ ] Add agenda items
- [ ] Publish meeting
- [ ] Mark attendance (in-person)
- [ ] Register remote attendance
- [ ] Complete meeting
- [ ] Generate protocol

#### 2.2 Voting (CRITICAL)
- [ ] Cast vote (in-person)
- [ ] Cast vote (remote)
- [ ] Live vote totals
- [ ] Vote validation (quorum)
- [ ] Close vote
- [ ] Auto-abstain for remote voters

#### 2.3 Resolutions (CRITICAL)
- [ ] Create resolution
- [ ] Link resolution to agenda item
- [ ] Approve resolution
- [ ] Reject resolution
- [ ] Immutability (cannot edit APPROVED)

#### 2.4 Members (CRITICAL)
- [ ] Register member (public)
- [ ] Invite member (OWNER)
- [ ] View members list
- [ ] Change member status
- [ ] Assign position

### Phase 3: Governance
**Priority**: MEDIUM

- [ ] Governance questions
- [ ] Compliance checks
- [ ] Schema versioning
- [ ] Ruleset management

### Phase 4: Integration
**Priority**: MEDIUM

- [ ] Meeting → Resolution → Vote flow
- [ ] Attendance → Quorum → Voting
- [ ] Protocol generation
- [ ] Audit logging

### Phase 5: Edge Cases
**Priority**: LOW

- [ ] RLS violations (expected errors)
- [ ] Empty results (not errors)
- [ ] Concurrent operations
- [ ] Large datasets

---

## Test Scenarios

### Scenario 1: Complete Meeting Flow
1. Create meeting (DRAFT)
2. Add 3 agenda items
3. Publish meeting
4. Members register attendance
5. Mark quorum
6. Vote on items
7. Complete meeting
8. Generate protocol

### Scenario 2: Remote Voting
1. Create meeting
2. Publish meeting
3. Member registers remote attendance
4. Member votes remotely
5. Auto-abstain for non-voters
6. Complete meeting

### Scenario 3: Resolution Workflow
1. Create resolution (DRAFT)
2. Link to agenda item
3. Approve resolution
4. Verify immutability
5. Check audit log

---

## Test Checklist

### Pre-Testing
- [x] Code compliance verified
- [x] Schema documented
- [x] Documentation updated
- [ ] Test data prepared
- [ ] Test users created

### Critical Paths
- [ ] Meeting creation → Publishing → Voting → Completion
- [ ] Member registration → Approval → Active status
- [ ] Resolution creation → Approval → Immutability
- [ ] Attendance → Quorum → Voting

### Error Handling
- [ ] RLS blocks surface correctly
- [ ] Audit failures logged (not blocking)
- [ ] Empty results handled gracefully
- [ ] Invalid inputs rejected

---

## Starting Point

**RECOMMENDED**: Start with **Phase 2.1 - Meetings**

**Why**:
- Meetings are core functionality
- Other features depend on meetings
- Most complex workflow
- Highest risk if broken

**First Test**: Create a meeting and verify it saves correctly.

---

## Test Environment

- Use development database
- Create test organization
- Create test users (OWNER, MEMBER)
- Use real data structure (no mocks)

---

**Status**: Ready to start Phase 2.1

