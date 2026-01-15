# Ideas / Planning Module - RLS Access Matrix

**Module:** Ideas / Planning (PRE-GOVERNANCE)  
**Status:** FINAL  
**Purpose:** Complete RLS access control matrix for all tables and RPCs

---

## 1. Principles

### What RLS Is Enforcing

**Access Control:**
- Membership-based access (users can only access ideas from their organization)
- Role-based permissions (OWNER, ACTIVE, PENDING have different capabilities)
- Organization isolation (users cannot access ideas from other organizations)

**Write Protection:**
- Direct table writes are blocked (INSERT/UPDATE on ideas table)
- All writes must go through SECURITY DEFINER RPC functions
- RPC functions enforce additional validation and business rules

**Read Access:**
- All members (PENDING, ACTIVE, OWNER) can read ideas and comments from their organization
- Access is gated through membership verification
- Comments are accessible through idea's organization membership

### What RLS Explicitly Does NOT Enforce

**Procedural Power:**
- RLS does not enforce voting, approval, or decision-making semantics
- RLS does not enforce quorum requirements
- RLS does not enforce phase transition rules (handled by RPC)
- RLS does not enforce snapshot immutability (handled by triggers)

**Business Logic:**
- RLS does not validate metadata (handled by triggers)
- RLS does not validate phase values (handled by CHECK constraints)
- RLS does not enforce objection requirements (handled by RPC)
- RLS does not enforce promotion rules (handled by RPC)

**Governance:**
- RLS does not interact with Governance Layer tables
- RLS does not enforce resolution creation rules
- RLS does not enforce project activation rules
- RLS does not create any legal or procedural power

**Rationale:** RLS is a security mechanism, not a business logic mechanism. It enforces access control only, not procedural rules.

---

## 2. RLS Matrix — Tables

### Table: ideas

| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| **OWNER** (same org) | ✅ ALLOWED | ❌ DENIED | ❌ DENIED | ❌ DENIED |
| **ACTIVE** (same org) | ✅ ALLOWED | ❌ DENIED | ❌ DENIED | ❌ DENIED |
| **PENDING** (same org) | ✅ ALLOWED | ❌ DENIED | ❌ DENIED | ❌ DENIED |
| **OWNER** (different org) | ❌ DENIED | ❌ DENIED | ❌ DENIED | ❌ DENIED |
| **ACTIVE** (different org) | ❌ DENIED | ❌ DENIED | ❌ DENIED | ❌ DENIED |
| **PENDING** (different org) | ❌ DENIED | ❌ DENIED | ❌ DENIED | ❌ DENIED |
| **ANONYMOUS** | ❌ DENIED | ❌ DENIED | ❌ DENIED | ❌ DENIED |
| **SYSTEM** (SECURITY DEFINER) | ✅ ALLOWED | ✅ ALLOWED | ✅ ALLOWED | ❌ DENIED* |

**Justifications:**

**SELECT:**
- **OWNER/ACTIVE/PENDING (same org):** All members can read ideas from their organization for discussion purposes.
- **Different org / ANONYMOUS:** Access denied to maintain organization isolation.
- **SYSTEM:** RPC functions need to read ideas for validation and business logic.

**INSERT:**
- **All roles (direct):** INSERT is blocked for all roles. All idea creation must go through `rpc_create_idea` RPC function.
- **SYSTEM:** RPC functions can insert ideas after validation.

**UPDATE:**
- **All roles (direct):** UPDATE is blocked for all roles. All idea modifications must go through RPC functions (currently no UPDATE RPC exists, but structure allows for future RPCs).
- **SYSTEM:** RPC functions can update ideas after validation (future RPCs may be added).

**DELETE:**
- **All roles:** DELETE is blocked for all roles. No deletion allowed in MVP.
- **SYSTEM:** DELETE is blocked even for SYSTEM. No deletion functionality exists.

**Note:** *SYSTEM DELETE is blocked by design - no deletion in MVP. Future RPCs may be added for soft-delete or archival.

---

### Table: idea_comments

| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| **OWNER** (same org) | ✅ ALLOWED | ✅ ALLOWED | ❌ DENIED | ❌ DENIED |
| **ACTIVE** (same org) | ✅ ALLOWED | ✅ ALLOWED | ❌ DENIED | ❌ DENIED |
| **PENDING** (same org) | ✅ ALLOWED | ❌ DENIED | ❌ DENIED | ❌ DENIED |
| **OWNER** (different org) | ❌ DENIED | ❌ DENIED | ❌ DENIED | ❌ DENIED |
| **ACTIVE** (different org) | ❌ DENIED | ❌ DENIED | ❌ DENIED | ❌ DENIED |
| **PENDING** (different org) | ❌ DENIED | ❌ DENIED | ❌ DENIED | ❌ DENIED |
| **ANONYMOUS** | ❌ DENIED | ❌ DENIED | ❌ DENIED | ❌ DENIED |
| **SYSTEM** (SECURITY DEFINER) | ✅ ALLOWED | ✅ ALLOWED | ❌ DENIED | ❌ DENIED |

**Justifications:**

**SELECT:**
- **OWNER/ACTIVE/PENDING (same org):** All members can read comments on ideas from their organization for discussion purposes.
- **Different org / ANONYMOUS:** Access denied to maintain organization isolation.
- **SYSTEM:** RPC functions need to read comments for validation.

**INSERT:**
- **OWNER/ACTIVE (same org):** Active members can add comments to participate in discussion.
- **PENDING (same org):** Pending members can read but not write comments (read-only participation).
- **Different org / ANONYMOUS:** Access denied to maintain organization isolation.
- **SYSTEM:** RPC functions can insert comments after validation (though `rpc_add_comment` is preferred).

**UPDATE:**
- **All roles:** UPDATE is blocked for all roles. Comments are immutable once created.
- **SYSTEM:** UPDATE is blocked even for SYSTEM. Comments are immutable by design.

**DELETE:**
- **All roles:** DELETE is blocked for all roles. No deletion allowed in MVP.
- **SYSTEM:** DELETE is blocked even for SYSTEM. No deletion functionality exists.

---

## 3. RLS Matrix — RPCs

### RPC: rpc_create_idea

**Who Can Call:**
- ✅ OWNER (same org as p_org_id)
- ✅ ACTIVE (same org as p_org_id)
- ❌ PENDING (blocked - must be ACTIVE or OWNER)
- ❌ ANONYMOUS (blocked - must be authenticated)
- ❌ Different org (blocked - membership check fails)

**Preconditions:**
1. User must be authenticated (`auth.uid()` must not be NULL)
2. User must be ACTIVE or OWNER member of organization specified in `p_org_id`
3. Metadata must pass trigger validation (namespaced keys, no forbidden keywords)

**What RLS Bypasses:**
- ✅ Bypasses RLS INSERT policy on `ideas` table
- ✅ Bypasses RLS SELECT policy (for validation checks)
- ✅ Runs with SECURITY DEFINER privileges

**What Is Still Enforced Manually:**
- ✅ Membership verification (ACTIVE/OWNER only)
- ✅ Authentication check (user must be logged in)
- ✅ Metadata validation (via trigger - not bypassed)
- ✅ Phase default ('draft' - enforced in RPC)
- ✅ Created_by assignment (auth.uid() - enforced in RPC)

**Returns:**
- UUID of newly created idea

**Error Cases:**
- `User must be authenticated` - if auth.uid() is NULL
- `User must be ACTIVE or OWNER member of organization` - if membership check fails
- Metadata validation errors (from trigger) - if metadata violates rules

---

### RPC: rpc_add_comment

**Who Can Call:**
- ✅ OWNER (same org as idea's org_id)
- ✅ ACTIVE (same org as idea's org_id)
- ❌ PENDING (blocked - must be ACTIVE or OWNER)
- ❌ ANONYMOUS (blocked - must be authenticated)
- ❌ Different org (blocked - membership check fails)

**Preconditions:**
1. User must be authenticated (`auth.uid()` must not be NULL)
2. Idea must exist (p_idea_id must reference valid idea)
3. User must be ACTIVE or OWNER member of idea's organization
4. If `p_is_objection = true`, metadata must include non-empty `fact.objection.reason`
5. Metadata must pass trigger validation (namespaced keys, no forbidden keywords)

**What RLS Bypasses:**
- ✅ Bypasses RLS INSERT policy on `idea_comments` table
- ✅ Bypasses RLS SELECT policy (for validation checks on ideas table)
- ✅ Runs with SECURITY DEFINER privileges

**What Is Still Enforced Manually:**
- ✅ Membership verification (ACTIVE/OWNER only)
- ✅ Authentication check (user must be logged in)
- ✅ Idea existence check
- ✅ Objection reason validation (if is_objection = true)
- ✅ Metadata validation (via trigger - not bypassed)
- ✅ User_id assignment (auth.uid() - enforced in RPC)

**Returns:**
- UUID of newly created comment

**Error Cases:**
- `User must be authenticated` - if auth.uid() is NULL
- `Idea not found` - if p_idea_id does not exist
- `User must be ACTIVE or OWNER member of organization` - if membership check fails
- `Objections must include non-empty fact.objection.reason in metadata` - if objection without reason
- Metadata validation errors (from trigger) - if metadata violates rules

---

### RPC: rpc_promote_to_resolution_draft

**Who Can Call:**
- ✅ OWNER (same org as idea's org_id)
- ✅ ACTIVE (same org as idea's org_id)
- ❌ PENDING (blocked - must be ACTIVE or OWNER)
- ❌ ANONYMOUS (blocked - must be authenticated)
- ❌ Different org (blocked - membership check fails)

**Preconditions:**
1. User must be authenticated (`auth.uid()` must not be NULL)
2. Idea must exist (p_idea_id must reference valid idea)
3. Idea must NOT be a snapshot (`is_snapshot = false`)
4. Idea phase must be 'ready_for_vote'
5. User must be ACTIVE or OWNER member of idea's organization

**What RLS Bypasses:**
- ✅ Bypasses RLS INSERT policy on `ideas` table (for snapshot creation)
- ✅ Bypasses RLS INSERT policy on `resolutions` table (for DRAFT resolution creation)
- ✅ Bypasses RLS SELECT policy (for validation checks)
- ✅ Runs with SECURITY DEFINER privileges

**What Is Still Enforced Manually:**
- ✅ Membership verification (ACTIVE/OWNER only)
- ✅ Authentication check (user must be logged in)
- ✅ Idea existence check
- ✅ Snapshot rejection (idea must not be snapshot)
- ✅ Phase validation ('ready_for_vote' only)
- ✅ Snapshot creation (if not exists)
- ✅ Resolution creation (DRAFT status only)

**Returns:**
- UUID of newly created DRAFT resolution

**Error Cases:**
- `User must be authenticated` - if auth.uid() is NULL
- `Idea not found` - if p_idea_id does not exist
- `Cannot promote snapshot ideas - only original ideas can be promoted to resolutions` - if is_snapshot = true
- `Idea must be in ready_for_vote phase to promote to resolution` - if phase != 'ready_for_vote'
- `User must be ACTIVE or OWNER member of organization` - if membership check fails

**Note:** This RPC creates a DRAFT resolution only. No approval or adoption occurs. Resolution has no legal or procedural power until it goes through Governance process.

---

## 4. Snapshot Rules

### Snapshot Immutability

**Enforcement Level:** Database triggers (not RLS)

**Rules:**
- If `ideas.is_snapshot = true`:
  - ❌ UPDATE is blocked (trigger raises EXCEPTION)
  - ❌ DELETE is blocked (trigger raises EXCEPTION)
  - ✅ SELECT is allowed (read-only access)

**Trigger:** `ideas_snapshot_immutability_trigger`
- Runs BEFORE UPDATE OR DELETE
- Checks `OLD.is_snapshot = true`
- Raises EXCEPTION: "Cannot update/delete snapshot ideas - snapshots are immutable"

**RLS Interaction:**
- RLS does not enforce snapshot immutability
- RLS allows SELECT for snapshots (same as regular ideas)
- RLS blocks UPDATE/DELETE for all ideas (not just snapshots)
- Triggers provide additional defense-in-depth for snapshots

**Rationale:** Snapshots preserve historical state. They are technical artifacts created when promoting ideas to resolutions. Immutability ensures historical accuracy.

---

### Snapshot Creation

**Who Can Create Snapshots:**
- ✅ SYSTEM (via `rpc_promote_to_resolution_draft`)

**How Snapshots Are Created:**
- Automatically by `rpc_promote_to_resolution_draft` before creating DRAFT resolution
- Snapshot preserves idea state at promotion time
- Snapshot has `parent_id` pointing to original idea
- Snapshot has `is_snapshot = true`
- Snapshot has `snapshot_label` with timestamp

**RLS for Snapshot Creation:**
- RLS INSERT policy is bypassed (RPC uses SECURITY DEFINER)
- RPC validates permissions before creating snapshot
- Snapshot is created with same org_id as original idea

**Access to Snapshots:**
- Same RLS rules as regular ideas (SELECT allowed for same-org members)
- UPDATE/DELETE blocked by triggers (immutability)
- Snapshots are read-only for all users

---

## 5. Cross-Table Access Patterns

### Accessing Comments Through Ideas

**Pattern:**
- Comments are accessed through `idea_comments.idea_id`
- RLS policy joins through `ideas` table to verify org membership
- User must be member of idea's organization to access comments

**RLS Policy Logic:**
```sql
EXISTS (
    SELECT 1 FROM public.ideas i
    JOIN public.memberships m ON m.org_id = i.org_id
    WHERE i.id = idea_comments.idea_id
        AND m.user_id = auth.uid()
        AND m.member_status IN ('PENDING', 'ACTIVE', 'OWNER')
)
```

**Result:**
- Comments inherit organization membership from parent idea
- Users cannot access comments on ideas from other organizations
- Organization isolation is maintained

---

## 6. RLS Policy Summary

### ideas Table Policies

| Policy Name | Operation | Condition |
|------------|-----------|-----------|
| `ideas_select_policy` | SELECT | User is PENDING/ACTIVE/OWNER member of idea's org |
| (No policy) | INSERT | Implicit DENY - must use RPC |
| (No policy) | UPDATE | Implicit DENY - must use RPC |
| (No policy) | DELETE | Implicit DENY - no deletion in MVP |

### idea_comments Table Policies

| Policy Name | Operation | Condition |
|------------|-----------|-----------|
| `idea_comments_select_policy` | SELECT | User is PENDING/ACTIVE/OWNER member of idea's org |
| `idea_comments_insert_policy` | INSERT | User is ACTIVE/OWNER member of idea's org |
| (No policy) | UPDATE | Implicit DENY - comments are immutable |
| (No policy) | DELETE | Implicit DENY - no deletion in MVP |

---

## 7. Security Considerations

### SECURITY DEFINER Context

**RPC Functions:**
- All RPC functions use `SECURITY DEFINER`
- RPCs run with privileges of function owner (typically database superuser)
- RPCs bypass RLS policies on target tables
- RPCs still enforce business logic and validation

**Security Implications:**
- RPCs must be carefully validated (membership checks, input validation)
- RPCs must not expose sensitive data
- RPCs must maintain organization isolation
- RPCs must enforce business rules (phase, snapshot, metadata)

**Defense in Depth:**
- RLS provides first layer (blocks direct access)
- RPCs provide second layer (controlled access with validation)
- Triggers provide third layer (data integrity and immutability)

---

### Organization Isolation

**Enforcement:**
- All RLS policies verify organization membership
- Users can only access ideas from their own organization
- Cross-organization access is explicitly denied
- RPCs verify organization membership before operations

**Verification Points:**
- SELECT policies check `ideas.org_id` matches user's membership
- INSERT policies check `p_org_id` matches user's membership
- RPCs verify organization membership in function logic
- Comments inherit organization from parent idea

---

## 8. Access Matrix Summary

### Quick Reference

**ideas table:**
- **Read:** PENDING/ACTIVE/OWNER (same org) ✅
- **Write:** All roles ❌ (must use RPC)

**idea_comments table:**
- **Read:** PENDING/ACTIVE/OWNER (same org) ✅
- **Write:** ACTIVE/OWNER (same org) ✅
- **Modify:** All roles ❌ (immutable)

**RPC Functions:**
- **rpc_create_idea:** ACTIVE/OWNER (same org) ✅
- **rpc_add_comment:** ACTIVE/OWNER (same org) ✅
- **rpc_promote_to_resolution_draft:** ACTIVE/OWNER (same org) ✅

**Snapshots:**
- **Read:** PENDING/ACTIVE/OWNER (same org) ✅
- **Write:** All roles ❌ (immutable via triggers)

---

## 9. Notes

### RLS vs. Business Logic

**RLS Enforces:**
- Who can access what (membership-based)
- Organization isolation
- Role-based permissions

**RLS Does NOT Enforce:**
- Phase transitions (handled by RPC)
- Metadata validation (handled by triggers)
- Snapshot immutability (handled by triggers)
- Business rules (handled by RPC)

### Future Considerations

**Potential RPC Additions:**
- `rpc_update_idea` (if UPDATE functionality is needed)
- `rpc_change_phase` (if phase changes need validation)
- `rpc_archive_idea` (if soft-delete is needed)

**RLS Changes:**
- No RLS changes should be needed for new RPCs
- New RPCs will follow same pattern (SECURITY DEFINER, membership checks)

---

**Last Updated:** [Date]  
**Module Version:** PRE-GOVERNANCE v1.0  
**Document Status:** FINAL
