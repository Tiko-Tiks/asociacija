# PROJECTS MODULE GOVERNANCE AUDIT CHECKLIST v19.0

**Status**: Governance-aligned & Locked  
**Schema**: v19.0 (CODE FREEZE)  
**Module Type**: Operational Registry  
**Audit Scope**: Projects Module Compliance with Governance Layer v19.0

---

## AUDIT PRINCIPLES

This checklist ensures Projects Module compliance with:
- Governance Layer v19.0 schema freeze
- Metadata Registry v1.0 namespace rules
- Constitution First principle
- Physical Primacy principle
- External Guardian principle

---

## 1. SCHEMA COMPLIANCE (CRITICAL)

### 1.1 NO PROJECTS TABLE
- [ ] **VERIFY**: No `projects` table exists in database schema
- [ ] **VERIFY**: No `project_id` columns exist in any table
- [ ] **VERIFY**: No foreign keys referencing `projects` table
- [ ] **VERIFY**: No `CREATE TABLE projects` statements
- [ ] **VERIFY**: No `ALTER TABLE` adding project-related columns

**Violation Detection**:
```sql
-- Check for projects table
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'projects'
);

-- Check for project_id columns
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE column_name LIKE '%project_id%' 
AND table_schema = 'public';
```

**Expected Result**: All checks must return empty/false.

---

### 1.2 METADATA-ONLY MODEL
- [ ] **VERIFY**: All project data stored in `textresolutions.metadata`
- [ ] **VERIFY**: No structural columns for project data (e.g., `project_code`, `project_phase`)
- [ ] **VERIFY**: Project data accessible only via JSONB metadata queries

**Verification Query**:
```sql
-- Verify metadata structure for projects
SELECT 
  id, 
  status,
  metadata->'project' as project_data,
  metadata->'indicator' as indicator_data
FROM textresolutions 
WHERE status = 'APPROVED' 
AND metadata->'project' IS NOT NULL
LIMIT 10;
```

---

## 2. RESOLUTION DEPENDENCY (NON-NEGOTIABLE)

### 2.1 PROJECT EXISTS ONLY WITH APPROVED RESOLUTION
- [ ] **VERIFY**: No project metadata in non-APPROVED resolutions
- [ ] **VERIFY**: Project queries filter by `status = 'APPROVED'`
- [ ] **VERIFY**: UI does not display projects for non-APPROVED resolutions
- [ ] **VERIFY**: No orphaned project data (projects without resolutions)

**Verification Query**:
```sql
-- Check for project metadata in non-APPROVED resolutions
SELECT id, status, metadata->'project' as project_data
FROM textresolutions
WHERE status != 'APPROVED'
AND metadata->'project' IS NOT NULL;
```

**Expected Result**: Empty result set (no projects in non-APPROVED resolutions).

---

### 2.2 NO INDEPENDENT PROJECT ENTITY
- [ ] **VERIFY**: No project creation functions (only resolution approval creates projects)
- [ ] **VERIFY**: No project deletion functions (projects removed only when resolution status changes)
- [ ] **VERIFY**: No project lookup by project_id (only by resolution_id)
- [ ] **VERIFY**: All project queries join with textresolutions table

---

## 3. METADATA NAMESPACE COMPLIANCE

### 3.1 ALLOWED NAMESPACES
- [ ] **VERIFY**: Only `project.*` keys used for project semantics
- [ ] **VERIFY**: Only `indicator.*` keys used for project status/calculations
- [ ] **VERIFY**: No `fact.*` keys used for project semantics
- [ ] **VERIFY**: No unnamespaced keys in project context

**Verification Query**:
```sql
-- Find all metadata keys for APPROVED resolutions with projects
SELECT 
  id,
  jsonb_object_keys(metadata) as metadata_key
FROM textresolutions
WHERE status = 'APPROVED'
AND metadata->'project' IS NOT NULL;

-- Check for forbidden fact.* keys in project context
SELECT id, metadata->'fact' as fact_data
FROM textresolutions
WHERE status = 'APPROVED'
AND metadata->'project' IS NOT NULL
AND metadata->'fact' IS NOT NULL;
```

**Expected Result**: Only `project.*` and `indicator.*` keys present. No `fact.*` keys in project context.

---

### 3.2 PROJECT METADATA STRUCTURE
- [ ] **VERIFY**: Minimal project structure exists: `project.code`, `project.phase`
- [ ] **VERIFY**: `project.phase` values are valid: `planned`, `active`, `paused`, `completed`, `cancelled`
- [ ] **VERIFY**: `project.legacy_id` used only for migration traceability (if present)
- [ ] **VERIFY**: No operational logic depends on `legacy_id`

**Validation Query**:
```sql
-- Validate project.phase values
SELECT 
  id,
  metadata->'project'->>'phase' as phase
FROM textresolutions
WHERE status = 'APPROVED'
AND metadata->'project' IS NOT NULL
AND metadata->'project'->>'phase' NOT IN ('planned', 'active', 'paused', 'completed', 'cancelled');
```

**Expected Result**: Empty result set (all phases valid).

---

### 3.3 INDICATOR METADATA STRUCTURE
- [ ] **VERIFY**: All numeric project values use `indicator.*` namespace
- [ ] **VERIFY**: No project calculations stored as `fact.*`
- [ ] **VERIFY**: Common indicators: `indicator.progress`, `indicator.budget_planned`, `indicator.budget_spent`

---

## 4. PROJECT ≠ DECISION COMPLIANCE

### 4.1 NO LEGAL AUTHORITY
- [ ] **VERIFY**: Project phase changes do not modify resolution status
- [ ] **VERIFY**: Project phase changes do not create new resolutions
- [ ] **VERIFY**: Project data changes do not affect resolution immutability
- [ ] **VERIFY**: UI clearly distinguishes project state from resolution status

---

### 4.2 OPERATIONAL VS CONSTITUTIONAL
- [ ] **VERIFY**: Phase changes are operational (no governance procedure required)
- [ ] **VERIFY**: Phase changes do not require live meeting
- [ ] **VERIFY**: Phase changes do not affect resolution approval status
- [ ] **VERIFY**: Resolution remains immutable after APPROVED

---

## 5. UI LIMITS COMPLIANCE

### 5.1 PROJECT CREATION RESTRICTIONS
- [ ] **VERIFY**: UI has no "Create Project" button/action
- [ ] **VERIFY**: UI has no "Approve Project" action
- [ ] **VERIFY**: Projects appear only after resolution approval
- [ ] **VERIFY**: UI does not allow direct metadata editing

**Code Verification**:
- [ ] Check for `createProject` functions in server actions
- [ ] Check for project creation forms in UI components
- [ ] Check for project approval workflows

---

### 5.2 METADATA MODIFICATION RESTRICTIONS
- [ ] **VERIFY**: All metadata changes go through RPC functions
- [ ] **VERIFY**: UI does not directly update `textresolutions.metadata`
- [ ] **VERIFY**: RPC functions require authentication
- [ ] **VERIFY**: RPC functions validate namespace compliance

**Code Verification**:
- [ ] Check server actions for direct metadata updates
- [ ] Check RPC functions for project metadata updates
- [ ] Verify RPC functions validate `project.*` and `indicator.*` namespaces

---

### 5.3 READ-ONLY PROJECT DISPLAY
- [ ] **VERIFY**: UI can display projects (filtered by APPROVED resolutions)
- [ ] **VERIFY**: UI can filter projects by phase
- [ ] **VERIFY**: UI can display project indicators
- [ ] **VERIFY**: UI shows resolution context for each project

---

## 6. AI LIMITS COMPLIANCE

### 6.1 AI RESTRICTIONS
- [ ] **VERIFY**: No AI functions create projects
- [ ] **VERIFY**: No AI functions change `project.phase`
- [ ] **VERIFY**: AI analysis uses only `ai.*` namespace
- [ ] **VERIFY**: AI outputs labeled as interpretation-only

**Code Verification**:
- [ ] Check for AI functions that modify project metadata
- [ ] Verify AI outputs use `ai.*` prefix
- [ ] Verify UI disclaimers for AI interpretations

---

### 6.2 AI INTERPRETATIONS
- [ ] **VERIFY**: AI can analyze indicators (`indicator.*`)
- [ ] **VERIFY**: AI can provide recommendations (stored in `ai.*`)
- [ ] **VERIFY**: AI suggestions are non-binding
- [ ] **VERIFY**: UI shows "AI interpretation – no legal authority" disclaimer

---

## 7. AUDIT TRAIL COMPLIANCE

### 7.1 METADATA CHANGE AUDITING
- [ ] **VERIFY**: All `project.*` changes logged in `audit_logs`
- [ ] **VERIFY**: All `indicator.*` changes logged in `audit_logs`
- [ ] **VERIFY**: Audit logs include user_id, timestamp, old_value, new_value
- [ ] **VERIFY**: Audit logs link to resolution_id

**Verification Query**:
```sql
-- Check audit logs for project metadata changes
SELECT 
  id,
  user_id,
  action,
  old_value,
  new_value,
  created_at
FROM audit_logs
WHERE action LIKE '%PROJECT%' 
OR new_value::text LIKE '%"project"%'
OR old_value::text LIKE '%"project"%'
ORDER BY created_at DESC
LIMIT 50;
```

---

### 7.2 AUDIT CHAIN INTEGRITY
- [ ] **VERIFY**: Audit chain: Live Meeting → APPROVED Resolution → Project Metadata → Indicators
- [ ] **VERIFY**: Each step is auditable
- [ ] **VERIFY**: Project metadata changes do not break resolution audit chain
- [ ] **VERIFY**: Resolution immutability preserved

---

## 8. LEGACY COMPLIANCE

### 8.1 LEGACY TABLE HANDLING
- [ ] **VERIFY**: Legacy `projects` table exists (if present) and is read-only
- [ ] **VERIFY**: Legacy `ideas` table exists (if present) and is read-only
- [ ] **VERIFY**: No INSERT/UPDATE/DELETE operations on legacy tables
- [ ] **VERIFY**: Legacy tables not used in current logic

**Verification Query**:
```sql
-- Check for legacy tables (if they exist)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('projects', 'ideas');

-- Check for operations on legacy tables (via RLS/policies)
SELECT * FROM pg_policies 
WHERE tablename IN ('projects', 'ideas');
```

---

### 8.2 LEGACY_ID HANDLING
- [ ] **VERIFY**: `project.legacy_id` used only for migration traceability
- [ ] **VERIFY**: `legacy_id` has no operational meaning
- [ ] **VERIFY**: No queries filter by `legacy_id`
- [ ] **VERIFY**: No foreign key relationships use `legacy_id`

---

## 9. RPC FUNCTION COMPLIANCE

### 9.1 PROJECT METADATA RPC FUNCTIONS
- [ ] **VERIFY**: RPC functions use `SECURITY DEFINER`
- [ ] **VERIFY**: RPC functions validate user permissions
- [ ] **VERIFY**: RPC functions validate namespace compliance
- [ ] **VERIFY**: RPC functions log to audit_logs

**Code Verification**:
- [ ] List all RPC functions that modify project metadata
- [ ] Verify function signatures
- [ ] Verify security and validation logic

---

### 9.2 RPC FUNCTION NAMING
- [ ] **VERIFY**: RPC function names are descriptive
- [ ] **VERIFY**: RPC functions follow naming conventions
- [ ] **VERIFY**: RPC functions documented

---

## 10. DATA INTEGRITY

### 10.1 PROJECT DATA CONSISTENCY
- [ ] **VERIFY**: All projects have valid resolution_id (via APPROVED status)
- [ ] **VERIFY**: No duplicate project codes (if code uniqueness required)
- [ ] **VERIFY**: Project phase transitions are valid
- [ ] **VERIFY**: Indicator values are within valid ranges (0-1 for progress, etc.)

**Validation Query**:
```sql
-- Check for projects with invalid phase values
SELECT 
  r.id as resolution_id,
  r.status,
  r.metadata->'project'->>'phase' as phase,
  r.metadata->'project'->>'code' as code
FROM textresolutions r
WHERE r.status = 'APPROVED'
AND r.metadata->'project' IS NOT NULL
AND (
  r.metadata->'project'->>'phase' NOT IN ('planned', 'active', 'paused', 'completed', 'cancelled')
  OR r.metadata->'project'->>'code' IS NULL
);
```

---

### 10.2 RESOLUTION-PROJECT RELATIONSHIP
- [ ] **VERIFY**: All APPROVED resolutions can have projects (but not required)
- [ ] **VERIFY**: Resolution deletion/status change affects project visibility
- [ ] **VERIFY**: Project data is deleted/suppressed when resolution status changes from APPROVED

---

## 11. PERFORMANCE & QUERIES

### 11.1 METADATA QUERY PERFORMANCE
- [ ] **VERIFY**: JSONB indexes exist for project queries (if needed)
- [ ] **VERIFY**: Project queries use efficient JSONB operators
- [ ] **VERIFY**: No N+1 query problems in project listings
- [ ] **VERIFY**: Project filters perform well

**Index Verification**:
```sql
-- Check for JSONB indexes on metadata
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'textresolutions'
AND indexdef LIKE '%metadata%';
```

---

## 12. DOCUMENTATION COMPLIANCE

### 12.1 DOCUMENTATION ACCURACY
- [ ] **VERIFY**: Code matches `docs/PROJECTS_MODULE_v19.md`
- [ ] **VERIFY**: Code matches `.cursor/rules/projects/RULE.md`
- [ ] **VERIFY**: API documentation reflects metadata-only model
- [ ] **VERIFY**: UI documentation reflects read-only restrictions

---

## AUDIT EXECUTION

### Pre-Audit Checklist
- [ ] Review schema freeze compliance
- [ ] Review metadata registry rules
- [ ] Review governance principles
- [ ] Prepare verification queries
- [ ] Review codebase for project-related code

### Audit Execution
1. Run schema compliance checks (Section 1)
2. Verify resolution dependency (Section 2)
3. Check metadata namespace compliance (Section 3)
4. Verify project ≠ decision separation (Section 4)
5. Check UI limits (Section 5)
6. Verify AI limits (Section 6)
7. Check audit trail (Section 7)
8. Verify legacy handling (Section 8)
9. Review RPC functions (Section 9)
10. Validate data integrity (Section 10)
11. Check performance (Section 11)
12. Verify documentation (Section 12)

### Post-Audit Actions
- [ ] Document all violations
- [ ] Create violation report
- [ ] Propose fixes (if schema freeze allows)
- [ ] Update documentation (if needed)
- [ ] Mark compliant items

---

## VIOLATION SEVERITY LEVELS

### CRITICAL (Schema Freeze Violation)
- Projects table exists
- project_id columns exist
- Foreign keys to projects table
- Direct metadata schema changes

### HIGH (Governance Violation)
- Projects without APPROVED resolutions
- fact.* namespace used for projects
- UI creates projects directly
- AI modifies project.phase

### MEDIUM (Best Practice Violation)
- Missing audit logs
- Invalid phase values
- Performance issues
- Documentation mismatches

### LOW (Recommendation)
- Code style issues
- Missing comments
- Optimization opportunities

---

## AUDIT REPORT TEMPLATE

```markdown
# Projects Module Governance Audit Report

**Date**: [DATE]
**Auditor**: [NAME]
**Version**: v19.0
**Status**: [COMPLIANT / NON-COMPLIANT / PARTIAL]

## Summary
[Brief summary of findings]

## Critical Violations
[List critical violations]

## High Severity Violations
[List high severity violations]

## Medium Severity Issues
[List medium severity issues]

## Recommendations
[List recommendations]

## Compliance Score
[Percentage and breakdown]
```

---

**END OF CHECKLIST**
