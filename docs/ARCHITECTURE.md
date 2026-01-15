# System Architecture

## Overview

Branduolys is an institutional governance platform built with Next.js 14 and Supabase.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **UI**: Tailwind CSS, shadcn/ui, Radix UI
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Deployment**: Vercel (recommended)

## Architecture Layers

### 1. Presentation Layer
- **Location**: `src/components/`
- **Purpose**: React components for UI
- **Pattern**: Client components for interactivity
- **Count**: 144 components

### 2. Application Layer
- **Location**: `src/app/actions/`
- **Purpose**: Server Actions for business logic
- **Pattern**: All mutations go through Server Actions
- **Count**: 64 server actions

### 3. Data Layer
- **Location**: `sql/modules/`
- **Purpose**: Database schema, RPC functions, RLS policies
- **Pattern**: Organized by module
- **Count**: 53 SQL files, 71 RPC functions, 92 RLS policies

## Data Flow

```
User Action
  ↓
React Component (Client)
  ↓
Server Action (Server)
  ↓
Supabase Client
  ↓
PostgreSQL (with RLS)
  ↓
Response
  ↓
Component Update
```

## Key Patterns

### Server Actions Pattern
```typescript
// src/app/actions/[module].ts
'use server'
export async function actionName(params) {
  // Business logic
  // Database operations
  // Return result
}
```

### Component Pattern
```typescript
// src/components/[module]/[feature].tsx
'use client'
export function Component() {
  // State management
  // Server Action calls
  // UI rendering
}
```

### RLS Pattern
```sql
-- sql/modules/[module]/create_*_rls_policies.sql
CREATE POLICY "policy_name"
ON table_name
FOR operation
TO role
USING (condition);
```

## Module Organization

### Frontend Modules
- `src/components/meetings/` - Meeting UI
- `src/components/voting/` - Voting UI
- `src/components/resolutions/` - Resolution UI
- `src/components/governance/` - Governance UI
- `src/components/members/` - Member UI

### Backend Modules
- `src/app/actions/meetings.ts` - Meeting logic
- `src/app/actions/voting.ts` - Voting logic
- `src/app/actions/resolutions.ts` - Resolution logic
- `src/app/actions/governance.ts` - Governance logic
- `src/app/actions/members.ts` - Member logic

### Database Modules
- `sql/modules/governance/` - Governance SQL
- `sql/modules/meetings/` - Meetings SQL
- `sql/modules/voting/` - Voting SQL
- `sql/modules/resolutions/` - Resolutions SQL
- `sql/modules/members/` - Members SQL

## Security Model

### Row Level Security (RLS)
- All tables have RLS enabled
- Policies check user membership and positions
- No direct table access without policies

### Server Actions
- All mutations go through Server Actions
- No direct client-side DB operations
- Server-side validation and authorization

### Audit Logging
- Critical actions logged to `audit_logs`
- Immutable audit trail
- Soft mode: failures logged but don't block operations

## State Management

### Server State
- Managed by Supabase
- Real-time subscriptions available
- Cached via Next.js

### Client State
- React hooks (`useState`, `useEffect`)
- Form state via `react-hook-form`
- No global state management library

## Routing

### App Router Structure
```
src/app/
├── (dashboard)/
│   └── dashboard/
│       └── [slug]/
│           ├── meetings/
│           ├── voting/
│           ├── resolutions/
│           └── ...
└── api/
    └── ...
```

### Route Patterns
- `/dashboard/[slug]/meetings` - Meetings
- `/dashboard/[slug]/voting` - Voting
- `/dashboard/[slug]/resolutions` - Resolutions
- `/dashboard/[slug]/members` - Members

## Database Schema

### Core Tables
- `organizations` - Organizations
- `memberships` - Member relationships
- `positions` - Organizational positions
- `meetings` - Meetings
- `agenda_items` - Meeting agenda
- `resolutions` - Legal resolutions
- `votes` - Voting records
- `audit_logs` - Audit trail

### Relationships
- Organizations → Memberships → Users
- Organizations → Positions → Users
- Meetings → Agenda Items → Resolutions
- Resolutions → Votes
- All → Audit Logs

## Deployment

### Recommended Stack
- **Hosting**: Vercel
- **Database**: Supabase
- **Storage**: Supabase Storage
- **Auth**: Supabase Auth

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Performance

### Optimization Strategies
- Server-side rendering (SSR)
- Static generation where possible
- Database query optimization
- RLS policy optimization
- Component code splitting

## Monitoring

### Key Metrics
- Server Action execution time
- Database query performance
- RLS policy effectiveness
- Audit log completeness
- Error rates

