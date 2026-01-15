PROJECTS REGISTRY — READ-ONLY (v19.0)

Status: Canonical Specification
Governance Layer: v19.0 (CODE FREEZE)
Module Type: Operational Registry (Read-only)
Legal Authority: NONE

1. PURPOSE

Projects Registry v19.0 is a read-only operational registry.

It exists solely to observe and display execution states of decisions that
have already been made through the Governance Layer.

The registry:

DOES NOT create projects

DOES NOT modify projects

DOES NOT grant legal authority

DOES NOT replace governance procedures

2. SOURCE OF TRUTH

The registry derives data exclusively from the resolutions domain.

Authoritative conditions:

resolutions.status = 'APPROVED'

resolutions.metadata.project exists

There is no independent project entity.

3. DEFINITION OF A PROJECT (v19.0)

A “project” in v19.0 is not an object and not a decision.

A project exists if and only if:

PROJECT := APPROVED RESOLUTION
           + metadata.project exists


If either condition is not met, the item MUST NOT appear in the registry.

4. DATA MODEL (READ-ONLY PROJECTION)

Each registry entry is a projection, not a stored record.

Canonical fields
Field	Source
resolution_id	resolutions.id
title	resolutions.title
created_at	resolutions.created_at
project.phase	resolutions.metadata.project.phase
project.code	resolutions.metadata.project.code (optional)
project.tags	resolutions.metadata.project.tags (optional)
indicator.progress	resolutions.metadata.indicator.progress (optional)
indicator.budget_*	resolutions.metadata.indicator.* (optional)

No additional fields are allowed.

5. FORBIDDEN OPERATIONS

The registry MUST NOT perform or expose:

Project creation

Project deletion

Project approval or rejection

Resolution status changes

Direct metadata writes

References to legacy projects tables

CRUD-style project lifecycle management

Any attempt to introduce these operations is a Governance v19.0 violation.

6. ALLOWED OPERATIONS

The registry MAY:

List projects

Filter projects (phase, tags, progress)

Sort projects (created_at, progress)

Display indicators

Link to the underlying resolution

All operations are read-only.

7. UI CONSTRAINTS

User Interface rules:

UI MUST NOT show “Create Project” actions

UI MUST NOT show “Approve Project” actions

UI MUST NOT allow editing of resolution data

UI MAY display project phase and indicators

UI MAY trigger indicator updates ONLY via RPC

UI MUST clearly state that projects have no legal authority

8. AI CONSTRAINTS

AI interaction rules:

AI MUST NOT:

Create projects

Change project.phase

Declare project success or failure as fact

AI MAY:

Analyze indicators

Provide recommendations using ai.* namespace

Generate summaries with disclaimer

Mandatory disclaimer:

“AI interpretation – no legal authority.”

9. LEGACY INTERACTION

Legacy tables (projects, ideas, related entities):

Are outside Projects Registry v19.0

Must be treated as READ-ONLY

Must NOT be queried by registry logic

May be used only for historical reference or migration

9.1. LEGACY STATUS

Legacy Tables: READ-ONLY

The following legacy tables are frozen as read-only:

- public.projects (Legacy project entities, v17–v18)
- public.project_contributions (Legacy project contributions)
- public.project_funding_totals (Legacy funding totals view)

Permissions: INSERT, UPDATE, DELETE revoked
Implementation: sql/legacy_freeze_projects_v19.sql

Legacy CRUD: DEPRECATED

All legacy CRUD functions are deprecated and disabled:

- createProject() — Returns LEGACY_PROJECTS_DISABLED error
- updateProjectName() — Disabled
- deleteProject() — Disabled
- archiveProject() — Disabled

Location: src/app/actions/projects.ts
Status: Functions NOT deleted (preserved for reference), but return errors when called.

10. AUDIT TRAIL

Projects Registry relies on existing audit mechanisms:

Resolution approval → audit_logs

Metadata updates (project.*, indicator.*) → audit_logs

No registry-specific audit entries are created.

Audit chain:

Physical Meeting
→ APPROVED Resolution
→ Project Metadata
→ Indicators
→ Reports

11. ACCEPTANCE CRITERIA

Projects Registry v19.0 is compliant if:

All entries originate from APPROVED resolutions

No project exists without a resolution

Registry is strictly read-only

No legacy tables are used

Metadata namespace rules are respected

UI and AI constraints are enforced

12. NON-NEGOTIABLE PRINCIPLE

Projects Registry is an observational layer.
It does not create reality.
It records execution of decisions already made.

---

DEFINITION (v19.0):

PROJECT := APPROVED RESOLUTION + metadata.project

---

GOVERNANCE LOCK

This document is canonical.

Any contradictory implementation violates Governance Layer v19.0.

Projects Registry v19.0 is the only valid representation of projects.

Any attempt to:
- Create independent project entities
- Use legacy projects table for new projects
- Bypass resolution approval for project creation
- Modify project.phase without resolution workflow

→ Violates Governance Layer v19.0

---

SUMMARY

v19.0 is the canonical truth.

- Legacy tables: READ-ONLY (frozen)
- Legacy CRUD: DEPRECATED (disabled)
- Projects Registry v19.0: READ-ONLY (derived from APPROVED resolutions)

---

Last Updated: v19.0
Schema Status: CODE FREEZE
Governance: v19.0 compliant
Canonical: YES