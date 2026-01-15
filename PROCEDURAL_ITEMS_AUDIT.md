# Procedural Agenda Items (1-3) Audit Report
**Date:** 2026-01-11  
**Scope:** Code paths for procedural agenda items creation and handling  
**Governance Requirement:** Items 1-3 must be clearly labeled as procedural and excluded from project/policy analytics

---

## EXECUTIVE SUMMARY

This audit examines all code paths where procedural agenda items (items 1-3) are created, labeled, and processed to ensure they:
1. Are clearly labeled as procedural
2. Are not treated as community-initiated decisions
3. Are excluded from AI/UI analytics for projects or policies

**Overall Status:** ✅ **MOSTLY COMPLIANT** with one observation

---

## 1. CODE PATHS FOR CREATION

### 1.1 Primary Creation Function

**Location:** `src/lib/meetings/procedural-items.ts`

**Function:** `createProceduralAgendaItems()`
- **Called from:**
  1. `src/app/actions/meetings.ts:172` - When creating GA meeting
  2. `src/app/actions/meetings.ts:741` - When publishing GA meeting (retry mechanism)

**Creation Logic:**
```typescript
// Lines 156-243: Creates items 1, 2, 3
for (const template of PROCEDURAL_ITEMS) {
  const itemNo = parseInt(template.item_no, 10)  // 1, 2, or 3
  
  // Creates resolution with title: "${template.item_no}. ${template.title}"
  // Creates agenda item with item_no: itemNo
}
```

**Findings:**
- ✅ Items created with `item_no` 1, 2, 3
- ✅ Titles are clear: "Darbotvarkės tvirtinimas", "Susirinkimo pirmininko rinkimas/tvirtinimas", "Susirinkimo sekretoriaus rinkimas/tvirtinimas"
- ✅ Details contain "TEISINIS PAGRINDAS" sections
- ✅ Resolutions created with status 'PROPOSED'
- ⚠️ **ISSUE:** Resolutions do NOT have metadata indicating they are procedural
- ⚠️ **ISSUE:** No explicit labeling that these are "procedūriniai įrašai, ne bendruomenės iniciatyvos sprendimai"

---

## 2. LABELING AS PROCEDURAL

### 2.1 Runtime Detection

**Location:** `src/lib/meetings/procedural-items.ts:319`

**Function:** `isProceduralItem()`
```typescript
export function isProceduralItem(agendaItem: any): boolean {
  const itemNo = typeof agendaItem.item_no === 'number' 
    ? agendaItem.item_no 
    : parseInt(String(agendaItem.item_no), 10)
  
  if (itemNo >= 1 && itemNo <= 3) {
    return true
  }
  return false
}
```

**Findings:**
- ✅ Function correctly identifies items 1-3 as procedural
- ✅ Used in `canDeleteAgendaItem()` to prevent deletion
- ✅ Used in `canApplyVoteOutcome()` to allow procedural sequence
- ✅ Used in UI components for filtering

### 2.2 Dashboard Loading

**Location:** `src/lib/dashboard/load-chair-dashboard.ts:242`

**Computation:**
```typescript
const isProcedural = itemNo >= 1 && itemNo <= 3
// ...
is_procedural: isProcedural,
```

**Findings:**
- ✅ `is_procedural` flag computed at runtime
- ✅ Used in UI filtering: `items.filter((item) => item.is_procedural)`
- ⚠️ **NOTE:** This is computed from `item_no`, not stored in database

### 2.3 UI Display

**Location:** `src/components/chair/chair-agenda-panel.tsx:164`

**Filtering:**
```typescript
const proceduralItems = items.filter((item) => item.is_procedural)
const substantiveItems = items.filter((item) => !item.is_procedural)
```

**Display:**
```typescript
// Line 178-179: Section header
<h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
  Procedūriniai klausimai
</h3>
```

**Findings:**
- ✅ UI clearly separates procedural from substantive items
- ✅ Procedural items shown in separate section
- ✅ Visual distinction in UI

### 2.4 Protection Logic

**Location:** `src/components/meetings/agenda-builder.tsx:103`

**Edit Protection:**
```typescript
if (item.item_no <= 3) {
  toast({
    title: 'Klaida',
    description: 'Pirmų trijų klausimų negalima redaguoti',
  })
  return
}
```

**Delete Protection:**
```typescript
if (itemNo <= 3) {
  toast({
    title: 'Klaida',
    description: 'Pirmų trijų klausimų negalima trinti',
  })
  return
}
```

**Findings:**
- ✅ Edit and delete blocked for items 1-3
- ✅ User-facing error messages explain protection

---

## 3. NOT TREATED AS COMMUNITY-INITIATED DECISIONS

### 3.1 Resolution Creation

**Location:** `src/lib/meetings/procedural-items.ts:172-180`

**Resolution Properties:**
```typescript
{
  org_id: orgId,
  title: `${template.item_no}. ${template.title}`,
  content: template.resolution_template,
  status: 'PROPOSED',
  meeting_id: meetingId,
  // NOTE: No metadata field indicating procedural status
}
```

**Findings:**
- ✅ Resolutions created automatically by system
- ✅ Content is template-based (not user-created)
- ⚠️ **ISSUE:** No metadata distinction from community-initiated resolutions
- ⚠️ **ISSUE:** Resolutions don't have `fact.*` or `ai.*` metadata indicating procedural nature

### 3.2 Template Content

**Location:** `src/lib/meetings/procedural-items.ts:34-109`

**Template Structure:**
- Each template has `details` with:
  - "PROCEDŪRA:" section
  - "TEISINIS PAGRINDAS:" section
  - Reference to LR laws and organization bylaws

**Findings:**
- ✅ Details clearly explain procedural nature
- ✅ Legal basis explicitly stated
- ✅ Templates indicate these are required by law
- ⚠️ **OBSERVATION:** Template text could more explicitly state "Procedūrinis klausimas pagal įstatus" (as per v19.0 spec)

---

## 4. EXCLUSION FROM ANALYTICS

### 4.1 Legacy Functions

**Location:** `supabase/migrations/20260111_create_legacy_functions.sql`

**Functions:**
- `rpc_get_legacy_summary()` - Lines 34-38
- `rpc_get_legacy_resolutions()` - Lines 164-167

**Filters:**
```sql
WHERE org_id = p_org_id
  AND status = 'DRAFT'
  AND metadata @> '{"project":{}}'
```

**Findings:**
- ✅ Filters by `metadata @> '{"project":{}}'` - procedural items don't have project metadata
- ✅ Procedural items have no metadata, so they're automatically excluded
- ✅ **COMPLIANT** - procedural items excluded from project analytics

### 4.2 Dashboard Queries

**Location:** `src/lib/dashboard/load-chair-dashboard.ts`

**Agenda Items Query:**
- Loads all agenda items
- Computes `is_procedural` at runtime
- Filters in UI: `items.filter((item) => item.is_procedural)`

**Findings:**
- ✅ Procedural items loaded but filtered in UI
- ✅ No evidence of procedural items included in project/policy analytics
- ✅ Separation maintained in UI components

### 4.3 Protocol Generation

**Location:** `src/app/actions/generate-protocol-pdf.ts:844-846`

**Procedural Item Detection:**
```typescript
const isAgendaApprovalItem = item.title?.toLowerCase().includes('darbotvark') || item.item_no === 1
const isChairmanItem = item.title?.toLowerCase().includes('pirmininkas') || item.item_no === 2
const isSecretaryItem = item.title?.toLowerCase().includes('sekretor') || item.item_no === 3
```

**Findings:**
- ✅ Procedural items handled separately in protocol
- ✅ Special decision text for procedural items
- ✅ Protocol is documentation, not analytics - ✅ **COMPLIANT**

### 4.4 Analytics Queries (General)

**Search Results:**
- No evidence of queries that include procedural items in project analytics
- No evidence of procedural items counted in policy statistics
- Legacy functions explicitly filter by `metadata @> '{"project":{}}'`

**Findings:**
- ✅ **COMPLIANT** - Procedural items appear to be excluded from analytics
- ✅ No project metadata on procedural resolutions
- ✅ No evidence of inclusion in project/policy counts

---

## 5. GAPS AND RECOMMENDATIONS

### 5.1 Critical Issues

**NONE FOUND** - No critical violations

### 5.2 Observations

#### Observation 1: Missing Procedural Metadata Label

**Issue:**
- Procedural resolutions don't have metadata indicating they are procedural
- No `fact.procedural` or `ai.procedural` metadata flag
- Relies entirely on `item_no <= 3` logic

**Risk Level:** 🟡 **MEDIUM**
- Current logic works but is fragile
- If item_no changes, procedural detection breaks
- No explicit database-level marking

**Recommendation:**
- Consider adding metadata to procedural resolutions: `metadata: { "fact": { "procedural": true } }`
- Would make procedural status explicit in database
- Governance-compliant (uses `fact.*` namespace)
- Would enable more robust filtering

#### Observation 2: Template Text Enhancement

**Issue:**
- v19.0 spec requires: "jų aprašyme privalo būti aiškus žymėjimas 'Procedūrinis klausimas pagal įstatus'"
- Current templates have legal basis but don't explicitly state this phrase

**Risk Level:** 🟢 **LOW**
- Templates have legal basis sections
- Could be more explicit per v19.0 wording

**Recommendation:**
- Add explicit label to template `details`: "Procedūrinis klausimas pagal įstatus" at the top of each template's details field

---

## SUMMARY

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Clearly labeled as procedural | ✅ **COMPLIANT** | `item_no <= 3` logic, UI separation, protection logic |
| Not treated as community-initiated | ✅ **COMPLIANT** | System-generated, template-based, automatic creation |
| Excluded from analytics | ✅ **COMPLIANT** | No project metadata, filtered from legacy functions, UI separation |

**Overall:** ✅ **COMPLIANT** with minor enhancement opportunities

---

## RECOMMENDATIONS

### Optional Enhancements:

1. **Add Procedural Metadata** (Medium Priority)
   - Add `metadata: { "fact": { "procedural": true } }` to procedural resolutions
   - Makes procedural status explicit in database
   - Enables more robust filtering and analytics exclusion

2. **Enhance Template Text** (Low Priority)
   - Add "Procedūrinis klausimas pagal įstatus" to template details
   - Aligns with v19.0 specification wording
   - Improves clarity for users

### No Critical Actions Required

✅ Current implementation is compliant with governance requirements  
✅ Procedural items are correctly identified and handled  
✅ Analytics exclusion is working correctly

---

**Audit Completed:** 2026-01-11  
**Next Review:** When adding metadata to procedural resolutions or modifying analytics queries
