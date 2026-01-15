# Documentation Index

## 📚 Main Documentation

### Getting Started
- [README.md](../README.md) - Project overview and setup
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Quick reference guide

### Architecture & Analysis
- [SERVER_ACTIONS_ANALYSIS.md](SERVER_ACTIONS_ANALYSIS.md) - All 64 server actions
- [COMPONENTS_ANALYSIS.md](COMPONENTS_ANALYSIS.md) - All 144 components
- [RPC_FUNCTIONS_ANALYSIS.md](RPC_FUNCTIONS_ANALYSIS.md) - All 71 RPC functions

### Database
- [SQL_DATABASE_CLEANUP.md](SQL_DATABASE_CLEANUP.md) - SQL organization
- [CONSOLIDATED_SQL_NEW.md](CONSOLIDATED_SQL_NEW.md) - New consolidated SQL info
- [CONSOLIDATED_SQL_ISSUES.md](CONSOLIDATED_SQL_ISSUES.md) - SQL issues (old)

### Setup & Configuration
- [PLATFORM_ADMIN_SETUP.md](PLATFORM_ADMIN_SETUP.md) - Platform admin setup
- [SUPER_ADMIN_SETUP.md](SUPER_ADMIN_SETUP.md) - Super admin setup
- [RLS_POLICIES_FOR_PLATFORM_ADMIN.md](RLS_POLICIES_FOR_PLATFORM_ADMIN.md) - RLS policies

### Cleanup & Migration
- [CLEANUP_SUMMARY.md](CLEANUP_SUMMARY.md) - Codebase cleanup results
- [CLEANUP_STRATEGY.md](CLEANUP_STRATEGY.md) - Cleanup strategy
- [MIGRATION_STRATEGY.md](MIGRATION_STRATEGY.md) - Migration strategy

### Reports
- [AUDIT_REPORT.md](AUDIT_REPORT.md) - Audit report

## 🗂️ Quick Links

### By Topic
- **Meetings & GA**: 
  - Components: `src/components/meetings/`
  - Actions: `src/app/actions/meetings.ts`
  - SQL: `sql/modules/meetings/`
  - Docs: See GA HARD MODE section below
- **Voting & Ballots**: 
  - **PRIMARY SPEC**: [VOTING_FLOW_SPECIFICATION.md](VOTING_FLOW_SPECIFICATION.md) (v18.8.1 with GA HARD MODE)
  - Components: `src/components/voting/`
  - Actions: `src/app/actions/voting.ts`
  - SQL: `sql/modules/voting/`
- **Resolutions**: Components in `src/components/resolutions/`, Actions in `src/app/actions/resolutions.ts`
- **Governance**: SQL in `sql/modules/governance/`, Components in `src/components/governance/`
- **Members**: Components in `src/components/members/`, Actions in `src/app/actions/members.ts`

### By Type
- **Server Actions**: `src/app/actions/*.ts` (64 files)
- **Components**: `src/components/**/*.tsx` (144 files)
- **SQL Modules**: `sql/modules/**/*.sql` (53 files)
- **RPC Functions**: See [RPC_FUNCTIONS_ANALYSIS.md](RPC_FUNCTIONS_ANALYSIS.md)

## 📊 Statistics

- **Server Actions**: 64
- **Components**: 144
- **RPC Functions**: 71
- **SQL Modules**: 53 files
- **Database Tables**: 39
- **RLS Policies**: 92

## 🗳️ GA HARD MODE Documentation

**Visuotinio narių susirinkimo (GA) procedūrinis režimas:**

1. [VOTING_FLOW_SPECIFICATION.md](VOTING_FLOW_SPECIFICATION.md) - **PRIMARY SPEC** (v18.8.1)
2. [GA_MODE_CONFIGURATION.md](GA_MODE_CONFIGURATION.md) - TEST/PRODUCTION setup
3. [GA_HARD_MODE_IMPLEMENTATION.md](GA_HARD_MODE_IMPLEMENTATION.md) - Implementation guide
4. [GA_HARD_MODE_STRENGTHENING.md](GA_HARD_MODE_STRENGTHENING.md) - can_cast_vote enforcement
5. [GA_HARD_MODE_DEFENSE_IN_DEPTH.md](GA_HARD_MODE_DEFENSE_IN_DEPTH.md) - Triple Layer Security
6. [GA_PROCEDURAL_ITEMS.md](GA_PROCEDURAL_ITEMS.md) - Procedūriniai klausimai
7. [GA_PROCEDURAL_SEQUENCE.md](GA_PROCEDURAL_SEQUENCE.md) - Procedural Lock-in
8. [GA_COMPLETION_VALIDATION.md](GA_COMPLETION_VALIDATION.md) - Completion guard
9. [GA_HARD_MODE_DEPLOYMENT_GUIDE.md](GA_HARD_MODE_DEPLOYMENT_GUIDE.md) - Deployment

**Deployment:** `sql/GA_HARD_MODE_DEPLOYMENT.sql`

## 🔍 Search Tips

1. **Find a feature**: Check `QUICK_REFERENCE.md`
2. **Find server action**: Check `SERVER_ACTIONS_ANALYSIS.md`
3. **Find component**: Check `COMPONENTS_ANALYSIS.md`
4. **Find SQL**: Check `sql/modules/` or `SQL_DATABASE_CLEANUP.md`
5. **Find RPC**: Check `RPC_FUNCTIONS_ANALYSIS.md`
6. **GA/Voting**: Check `VOTING_FLOW_SPECIFICATION.md` (v18.8.1)

