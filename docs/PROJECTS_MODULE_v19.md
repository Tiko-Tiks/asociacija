# Projects Module v19.0

**Version:** v19.0  
**Status:** CODE FREEZE — Canonical Specification  
**Governance:** Schema v19.0 compliant

---

## DEFINITION

**PROJECT := APPROVED RESOLUTION + metadata.project**

A Project in v19.0 is **not** an independent entity. It is the operational execution state of an APPROVED resolution that contains project metadata.

---

## CORE PRINCIPLES

### 1. No Projects Table

- ❌ **NO** `projects` table
- ❌ **NO** `project_id` foreign keys
- ❌ **NO** independent project entities
- ✅ Projects exist **only** as metadata in `resolutions.metadata.project.*`

### 2. Resolution-Derived

- Projects originate from **APPROVED resolutions only**
- A resolution must have `status = 'APPROVED'`
- A resolution must contain `metadata.project.phase`
- Projects cannot exist without their originating resolution

### 3. Metadata Namespaces

**Allowed namespaces ONLY:**

- `metadata.project.*` — Project operational data
  - `phase` (required): `'planned' | 'active' | 'paused' | 'completed' | 'cancelled'`
  - `tags?` (optional): `string[]`
  - `code?` (optional): `string`
  - `legacy_id?` (optional): `string` (for migration traceability)

- `metadata.indicator.*` — Project indicators (tracked values)
  - `progress?` (optional): `number` (0..1)
  - `budget_planned?` (optional): `number`
  - `budget_spent?` (optional): `number`

**Forbidden:**
- ❌ Any non-namespaced keys in metadata
- ❌ `metadata.title`, `metadata.status`, `metadata.created_at` (use resolution columns)
- ❌ Project CRUD operations (create/edit/delete)

### 4. Read-Only Registry

- Projects Registry v19.0 is **read-only**
- Projects cannot be created directly
- Projects cannot be edited directly
- Projects cannot be deleted directly
- All changes must go through **resolution approval process**

---

## DATA STRUCTURE

### Resolution-Based Project

```typescript
interface ProjectV19 {
  resolution_id: string;  // Link to originating resolution (IMMUTABLE)
  title: string;          // From resolution.title
  metadata: {
    project: {
      phase: ProjectPhase;  // REQUIRED: 'planned' | 'active' | 'paused' | 'completed' | 'cancelled'
      tags?: string[];
      code?: string;
      legacy_id?: string;
    };
    indicator?: {
      progress?: number;      // 0..1
      budget_planned?: number;
      budget_spent?: number;
    };
  };
  created_at: string;     // From resolution.created_at
}
```

### Metadata Structure

```json
{
  "project": {
    "phase": "active",
    "tags": ["funding", "community"],
    "code": "PRJ-2024-001"
  },
  "indicator": {
    "progress": 0.65,
    "budget_planned": 10000,
    "budget_spent": 6500
  }
}
```

---

## OPERATIONS

### Permitted Operations

✅ **Read operations:**
- List projects from APPROVED resolutions
- Filter by phase, tags, indicators
- Display project information

✅ **Indicator updates (BOARD/CHAIR only):**
- Update `indicator.progress`
- Update `indicator.budget_planned`
- Update `indicator.budget_spent`
- **All changes must be audited** (action: `PROJECT_INDICATOR_UPDATE`)

### Forbidden Operations

❌ **Project CRUD:**
- Create project (use resolution approval instead)
- Edit project phase (only via resolution metadata update)
- Delete project (projects are immutable once resolution is APPROVED)
- Archive project (use phase: 'cancelled' instead)

❌ **Direct metadata changes:**
- Cannot modify `project.phase` directly (must go through resolution)
- Cannot modify `resolution.status` (APPROVED resolutions are immutable)

---

## LEGACY STATUS

### Legacy Tables: READ-ONLY

The following legacy tables are **frozen as read-only**:

- `public.projects` — Legacy project entities (v17–v18)
- `public.project_contributions` — Legacy project contributions
- `public.project_funding_totals` — Legacy funding totals (view)

**Permissions revoked:**
- `INSERT` revoked
- `UPDATE` revoked
- `DELETE` revoked

**Implementation:** See `sql/legacy_freeze_projects_v19.sql`

### Legacy CRUD: DEPRECATED

All legacy CRUD functions are **deprecated and disabled**:

- `createProject()` — Returns `LEGACY_PROJECTS_DISABLED` error
- `updateProjectName()` — Disabled
- `deleteProject()` — Disabled
- `archiveProject()` — Disabled
- `restoreProject()` — Disabled

**Location:** `src/app/actions/projects.ts`

**Status:** Functions are NOT deleted (preserved for reference), but return errors when called.

---

## GOVERNANCE RULES

### 1. Schema Freeze (v19.0)

- ❌ **NO new tables**
- ❌ **NO new columns**
- ❌ **NO schema migrations**
- ✅ **Metadata-only extension** (via JSONB)

### 2. Resolution Immutability

- APPROVED resolutions are **immutable**
- Resolution metadata (including project metadata) cannot be changed after approval
- **Exception:** Indicator updates (`indicator.*`) are allowed for BOARD/CHAIR users

### 3. Audit Requirements

- **ALL** `metadata.project.*` changes must be audited
- **ALL** `metadata.indicator.*` changes must be audited
- Audit action: `PROJECT_INDICATOR_UPDATE`
- Audit logs: `INSERT INTO audit_logs` with full old/new metadata

**Implementation:** See `sql/modules/projects/add_project_indicators_audit.sql`

### 4. Role-Based Access

- **Read:** All authenticated members
- **Update indicators:** BOARD position OR CHAIR role only
- **Create projects:** N/A (via resolution approval only)

---

## IMPLEMENTATION

### Server Actions

**Canonical (v19.0):**
- `listProjectsRegistry(orgId)` — Lists projects from APPROVED resolutions
- `updateProjectProgress(resolutionId, progress)` — Updates progress indicator (BOARD/CHAIR)
- `updateProjectBudget(resolutionId, planned?, spent?)` — Updates budget indicators (BOARD/CHAIR)

**Location:** `src/app/actions/projects-registry.ts`, `src/app/actions/project-indicators.ts`

### UI Components

**Canonical (v19.0):**
- `ProjectsRegistryList` — Read-only projects list (client component)
- `ProjectsRegistryV19` — Server component wrapper

**Location:** `src/components/projects/ProjectsRegistryList.tsx`

### Legacy Components (DEPRECATED)

- `ProjectsListClient` — Legacy projects list (marked as LEGACY)
- `ProjectDetail` — Legacy project detail (marked as LEGACY)
- `CreateProjectModal` — Legacy create project (marked as LEGACY)
- All legacy components are **unreachable from navigation**

---

## MIGRATION PATH

### For Existing Projects

1. **Legacy projects** (in `projects` table) remain readable but cannot be modified
2. **New projects** must be created via APPROVED resolutions with project metadata
3. **Migration tools** can create APPROVED resolutions retroactively for legacy projects

### For Developers

1. ❌ **Do NOT use** legacy CRUD functions (`createProject`, etc.)
2. ✅ **Use** `listProjectsRegistry` for reading projects
3. ✅ **Use** `updateProjectProgress` / `updateProjectBudget` for indicator updates
4. ✅ **Create projects** via resolution approval workflow

---

## RELATED DOCUMENTATION

- [`PROJECTS_REGISTRY_READONLY_v19.md`](./PROJECTS_REGISTRY_READONLY_v19.md) — Projects Registry specification
- [`governance/PROJECTS_LEGACY_FREEZE_NOTICE_v19.md`](./governance/PROJECTS_LEGACY_FREEZE_NOTICE_v19.md) — Legacy freeze notice
- [`governance/PROJECTS_LEGACY_VS_V19_COMPARISON.md`](./governance/PROJECTS_LEGACY_VS_V19_COMPARISON.md) — Legacy vs v19.0 comparison

---

## SUMMARY

**PROJECT := APPROVED RESOLUTION + metadata.project**

- Projects are **not** independent entities
- Projects are **derived** from APPROVED resolutions
- Projects are **read-only** (except indicators: BOARD/CHAIR only)
- Legacy tables are **frozen** (read-only)
- Legacy CRUD is **deprecated** (disabled)

**v19.0 is the canonical truth.**

---

## GOVERNANCE LOCK

**This document is canonical.**

Any contradictory implementation violates Governance Layer v19.0.

Projects Registry v19.0 is the only valid representation of projects.

Any attempt to:
- Create independent project entities
- Use legacy projects table for new projects
- Bypass resolution approval for project creation
- Modify project.phase without resolution workflow

→ **Violates Governance Layer v19.0**

---

**Last Updated:** v19.0  
**Schema Status:** CODE FREEZE  
**Governance:** v19.0 compliant  
**Canonical:** YES
