# IDEAS → VOTING → PROJECTS → SUPPORT Module

## Overview

This module implements a complete workflow for community ideas: voting → project creation → support/contributions. It includes automatic evaluation based on participation thresholds and public visibility.

## Database Schema

### Tables

1. **`public.ideas`** - Community ideas
   - Status: DRAFT, OPEN, PASSED, FAILED, NOT_COMPLETED, ARCHIVED
   - `public_visible` flag for public page display

2. **`public.idea_attachments`** - File attachments for ideas
   - Stored in `idea-documents` bucket

3. **`public.idea_votes`** - Voting sessions (one per idea)
   - `duration_days` frozen at open-time
   - `closes_at` calculated from `opens_at + duration_days`

4. **`public.idea_ballots`** - Individual votes
   - Choice: FOR/AGAINST
   - Unique constraint: (idea_vote_id, membership_id)

5. **`public.projects`** - Projects created from passed ideas
   - Status: PLANNING, FUNDING, IN_PROGRESS, COMPLETED, CANCELLED
   - `budget_eur` for funding goal

6. **`public.project_contributions`** - Member contributions
   - Kind: MONEY, IN_KIND, WORK
   - Status: PLEDGED, RECEIVED, CANCELLED
   - JSONB fields for in_kind_items and work_offer

### Views

- **`public.idea_vote_tally`** - Aggregated vote counts and participation metrics
- **`public.project_funding_totals`** - Funding progress and totals

## Governance Configuration

Two new governance questions:

1. **`idea_vote_duration_days`** (number, default: 7)
   - Question: "Kiek dienų trunka idėjos balsavimas?"
   - Configurable per organization

2. **`idea_vote_min_participation_percent`** (number 0-100, default: 50)
   - Question: "Minimalus dalyvavimas idėjos balsavime (procentais nuo aktyvių narių)"
   - Configurable per organization

## Business Rules

### Voting Rules

1. **One vote per idea** - Each idea has exactly one voting session
2. **One ballot per member** - Each member can vote once (FOR or AGAINST)
3. **Default duration** - 7 days (configurable via governance)
4. **Minimum participation** - 50% of active members (configurable via governance)

### Evaluation Rules

After voting closes:

1. **NOT_COMPLETED** - If `votes_total < participation_required`
   - Reason: INSUFFICIENT_PARTICIPATION
   - Does NOT require majority check

2. **PASSED** - If participation OK AND `votes_for > votes_against`
   - Can create project with budget
   - Sets `passed_at` timestamp

3. **FAILED** - If participation OK BUT `votes_for <= votes_against`
   - Reason: NO_MAJORITY

### Project Creation

- Created from PASSED ideas
- Requires budget (EUR)
- Automatically set to FUNDING status
- Links to original idea via `idea_id`

### Contributions

Three types:

1. **MONEY** - Cash contribution (EUR)
2. **IN_KIND** - Material items (JSONB array: `[{name, qty, unit, notes}]`)
3. **WORK** - Labor hours (JSONB: `{type, hours, available_dates, notes}`)

## RPC Functions

### Idea Management

- `create_idea(p_org_id, p_title, p_summary, p_details, p_public_visible)` - Create new idea
- `open_idea_for_voting(p_idea_id)` - Start voting (OWNER/BOARD only)
- `can_cast_idea_vote(p_vote_id, p_user_id)` - Preflight check
- `cast_idea_vote(p_vote_id, p_choice)` - Cast vote (FOR/AGAINST)
- `close_idea_vote(p_vote_id)` - Close voting (OWNER/BOARD only)
- `evaluate_idea_vote_and_transition(p_vote_id, p_create_project, p_budget_eur)` - Evaluate and optionally create project

### Project Contributions

- `pledge_money(p_project_id, p_amount_eur, p_note)` - Pledge cash
- `pledge_in_kind(p_project_id, p_items, p_note)` - Pledge materials
- `pledge_work(p_project_id, p_work, p_note)` - Pledge labor
- `update_contribution_status(p_contribution_id, p_status)` - Update status (OWNER/BOARD only)

## UI Routes

### Authenticated (Members)

- `/dashboard/[slug]/ideas` - Ideas list
- `/dashboard/[slug]/ideas/[ideaId]` - Idea detail with voting
- `/dashboard/[slug]/projects` - Projects list
- `/dashboard/[slug]/projects/[projectId]` - Project detail with contributions

### Public (No Auth)

- `/c/[subdomain]/ideas` - Public ideas list (only `public_visible=true`)
- `/c/[subdomain]/ideas/[ideaId]` - Public idea view (title + summary + status + results)

## Public Visibility Rules

- **Public page shows:**
  - Title
  - Summary
  - Status
  - Voting period (opened_at, closes_at)
  - Results (FOR/AGAINST, participation %)

- **Public page does NOT show:**
  - Details text
  - Attachments
  - Full member information

- **Authenticated members see everything** (details, attachments, full voting info)

## Auto-Close Strategy

**MVP:** Manual close via "Uždaryti ir įvertinti" button (OWNER/BOARD)

**V2 (Optional):** Scheduled job to auto-close when `closes_at` passes

## Key Features

1. ✅ One vote per idea (enforced by UNIQUE constraint)
2. ✅ One ballot per member (enforced by UNIQUE constraint)
3. ✅ Configurable voting duration (governance)
4. ✅ Configurable participation threshold (governance)
5. ✅ NOT_COMPLETED status for insufficient participation
6. ✅ Automatic project creation from PASSED ideas
7. ✅ Three contribution types (money, in-kind, work)
8. ✅ Public visibility with limited information
9. ✅ Real-time funding progress tracking

## Files Created

### SQL Migrations
- `sql/audit_ideas_projects_readonly.sql` - Read-only audit
- `sql/create_ideas_projects_module.sql` - Schema (tables, views)
- `sql/create_ideas_projects_rls.sql` - RLS policies
- `sql/create_ideas_projects_rpc.sql` - RPC functions
- `sql/add_governance_questions_ideas.sql` - Governance questions

### Server Actions
- `src/app/actions/ideas.ts` - Idea management actions
- `src/app/actions/projects.ts` - Project and contribution actions

### UI Components
- `src/components/ideas/ideas-list.tsx` - Ideas list
- `src/components/ideas/create-idea-modal.tsx` - Create idea form
- `src/components/ideas/idea-detail.tsx` - Idea detail with voting
- `src/components/projects/create-project-modal.tsx` - Create project form

### Documentation
- `IDEAS_PROJECTS_MODULE_SUMMARY.md` - This file

## Next Steps

1. Create project detail component with contributions
2. Create public pages for ideas
3. Add attachment upload functionality
4. (Optional) Implement auto-close scheduled job

