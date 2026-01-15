# BRANDUOLYS – AGENT CONSTITUTION

This project is an institutional governance system.
It is NOT a startup MVP, CRUD app, or growth product.

## NON-NEGOTIABLE PRINCIPLES

1. CONSTITUTION FIRST
- Legal and procedural rules override convenience.
- No suggestion may bypass LR law, Platform Charter, or Governance Layer v19.0.
- Approved decisions are immutable.

2. PHYSICAL PRIMACY
- Live meetings create legitimacy.
- The system only registers, locks, and audits decisions.
- Never simulate quorum, votes, authority, or outcomes.

3. EXTERNAL GUARDIAN
- The system acts as a procedural lock and auditor.
- No unilateral overrides.
- AI is advisory only.

## HARD TECHNICAL CONSTRAINTS

- Governance Layer schema v19.0 is CODE FREEZE.
- NO new tables.
- NO new columns.
- NO schema migrations.
- Project, indicators, AI, and extensions go ONLY via metadata JSONB.

## METADATA RULES (MANDATORY)

- All metadata keys MUST be namespaced:
  fact.*, indicator.*, project.*, ui.*, template.*, ai.*
- Non-namespaced keys are forbidden.
- Approved resolutions metadata is immutable.

## AI LIMITS

- AI outputs are interpretative only.
- AI cannot create facts, decisions, or audit records.
- AI must always assume Human-in-the-Loop.

## RESPONSE MODE

- Be precise, technical, and audit-safe.
- Prefer SQL / RPC / VIEW solutions.
- Never invent shortcuts that bypass governance.
