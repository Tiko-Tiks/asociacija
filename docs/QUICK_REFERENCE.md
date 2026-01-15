# Quick Reference Guide

## 📁 Directory Structure

### `src/app/actions/`
**64 Server Actions** - All state changes go through here
- `meetings.ts` - Meeting management
- `voting.ts` - Voting operations
- `resolutions.ts` - Resolution management
- `members.ts` - Member operations
- `governance.ts` - Governance config

### `src/components/`
**144 Components** - React UI components
- `meetings/` - Meeting UI
- `voting/` - Voting UI
- `resolutions/` - Resolution UI
- `governance/` - Governance UI
- `members/` - Member UI
- `ui/` - shadcn/ui primitives

### `sql/modules/`
**53 SQL Files** - Organized by module
- `governance/` - 9 files
- `meetings/` - 7 files
- `voting/` - 8 files
- `resolutions/` - 1 file
- `projects/` - 3 files
- `members/` - 3 files
- `protocols/` - 4 files
- `organizations/` - 12 files
- `finance/` - 2 files
- `migrations/` - 5 files

## 🔑 Key Database Tables

### Core Tables
- `orgs` - Organizations
- `memberships` - Member relationships (technical access)
- `positions` - Organizational positions (authority)
- `meetings` - GA meetings (NOT events table)
- `meeting_attendance` - Meeting attendance
- `meeting_agenda_items` - Meeting agenda items
- `meeting_agenda_attachments` - Agenda attachments
- `meeting_protocols` - Meeting protocols
- `resolutions` - Legal resolutions
- `votes` - Voting records
- `ballots` - Individual votes
- `audit_logs` - Audit trail

### Status Enums
- `member_status`: PENDING, ACTIVE, SUSPENDED, LEFT
- `meeting_status`: DRAFT, PUBLISHED, COMPLETED, CANCELLED
- `resolution_status`: DRAFT, PROPOSED, APPROVED, REJECTED
- `vote_status`: OPEN, CLOSED
- `vote_choice`: FOR, AGAINST, ABSTAIN
- `vote_channel`: IN_PERSON, WRITTEN, REMOTE

## 🎯 Common Tasks

### Create a Meeting
1. Server Action: `createMeeting()` in `src/app/actions/meetings.ts`
2. Component: `src/components/meetings/create-meeting-modal.tsx`
3. Route: `src/app/(dashboard)/dashboard/[slug]/meetings/new`

### Add Voting
1. Server Action: `castVote()` in `src/app/actions/voting.ts`
2. Component: `src/components/meetings/live-voting-simple.tsx`
3. RPC: `cast_vote()` in database

### Create Resolution
1. Server Action: `createResolution()` in `src/app/actions/resolutions.ts`
2. Component: `src/components/resolutions/`
3. Table: `resolutions`

## 🔍 Finding Code

### Search by Feature
- **Meetings**: `src/components/meetings/`, `src/app/actions/meetings.ts`
- **Voting**: `src/components/voting/`, `src/app/actions/voting.ts`
- **Resolutions**: `src/components/resolutions/`, `src/app/actions/resolutions.ts`
- **Members**: `src/components/members/`, `src/app/actions/members.ts`

### Search by Type
- **Server Actions**: `src/app/actions/*.ts`
- **Components**: `src/components/**/*.tsx`
- **SQL**: `sql/modules/**/*.sql`
- **RPC Functions**: `sql/modules/*/create_*_rpc*.sql`

## 🚨 Important Rules

1. **Server Actions Only** - All mutations via Server Actions
2. **No Direct DB** - No client-side DB operations
3. **Audit Everything** - Critical actions must log to `audit_logs`
4. **RLS Required** - All tables have RLS policies
5. **Immutable Resolutions** - APPROVED resolutions cannot be edited

## 📊 Statistics

- **Server Actions**: 64
- **Components**: 144
- **RPC Functions**: 71
- **SQL Modules**: 53 files
- **Database Tables**: 39
- **RLS Policies**: 92

## 🔗 Useful Links

- [Server Actions Analysis](SERVER_ACTIONS_ANALYSIS.md)
- [Components Analysis](COMPONENTS_ANALYSIS.md)
- [RPC Functions Analysis](RPC_FUNCTIONS_ANALYSIS.md)
- [SQL Database Cleanup](SQL_DATABASE_CLEANUP.md)

