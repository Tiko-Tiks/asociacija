# Schema Decision - Current vs v17.0

## Decision: Keep Current Schema

**Date**: 2026-01-06  
**Decision**: Use current deployed schema (meetings-based)  
**Reason**: v17.0 schema is incomplete for current functionality

---

## Current Schema (Deployed)

### Meetings System
- ✅ `meetings` table - Full meeting lifecycle
- ✅ `meeting_attendance` table - Attendance tracking
- ✅ `meeting_agenda_items` table - Agenda management
- ✅ `meeting_agenda_attachments` table - Attachments
- ✅ `meeting_protocols` table - Protocol generation
- ✅ `meeting_remote_voters` - Remote voter tracking

### Key Features Supported
- Meeting status workflow (DRAFT → PUBLISHED → COMPLETED)
- Quorum tracking (`quorum_met`)
- Agenda versioning (`agenda_version`)
- Notice period (`notice_days`)
- Protocol generation and storage

---

## v17.0 Schema (Documentation Only)

### Events System
- ⚠️ `events` table - Simplified (missing critical fields)
- ⚠️ `event_attendance` table - Different structure
- ❌ No agenda items table
- ❌ No protocols table
- ❌ No remote voters tracking

### Missing Features
- ❌ Meeting status workflow
- ❌ Quorum tracking
- ❌ Agenda versioning
- ❌ Notice period
- ❌ Protocol generation

---

## Why Keep Current Schema

1. **Functionality**: Current schema supports all required features
2. **Code Compatibility**: All code already uses current schema
3. **No Migration Risk**: No need to break working system
4. **Rule 4 Compliance**: Cannot modify schema (NO SQL DDL)

---

## Documentation Updated

- ✅ `docs/ACTUAL_SCHEMA_REFERENCE.md` - Current schema reference
- ✅ `README.md` - Updated with current schema
- ✅ `docs/QUICK_REFERENCE.md` - Updated table references
- ✅ `docs/SCHEMA_DECISION.md` - This document

---

## Status

**Current Schema**: ✅ **ACTIVE** - Use `meetings` table  
**v17.0 Schema**: 📄 **DOCUMENTATION ONLY** - Not deployed  
**Migration**: ❌ **NOT NEEDED** - Current schema is correct

---

**Decision**: Keep current schema, update documentation to reflect reality.

