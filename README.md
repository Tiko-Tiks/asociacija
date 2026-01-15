# Branduolys - Community OS

**Version**: v18.8 – Privacy & Performance Enhanced Edition  
**Status**: Code Freeze – Production  
**Type**: SaaS / Community OS (Bendruomenių operacinė sistema)  
**Focus**: Kaimo ir miestelių bendruomenės (Rural & Small Town Focus)

Institutional governance platform for managing communities, meetings, voting, and resolutions.

## Mission

Sukurti institucinę, o ne „programėlę", skaitmeninę infrastruktūrą bendruomenėms, kurioje:
- tvarka kyla iš standarto
- lyderystė apsaugota nuo piktnaudžiavimo
- technologija tarnauja gyvam bendruomeniškumui

## 🏗️ Architecture

### Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **UI**: React, Tailwind CSS, shadcn/ui
- **Language**: TypeScript

### Project Structure

```
Branduolys/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (dashboard)/        # Dashboard routes
│   │   ├── actions/            # Server Actions (64 actions)
│   │   └── api/                # API routes
│   ├── components/             # React components (144 components)
│   │   ├── meetings/          # Meeting management
│   │   ├── voting/            # Voting system
│   │   ├── resolutions/       # Resolutions
│   │   ├── governance/        # Governance
│   │   ├── members/           # Member management
│   │   └── ui/                 # UI primitives (shadcn)
│   └── lib/                    # Utilities
│       └── supabase/          # Supabase client
├── sql/
│   ├── modules/               # Organized SQL modules
│   │   ├── governance/         # Governance SQL
│   │   ├── meetings/          # Meetings SQL
│   │   ├── voting/            # Voting SQL
│   │   ├── resolutions/       # Resolutions SQL
│   │   ├── projects/          # Projects SQL
│   │   ├── members/           # Members SQL
│   │   ├── protocols/         # Protocols SQL
│   │   ├── organizations/    # Organizations SQL
│   │   ├── finance/           # Finance SQL
│   │   └── migrations/        # Migrations
│   ├── archive/               # Archived SQL files
│   └── consolidated_all.sql  # Full schema (migrations)
└── docs/                       # Documentation

```

## 📋 Core Modules

### 1. Governance
- Governance questions and compliance
- Schema versioning
- Organization rulesets

### 2. Meetings
- Meeting creation and management
- Agenda builder
- Meeting attendance
- Live voting

### 3. Voting
- Vote creation and management
- Live vote totals
- Remote voting
- Vote validation

### 4. Resolutions
- Resolution creation
- Approval workflow
- Immutable approved resolutions

### 5. Members
- Member management
- Membership lifecycle (PENDING → ACTIVE → SUSPENDED → LEFT)
- Position assignments
- Member debts

### 6. Organizations
- Organization management
- Community applications
- Review process
- Organization logos

### 7. Projects
- Project/idea management
- Project status workflow
- Pledges (money, work, in-kind)

### 8. Protocols
- Protocol generation
- PDF export
- Protocol management

### 9. Finance
- Invoice management
- Debt tracking
- Payment processing

## 🎯 Core Principles

### Physical Primacy
- Live meetings are the highest form of decision-making
- The system does NOT create legitimacy - it registers, locks, and preserves it
- Electronic voting allowed only as clearly defined exception

### External Guardian
- Branduolys acts as a procedural lock and auditor
- System technically blocks actions violating legal acts, charters, and bylaws
- Unilateral changes to constitutional parameters are forbidden

### Constitution First
- Law and procedure override convenience
- Technology serves law, not vice versa
- All critical actions must be explainable, reviewable, and traceable

## 🔑 Key Concepts

### Roles vs Positions
- **`role`** (OWNER/MEMBER) = Technical access only
- **`positions`** = Organizational authority
- Never infer authority from `role` alone

### Membership Lifecycle
```
PENDING → ACTIVE → SUSPENDED → LEFT
```
- Members are **NEVER deleted**
- Status changes require audit logs

### Resolutions
- Official decisions use `resolutions`
- APPROVED resolutions are **immutable**
- Projects are operational, not legal decisions

### Meetings
- Uses `meetings` table (not `events`)
- Status: DRAFT → PUBLISHED → COMPLETED/CANCELLED
- Attendance tracked via `meeting_attendance`
- Agenda items in `meeting_agenda_items`
- Protocols in `meeting_protocols`

### Audit & Traceability
- All critical actions logged to `audit_logs`
- Audit failures are logged but don't block operations
- Silent audit failures are forbidden

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Supabase account
- PostgreSQL (via Supabase)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your Supabase credentials

# Run migrations
# Use Supabase Dashboard SQL Editor or CLI
# sql/consolidated_all.sql

# Start development server
npm run dev
```

### Database Setup

1. Create Supabase project
2. Run `sql/consolidated_all.sql` in SQL Editor
3. Or use individual modules from `sql/modules/`

## 📚 Documentation

- [`.cursorrules`](.cursorrules) - AI coding rules and philosophy
- [`docs/TECHNICAL_SPECIFICATION.md`](docs/TECHNICAL_SPECIFICATION.md) - Full technical specification v18.8
- [`docs/ACTUAL_SCHEMA_REFERENCE.md`](docs/ACTUAL_SCHEMA_REFERENCE.md) - Current database schema
- [`docs/VOTING_FLOW_SPECIFICATION.md`](docs/VOTING_FLOW_SPECIFICATION.md) - **Voting flow with GA HARD MODE** 🗳️ **[PRIMARY]**
- [`docs/GA_HARD_MODE_FINAL_SUMMARY.md`](docs/GA_HARD_MODE_FINAL_SUMMARY.md) - **📋 FINAL SUMMARY (Start here)** ⭐
- [`docs/GA_MODE_CONFIGURATION.md`](docs/GA_MODE_CONFIGURATION.md) - **GA_MODE setup (TEST/PRODUCTION)** 🔧
- [`docs/GA_HARD_MODE_IMPLEMENTATION.md`](docs/GA_HARD_MODE_IMPLEMENTATION.md) - **Implementation guide** ⚙️
- [`docs/GA_HARD_MODE_STRENGTHENING.md`](docs/GA_HARD_MODE_STRENGTHENING.md) - **can_cast_vote enforcement** 🔒
- [`docs/GA_HARD_MODE_DEFENSE_IN_DEPTH.md`](docs/GA_HARD_MODE_DEFENSE_IN_DEPTH.md) - **Triple Layer Security** 🛡️
- [`docs/GA_PROCEDURAL_ITEMS.md`](docs/GA_PROCEDURAL_ITEMS.md) - **Procedūriniai klausimai** 🏛️
- [`docs/GA_PROCEDURAL_SEQUENCE.md`](docs/GA_PROCEDURAL_SEQUENCE.md) - **Procedūrinė eiga** ⛓️
- [`docs/GA_COMPLETION_VALIDATION.md`](docs/GA_COMPLETION_VALIDATION.md) - **Užbaigimo validacija** 🏁
- [`docs/DASHBOARD_ARCHITECTURE_v18.md`](docs/DASHBOARD_ARCHITECTURE_v18.md) - **Dashboard architecture** 🎯
- [`docs/ADMIN_STRUCTURE_AUDIT_v18.md`](docs/ADMIN_STRUCTURE_AUDIT_v18.md) - **Admin structure audit** 🔍
- [`docs/`](docs/) - Detailed documentation
  - [Server Actions Analysis](docs/SERVER_ACTIONS_ANALYSIS.md)
  - [Components Analysis](docs/COMPONENTS_ANALYSIS.md)
  - [RPC Functions Analysis](docs/RPC_FUNCTIONS_ANALYSIS.md)
  - [SQL Database Cleanup](docs/SQL_DATABASE_CLEANUP.md)
  - [Quick Reference](docs/QUICK_REFERENCE.md)

## 📊 Dashboard Architecture (v18.8+)

### **New Role-Based Dashboards:**

#### 🎯 Chair Dashboard (`/dashboard/[slug]/chair`)
**Purpose:** Full procedural control of GA meetings  
**Access:** OWNER or BOARD with PIRMININKAS position

**Features:**
- Real-time quorum widget
- Procedural agenda control (locked 1-3 until approved)
- Live attendance registration
- Aggregated live vote input (GA HARD MODE)
- Protocol generation & upload
- Complete meeting validation

#### 👤 Member Dashboard (`/dashboard/[slug]/member`)
**Purpose:** Simple, focused voting experience  
**Access:** ACTIVE members

**Features:**
- Active voting card with countdown timer
- FOR / AGAINST / ABSTAIN buttons
- Vote receipt after casting
- Freeze warning when approaching deadline
- No quorum visibility (simplified)

### **Legacy Dashboard:**

⚠️ **Old dashboard (`/dashboard/[slug]/page.tsx`)** 
- **Status:** Gradually being replaced
- **Future:** Will redirect based on role
- **Current:** Still functional but not GA HARD MODE optimized

**See:** `docs/GA_HARD_MODE_IMPLEMENTATION.md` for dashboard design principles

---

## 🛠️ Development

### Server Actions
- All state changes go through Server Actions
- Located in `src/app/actions/`
- No direct client-side DB operations

### Components
- React components in `src/components/`
- UI primitives from shadcn/ui
- Client components for interactivity

### SQL Modules
- Organized by feature in `sql/modules/`
- Idempotent migrations
- Use `consolidated_all.sql` for full setup

## 🔒 Security

- Row Level Security (RLS) on all tables
- Server Actions for all mutations
- Audit logging for critical actions
- No hidden admin overrides

## 📝 Code Style

- TypeScript strict mode
- Server Actions for mutations
- Client components for UI
- RLS policies for data access

## 🤝 Contributing

See [`.cursorrules`](.cursorrules) for development philosophy and rules.

## 📄 License

[Your License Here]

