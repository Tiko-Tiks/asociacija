# Projects Legacy Freeze Notice — v19.0

**Effective:** v19.0  
**Status:** CODE FREEZE — Read-only  
**Governance:** Schema v19.0 compliant

---

## Overview

The legacy Projects module (v17–v18) has been **frozen as read-only** effective v19.0. All CRUD operations on legacy project tables have been disabled. Projects are now derived exclusively from APPROVED resolutions metadata.

---

## What Was Frozen

### 1. Database Tables

The following legacy tables are now **read-only**:

- `public.projects` — Legacy project entities (v17–v18)
- `public.project_contributions` — Legacy project contributions
- `public.project_funding_totals` — Legacy funding totals (view)

**Permissions revoked:**
- `INSERT` on all legacy project tables
- `UPDATE` on all legacy project tables
- `DELETE` on all legacy project tables

**Implementation:** See `sql/legacy_freeze_projects_v19.sql`

### 2. Server Actions (CRUD Functions)

The following legacy server actions are **deprecated and disabled**:

- `createProject()` — Returns `LEGACY_PROJECTS_DISABLED` error
- `updateProjectName()` — Disabled
- `deleteProject()` — Disabled
- `archiveProject()` — Disabled
- `restoreProject()` — Disabled

**Location:** `src/app/actions/projects.ts`

All deprecated functions:
- Marked with `@deprecated v19.0` JSDoc
- Log `console.warn` with deprecation message
- Return explicit error results
- Functions are **NOT deleted** (preserved for reference)

### 3. UI Components

The following legacy UI components are **marked as legacy** and **unreachable from navigation**:

- `ProjectsListClient` — Legacy projects list (replaced by `ProjectsRegistryV19`)
- `ProjectDetail` — Legacy project detail view
- `ProjectDetailsClient` — Legacy project details client
- `CreateProjectModal` — Legacy create project modal
- `CreateProjectClient` — Legacy create project form
- `PledgeMoneyForm` — Legacy pledge form
- `PledgeInKindForm` — Legacy in-kind pledge form
- `PledgeWorkForm` — Legacy work pledge form

**Location:** `src/components/projects/`

All legacy components:
- Have `LEGACY (v17–v18): This component is read-only` notice
- Are **NOT deleted** (preserved for reference)
- Are **unreachable from main navigation** (Create Project button removed from `quick-actions.tsx`)

---

## Why It Was Frozen

### Governance Alignment (v19.0)

Projects v19.0 follow the **Constitution First** principle:

1. **Projects are derived from APPROVED resolutions** — They are not independent entities
2. **No project creation without resolution approval** — Projects exist only as execution state of approved decisions
3. **Schema CODE FREEZE (v19.0)** — No new tables, no schema migrations
4. **Metadata-only extension** — Projects exist as `resolutions.metadata.project.*` namespace

### Technical Rationale

- **Single source of truth** — Projects originate from governance decisions (resolutions)
- **Audit trail** — Projects are linked to their originating resolution (immutable)
- **Procedural legitimacy** — Projects cannot be created outside the governance process
- **Schema stability** — No new tables required (uses existing `resolutions` table)

---

## From Which Version

### Legacy: v17–v18

- **Projects table** — Independent `projects` table with CRUD operations
- **Direct project creation** — `createProject()` server action
- **Project management UI** — Create/edit/delete/archive workflows
- **Contribution system** — `project_contributions` table for pledges

### Current: v19.0

- **Projects Registry** — Read-only view derived from APPROVED resolutions
- **Metadata-based** — Projects stored in `resolutions.metadata.project.*`
- **Governance-aligned** — Projects only exist after resolution approval
- **Read-only UI** — Projects Registry v19.0 (no create/edit/delete)

---

## What Replaces It

### Projects Registry v19.0

**Location:** `src/components/projects/projects-registry-v19.tsx`  
**Server Action:** `getProjectsRegistryV19ForOrg()` (in `src/app/actions/projects_v19_ui.ts`)

### Key Features

1. **Read-only** — No create/edit/delete operations
2. **Resolution-derived** — Only shows projects from APPROVED resolutions
3. **Metadata-based** — Uses `resolutions.metadata.project.*` namespace
4. **Client-side filtering** — Phase filtering and sorting (in `ProjectsRegistryClientV19`)
5. **Governance-compliant** — Follows v19.0 CODE FREEZE requirements

### Data Structure

Projects v19.0 are represented as:

```typescript
interface ProjectV19 {
  resolution_id: string;  // Link to originating resolution
  title: string;          // From resolution.title
  metadata: {
    project: {
      phase: ProjectPhase;  // 'planned' | 'active' | 'paused' | 'completed' | 'cancelled'
      tags?: string[];
      code?: string;
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

### Navigation

- **Projects page:** `/dashboard/[slug]/projects` — Uses `ProjectsRegistryV19`
- **No create project route** — Create Project button removed from navigation
- **No edit/delete UI** — Projects Registry is read-only

---

## Migration Notes

### For Developers

1. **Do NOT use legacy CRUD functions** — They return errors
2. **Use Projects Registry v19.0** — For displaying projects
3. **Create projects via resolutions** — Projects are derived from APPROVED resolutions
4. **Legacy components preserved** — Not deleted, but marked as legacy and unreachable

### For Users

- **Projects are read-only** — Cannot create/edit/delete projects directly
- **Projects come from resolutions** — Must approve a resolution to create a project
- **Legacy projects remain visible** — Existing legacy projects are still readable (if any exist)

---

## Related Documentation

- [`PROJECTS_LEGACY_VS_V19_COMPARISON.md`](./PROJECTS_LEGACY_VS_V19_COMPARISON.md) — Detailed comparison
- [`PROJECTS_REGISTRY_READONLY_v19.md`](../PROJECTS_REGISTRY_READONLY_v19.md) — Projects Registry v19.0 specification
- `sql/legacy_freeze_projects_v19.sql` — Database freeze implementation
- `src/app/actions/projects.ts` — Deprecated CRUD functions

---

## Status

✅ **Database permissions revoked**  
✅ **CRUD functions deprecated and disabled**  
✅ **UI components marked as legacy**  
✅ **Navigation updated to use Projects Registry v19.0**  
✅ **Legacy components unreachable from main navigation**  
✅ **Projects Registry v19.0 implemented**

**Last Updated:** v19.0
