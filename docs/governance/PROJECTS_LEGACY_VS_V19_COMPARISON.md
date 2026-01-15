# PROJECTS MODULE: LEGACY vs v19.0 COMPARISON REPORT

**Date**: 2026-01-10  
**Status**: Analysis Only (No Fixes Applied)  
**Schema**: v19.0 (CODE FREEZE)  
**Purpose**: Identify compatibility, incompatibility, and deprecation requirements

---

## EXECUTIVE SUMMARY

This report compares the existing (legacy) Projects implementation with the canonical Projects Module v19.0 description. The legacy implementation follows a traditional CRUD model with a dedicated `projects` table, while v19.0 requires a metadata-only operational registry model tied to APPROVED resolutions.

**Key Finding**: The legacy implementation is fundamentally incompatible with v19.0 architecture. Most elements must be deprecated or frozen as read-only.

---

## 1. COMPATIBLE ELEMENTS

### 1.1 Concept Alignment
- ✅ **Project lifecycle concept**: Both systems track project status/phases
- ✅ **Project display**: Both allow viewing/filtering projects
- ✅ **Budget tracking**: Both track financial aspects (v19.0 via `indicator.budget_*`)
- ✅ **Progress tracking**: Both track project progress (v19.0 via `indicator.progress`)

### 1.2 Status/Phase Mapping (Partial)
- ✅ **COMPLETED → completed**: Direct mapping
- ✅ **CANCELLED → cancelled**: Direct mapping
- ⚠️ **IN_PROGRESS → active**: Partial mapping (semantic similarity)
- ⚠️ **PLANNING → planned**: Partial mapping (semantic similarity)
- ❌ **FUNDING**: No direct v19.0 equivalent (may map to `active` or custom phase)
- ❌ **ARCHIVED**: No direct v19.0 equivalent (may map to `cancelled` or `paused`)

### 1.3 Data Fields (Conceptual)
- ✅ **Title**: Can be stored in `project.code` or resolution title
- ✅ **Description**: Can be stored in resolution content or `project.description` (metadata)
- ✅ **Budget**: Can be stored in `indicator.budget_planned`
- ✅ **Created timestamp**: Can use resolution `created_at` or `project.created_at` (metadata)
- ✅ **Completed timestamp**: Can use `project.completed_at` (metadata)

---

## 2. INCOMPATIBLE ELEMENTS

### 2.1 Database Schema (CRITICAL VIOLATION)

#### 2.1.1 Projects Table
**Legacy**:
```sql
CREATE TABLE public.projects (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  idea_id uuid NULL,
  title text NOT NULL,
  description text NULL,
  status text NOT NULL,
  budget_eur numeric(12,2) NOT NULL DEFAULT 0,
  created_by uuid NULL,
  created_at timestamptz NOT NULL,
  funding_opened_at timestamptz NOT NULL,
  completed_at timestamptz NULL
);
```

**v19.0 Requirement**: ❌ NO projects table

**Violation Level**: CRITICAL (Schema Freeze Violation)

**Status**: Must be frozen as READ-ONLY

---

#### 2.1.2 Foreign Keys
**Legacy**:
- `projects.idea_id` → `ideas.id` (FK)
- `project_contributions.project_id` → `projects.id` (FK)
- `project_funding_totals.project_id` → `projects.id` (FK)

**v19.0 Requirement**: ❌ NO project_id, NO FK to projects

**Violation Level**: CRITICAL (Schema Freeze Violation)

**Status**: Must be frozen as READ-ONLY

---

#### 2.1.3 Related Tables
**Legacy**:
- `project_contributions` (with `project_id` FK)
- `project_funding_totals` (view/table with `project_id`)
- `project_members` (if exists, with `project_id`)

**v19.0 Requirement**: ❌ NO tables with project_id

**Violation Level**: CRITICAL (Schema Freeze Violation)

**Status**: Must be frozen as READ-ONLY

---

### 2.2 CRUD Operations (CRITICAL VIOLATION)

#### 2.2.1 Create Operations
**Legacy**:
- `createProject(membershipId, title, description?, budgetEur?)` in `src/app/actions/projects.ts`
- Creates independent project entity
- No resolution dependency

**v19.0 Requirement**: ❌ NO project creation without APPROVED resolution

**Violation Level**: CRITICAL (Governance Violation)

**Status**: Must be DEPRECATED

**Files**:
- `src/app/actions/projects.ts` (lines 92-152)
- `src/components/projects/create-project-modal.tsx`
- `src/components/projects/create-project-client.tsx`
- `src/components/projects/projects-list-client.tsx` (lines 56-100)

---

#### 2.2.2 Update Operations
**Legacy**:
- `updateProjectName(projectId, membershipId, title)`
- `archiveProject(projectId, membershipId)`
- `restoreProject(projectId, membershipId)`
- Direct updates to `projects` table

**v19.0 Requirement**: ❌ NO direct project updates (only metadata via RPC)

**Violation Level**: HIGH (Governance Violation)

**Status**: Must be DEPRECATED

**Files**:
- `src/app/actions/projects.ts` (lines 193-342)

---

#### 2.2.3 Delete Operations
**Legacy**:
- `deleteProject(projectId, membershipId)`
- Hard delete from `projects` table

**v19.0 Requirement**: ❌ NO project deletion (projects removed only when resolution status changes)

**Violation Level**: HIGH (Governance Violation)

**Status**: Must be DEPRECATED

**Files**:
- `src/app/actions/projects.ts` (lines 230-261)

---

### 2.3 UI Components (HIGH VIOLATION)

#### 2.3.1 Create Project UI
**Legacy**:
- `CreateProjectModal` component
- `CreateProjectClient` component
- "Create Project" button in `ProjectsListClient`

**v19.0 Requirement**: ❌ UI cannot create projects

**Violation Level**: HIGH (Governance Violation)

**Status**: Must be DEPRECATED

**Files**:
- `src/components/projects/create-project-modal.tsx`
- `src/components/projects/create-project-client.tsx`
- `src/components/projects/projects-list-client.tsx` (create functionality)
- `src/app/ui/components/CreateProjectForm.tsx`

---

#### 2.3.2 Project Management UI
**Legacy**:
- Project edit forms
- Project delete buttons
- Project archive/restore actions

**v19.0 Requirement**: ❌ UI cannot modify project metadata directly (only via RPC)

**Violation Level**: HIGH (Governance Violation)

**Status**: Must be DEPRECATED or refactored to use RPC

---

### 2.4 Data Model (CRITICAL VIOLATION)

#### 2.4.1 Independent Project Entity
**Legacy**:
- Projects exist independently
- Projects can be created without resolutions
- Projects linked to ideas (not resolutions)

**v19.0 Requirement**: ❌ Projects exist ONLY with APPROVED resolutions

**Violation Level**: CRITICAL (Non-negotiable principle violation)

**Status**: Must be DEPRECATED

---

#### 2.4.2 Status Values
**Legacy**:
- `'PLANNING' | 'FUNDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED'`

**v19.0 Requirement**:
- `'planned' | 'active' | 'paused' | 'completed' | 'cancelled'`

**Violation Level**: MEDIUM (Can be mapped, but different semantics)

**Status**: Must be DEPRECATED (use v19.0 phases)

---

#### 2.4.3 Metadata Structure
**Legacy**:
- No metadata structure (all in table columns)
- No namespace rules

**v19.0 Requirement**:
- All data in `textresolutions.metadata`
- Only `project.*` and `indicator.*` namespaces

**Violation Level**: CRITICAL (Architecture violation)

**Status**: Must be DEPRECATED

---

### 2.5 Server Actions (HIGH VIOLATION)

**Legacy Functions** (all in `src/app/actions/projects.ts`):
- `createProject()` - ❌ Violates v19.0
- `updateProjectName()` - ❌ Violates v19.0
- `deleteProject()` - ❌ Violates v19.0
- `archiveProject()` - ❌ Violates v19.0
- `restoreProject()` - ❌ Violates v19.0
- `listProjects()` - ⚠️ Can be adapted (read-only)
- `getProject()` - ⚠️ Can be adapted (read-only)
- `getProjectFundingTotals()` - ⚠️ Can be adapted (read-only)
- `listProjectContributions()` - ⚠️ Can be adapted (read-only)
- `pledgeMoney()` - ⚠️ May need refactoring (if contributions are allowed)
- `pledgeInKind()` - ⚠️ May need refactoring
- `pledgeWork()` - ⚠️ May need refactoring
- `updateContributionStatus()` - ⚠️ May need refactoring

**Status**: Most must be DEPRECATED, read-only functions can be adapted

---

### 2.6 Type Definitions (MEDIUM VIOLATION)

**Legacy** (`src/app/actions/projects.ts`):
```typescript
export interface Project {
  id: string
  org_id: string
  idea_id: string | null
  title: string
  description: string | null
  status: ProjectStatus
  budget_eur: number
  created_by: string | null
  created_at: string
  funding_opened_at: string
  completed_at: string | null
}
```

**v19.0 Requirement**: Project data in metadata, no independent Project type

**Violation Level**: MEDIUM (Type system can be adapted)

**Status**: Must be DEPRECATED (create new types for metadata-based projects)

---

## 3. ELEMENTS THAT MUST BE FROZEN AS READ-ONLY

### 3.1 Database Tables (READ-ONLY)

#### 3.1.1 `projects` Table
**Action**: Freeze as READ-ONLY
**Rationale**: Schema freeze prevents DROP, but table must not be modified
**Implementation**:
- Revoke INSERT, UPDATE, DELETE permissions
- Keep SELECT for migration/read-only access
- Add RLS policies to prevent writes
- Document as legacy/read-only

**SQL**:
```sql
-- Revoke write permissions (if RLS not sufficient)
REVOKE INSERT, UPDATE, DELETE ON public.projects FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.projects FROM anon;

-- Add comment
COMMENT ON TABLE public.projects IS 'LEGACY: Read-only. Projects v19.0+ use textresolutions.metadata';
```

---

#### 3.1.2 `project_contributions` Table
**Action**: Freeze as READ-ONLY
**Rationale**: Depends on `projects` table (legacy)
**Implementation**: Same as `projects` table

---

#### 3.1.3 `project_funding_totals` (View/Table)
**Action**: Freeze as READ-ONLY
**Rationale**: Depends on `projects` table (legacy)
**Implementation**: Same as `projects` table

---

### 3.2 Foreign Key Constraints
**Action**: Keep but document as legacy
**Rationale**: Cannot drop due to schema freeze, but should not be used
**Implementation**:
- Add comments to constraints
- Document as legacy-only

**SQL**:
```sql
COMMENT ON CONSTRAINT projects_idea_id_fkey ON public.projects 
IS 'LEGACY: Read-only. v19.0+ projects do not use idea_id';
```

---

### 3.3 Indexes
**Action**: Keep (read-only access may need them)
**Rationale**: Indexes don't violate schema freeze, useful for read-only queries
**Status**: COMPATIBLE (can remain)

---

## 4. ELEMENTS THAT MUST BE DEPRECATED

### 4.1 Server Actions (DEPRECATE)

#### 4.1.1 Create/Update/Delete Functions
**Files**:
- `src/app/actions/projects.ts` (lines 92-342)

**Actions**:
1. Mark functions as `@deprecated`
2. Add deprecation warnings
3. Return error for new calls
4. Document migration path

**Example**:
```typescript
/**
 * @deprecated Projects v19.0+ are metadata-only. Use textresolutions.metadata instead.
 * This function will be removed in a future version.
 */
export async function createProject(...) {
  console.warn('DEPRECATED: createProject() violates v19.0. Projects must come from APPROVED resolutions.');
  return { success: false, error: 'DEPRECATED_FUNCTION' };
}
```

---

### 4.2 UI Components (DEPRECATE)

#### 4.2.1 Create Project Components
**Files**:
- `src/components/projects/create-project-modal.tsx`
- `src/components/projects/create-project-client.tsx`
- `src/app/ui/components/CreateProjectForm.tsx`

**Actions**:
1. Mark components as deprecated
2. Hide from UI (or show deprecation message)
3. Remove from navigation
4. Document migration path

---

#### 4.2.2 Project Management UI
**Files**:
- Edit project forms
- Delete project buttons
- Archive/restore actions

**Actions**:
1. Mark as deprecated
2. Hide or disable functionality
3. Show deprecation message

---

### 4.3 Type Definitions (DEPRECATE)

**Files**:
- `src/app/actions/projects.ts` (Project interface, ProjectStatus type)

**Actions**:
1. Mark types as deprecated
2. Create new types for metadata-based projects
3. Document migration path

---

### 4.4 Routes/Pages (DEPRECATE)

**Files** (if exist):
- `/dashboard/[slug]/projects/new` (create project page)
- `/dashboard/[slug]/projects/[id]/edit` (edit project page)

**Actions**:
1. Mark routes as deprecated
2. Redirect to deprecation message
3. Remove from navigation

---

## 5. MIGRATION PATH ANALYSIS

### 5.1 Data Migration
**Challenge**: Legacy projects exist independently, v19.0 requires APPROVED resolution

**Options**:
1. **Create resolutions for existing projects**: Create APPROVED resolutions retroactively
2. **Mark legacy projects as read-only**: Keep for historical reference only
3. **Hybrid approach**: Migrate active projects, freeze completed/cancelled

**Recommendation**: Option 3 (hybrid) - migrate active projects, freeze others

---

### 5.2 Code Migration
**Challenge**: CRUD operations must be replaced with metadata operations

**Steps**:
1. Create RPC functions for metadata updates
2. Create new server actions that use RPC
3. Update UI to use new actions
4. Deprecate old functions
5. Remove old functions after migration period

---

## 6. COMPATIBILITY MATRIX

| Legacy Element | v19.0 Equivalent | Status | Action Required |
|---------------|------------------|--------|-----------------|
| `projects` table | `textresolutions.metadata` | ❌ INCOMPATIBLE | Freeze as READ-ONLY |
| `project_id` FK | None (metadata only) | ❌ INCOMPATIBLE | Freeze as READ-ONLY |
| `createProject()` | N/A (no creation) | ❌ INCOMPATIBLE | DEPRECATE |
| `updateProjectName()` | RPC for metadata | ❌ INCOMPATIBLE | DEPRECATE |
| `deleteProject()` | N/A (no deletion) | ❌ INCOMPATIBLE | DEPRECATE |
| `listProjects()` | Query resolutions with metadata | ⚠️ ADAPTABLE | Refactor |
| `getProject()` | Get resolution with metadata | ⚠️ ADAPTABLE | Refactor |
| Project status | `project.phase` (metadata) | ⚠️ ADAPTABLE | Map values |
| Budget tracking | `indicator.budget_*` | ⚠️ ADAPTABLE | Migrate to metadata |
| Progress tracking | `indicator.progress` | ⚠️ ADAPTABLE | Migrate to metadata |
| Project display | Project display (read-only) | ✅ COMPATIBLE | Keep (read-only) |
| Project filtering | Project filtering (read-only) | ✅ COMPATIBLE | Keep (read-only) |

---

## 7. RISK ASSESSMENT

### 7.1 Critical Risks
1. **Data Loss**: Legacy projects may be orphaned if not migrated
2. **Breaking Changes**: Deprecating functions will break existing code
3. **User Confusion**: UI changes may confuse users
4. **Migration Complexity**: Migrating existing projects to resolutions is non-trivial

### 7.2 Mitigation Strategies
1. **Gradual Deprecation**: Deprecate functions with warnings before removal
2. **Migration Tools**: Create tools to migrate legacy projects to resolutions
3. **Documentation**: Clear migration guides and deprecation notices
4. **Read-Only Access**: Keep legacy tables readable for historical reference

---

## 8. RECOMMENDATIONS

### 8.1 Immediate Actions
1. ✅ **Freeze `projects` table as READ-ONLY** (RLS policies, revoke write permissions)
2. ✅ **Mark CRUD functions as deprecated** (add deprecation warnings)
3. ✅ **Hide create project UI** (remove from navigation, show deprecation message)
4. ✅ **Document migration path** (create migration guide)

### 8.2 Short-Term Actions (1-2 months)
1. ✅ **Create RPC functions** for metadata-based project operations
2. ✅ **Create new server actions** using RPC (read-only initially)
3. ✅ **Migrate active projects** to resolutions (if applicable)
4. ✅ **Update UI** to use new metadata-based approach

### 8.3 Long-Term Actions (3-6 months)
1. ✅ **Remove deprecated functions** (after migration period)
2. ✅ **Remove deprecated UI components** (after migration period)
3. ✅ **Archive legacy code** (move to archive directory)
4. ✅ **Update documentation** (remove legacy references)

---

## 9. FILES INVENTORY

### 9.1 Files Requiring Deprecation
- `src/app/actions/projects.ts` (CRUD functions)
- `src/components/projects/create-project-modal.tsx`
- `src/components/projects/create-project-client.tsx`
- `src/app/ui/components/CreateProjectForm.tsx`
- `src/components/projects/projects-list-client.tsx` (create functionality)

### 9.2 Files Requiring Refactoring
- `src/components/projects/project-detail.tsx` (read-only display)
- `src/components/projects/projects-list-client.tsx` (read-only listing)
- Project-related hooks (if they modify projects)

### 9.3 Files That Can Remain (Read-Only)
- Display components (if read-only)
- Type definitions (if adapted for metadata)

---

## 10. CONCLUSION

The legacy Projects implementation is **fundamentally incompatible** with v19.0 architecture. The core incompatibilities are:

1. **Independent project entities** (v19.0 requires resolution dependency)
2. **CRUD operations** (v19.0 requires metadata-only)
3. **Dedicated projects table** (v19.0 requires metadata-only)

**Required Actions**:
- **FREEZE**: `projects` table and related tables as READ-ONLY
- **DEPRECATE**: All CRUD operations and create project UI
- **REFACTOR**: Read-only operations to use metadata-based approach
- **MIGRATE**: Active projects to resolutions (if applicable)

**Compatibility**: ~10% compatible (display/filtering concepts), ~90% incompatible (architecture)

---

**END OF REPORT**
