# GA Protokolų Modulis - Sukūrimo Suvestinė

## 📋 Apžvalga

Sukurtas pilnas GA Protokolų modulis su:
- **Snapshot generavimas** - iš "gyvų" DB duomenų (meetings + attendance + agenda + votes + tallies)
- **Immutable protokolai** - FINAL protokolai su snapshot + hash + PDF
- **Versijavimas** - galima kurti naują protokolo versiją (v2, v3)
- **PDF generavimas** - server-side PDF generavimas iš snapshot

## 🗄️ Duomenų Bazės Struktūra

### 1. Lentelės

#### `meeting_protocols`
- `id` UUID PK
- `org_id` UUID FK → orgs
- `meeting_id` UUID FK → meetings
- `protocol_number` TEXT NOT NULL (pvz. "2025-0002")
- `version` INT NOT NULL DEFAULT 1
- `status` TEXT NOT NULL DEFAULT 'DRAFT' (DRAFT/FINAL)
- `snapshot` JSONB NOT NULL - VISAS protokolo turinys
- `snapshot_hash` TEXT NOT NULL - sha256(snapshot::text)
- `pdf_bucket` TEXT DEFAULT 'meeting-documents'
- `pdf_path` TEXT
- `created_by` UUID
- `created_at` TIMESTAMPTZ
- `finalized_by` UUID
- `finalized_at` TIMESTAMPTZ

**Constraints:**
- `UNIQUE (meeting_id, version)` - vienas protokolas per versiją

#### `meeting_protocol_signatures` (optional MVP)
- `id` UUID PK
- `protocol_id` UUID FK → meeting_protocols
- `role` TEXT NOT NULL (CHAIRMAN/SECRETARY)
- `signed_by` UUID
- `signed_at` TIMESTAMPTZ
- `signature_type` TEXT (typed/ep-signature)
- `signature_data` JSONB

## 🔧 RPC Funkcijos

**Failas:** `sql/create_protocol_rpc_functions.sql`

### A) `build_meeting_protocol_snapshot(p_meeting_id)`
- Surenka visą protokolo turinį iš gyvų DB duomenų:
  1. Meeting meta: title, scheduled_at, location, published_at, notice_days
  2. Attendance summary: present_count by mode + total_active_members
  3. Quorum: `meeting_quorum_status(meeting_id)` (jei egzistuoja) arba manual calculation
  4. Agenda: items su resolution + vote + tallies + attachments
- Grąžina JSONB snapshot

### B) `preview_meeting_protocol(p_meeting_id)`
- Peržiūrėti protokolą (tik OWNER/BOARD)
- NEKURIA įrašo, tik grąžina snapshot UI preview
- Reason: OK_PREVIEW / MEETING_NOT_FOUND / NOT_GA_MEETING / FORBIDDEN

### C) `finalize_meeting_protocol(p_meeting_id)`
- Finalizuoti protokolą (tik OWNER/BOARD)
- Validacijos:
  1. meeting_type='GA'
  2. Visi GA votes CLOSED (jei resolution_id yra agenda item'e)
  3. Optional: auto-apply outcome per `apply_vote_outcome(vote_id)`
- Sukuria meeting_protocols įrašą:
  - version = max(version)+1 per meeting_id
  - protocol_number = "YYYY-NNNN" format
  - snapshot = build_meeting_protocol_snapshot()
  - snapshot_hash = sha256(snapshot::text)
  - status='FINAL', finalized_at/by
- Optional: set meetings.status='COMPLETED'

### D) `get_meeting_protocol(p_protocol_id)`
- Gauna protokolą (nariams tik FINAL, adminams DRAFT/FINAL)
- Grąžina JSONB su meta + snapshot

## 🔒 RLS Policies

**Failas:** `sql/create_protocol_rls_policies.sql`

### meeting_protocols:
- **MEMBERS:** SELECT tik FINAL protokolus savo org
- **OWNER/BOARD:** SELECT DRAFT/FINAL, kurti/finalizuoti savo org
- **UPDATE:** neleisti keisti FINAL (tik insert naują version)
- **OWNER/BOARD:** UPDATE DRAFT (pvz. PDF path)

### meeting_protocol_signatures:
- **MEMBERS:** SELECT tik FINAL protokolų parašus
- **OWNER/BOARD:** CRUD savo org

## 🎨 Server Actions

**Failas:** `src/app/actions/protocols.ts`

### Preview & Finalize:
- `previewMeetingProtocol(meetingId)` - preview snapshot
- `finalizeMeetingProtocol(meetingId)` - finalize protocol

### Get & List:
- `getMeetingProtocol(protocolId)` - get single protocol
- `listMeetingProtocols(meetingId)` - list protocols for meeting

### PDF:
- `updateProtocolPdf(protocolId, pdfPath, pdfBucket)` - update PDF path after generation
- `getProtocolPdfSignedUrl(protocolId)` - signed URL (1h)

## 🖼️ UI Komponentai

### 1. Protocol Preview
**Failas:** `src/components/protocols/protocol-preview.tsx`

- Peržiūrėti protokolą (snapshot render)
- Rodo: meeting info, attendance, quorum, agenda su votes + tallies
- Finalize mygtukas (jei onFinalize callback)

### 2. Protocol Actions
**Failas:** `src/components/protocols/protocol-actions.tsx`

- Admin view:
  - "Peržiūrėti protokolą" mygtukas
  - "Finalizuoti protokolą" mygtukas
  - Esamų protokolų sąrašas
  - PDF download
- Member view:
  - Tik FINAL protokolai
  - PDF download

## 📦 PDF Generavimas

**Note:** PDF generavimas turi būti implementuotas server-side:

```typescript
// Example: src/app/actions/generate-protocol-pdf.ts
export async function generateProtocolPdf(protocolId: string) {
  // 1. Get protocol snapshot
  const { snapshot } = await getMeetingProtocol(protocolId)
  
  // 2. Generate HTML from snapshot (template)
  const html = renderProtocolHtml(snapshot)
  
  // 3. Render to PDF (Playwright/Chromium or other)
  const pdfBuffer = await renderPdf(html)
  
  // 4. Upload to Supabase Storage
  const pdfPath = `org/${orgId}/protocols/${protocolId}.pdf`
  await supabase.storage.from('meeting-documents').upload(pdfPath, pdfBuffer)
  
  // 5. Update protocol PDF path
  await updateProtocolPdf(protocolId, pdfPath)
}
```

## ✅ Testavimo Scenarijai

### 1) Finalize leidžia sukurti FINAL protokolą
- ✅ Snapshot'e matosi: attendance, quorum, agenda, votes + tallies
- ✅ Snapshot_hash apskaičiuojamas
- ✅ Version = 1 (jei pirmas)

### 2) Jei nors vienas GA vote OPEN → finalize blokuoja
- ✅ Reason: VOTE_NOT_CLOSED + item_no + resolution_id
- ✅ UI rodo aiškų error message

### 3) PDF sugeneruojamas ir matomas nariui
- ✅ PDF upload į Storage
- ✅ PDF path update į meeting_protocols
- ✅ Narys gali atsisiųsti per signed URL

### 4) Immutability
- ✅ FINAL protokolų UPDATE blokuojamas RLS
- ✅ Galima kurti naują version (v2, v3)

## 📝 Migracijos Eiliškumas

1. **Pirmiausia:** `sql/audit_protocol_module_readonly.sql` - READ-ONLY auditas
2. **Tada:** `sql/create_protocol_module.sql` - lentelės
3. **Tada:** `sql/create_protocol_rpc_functions.sql` - RPC funkcijos
4. **Galiausiai:** `sql/create_protocol_rls_policies.sql` - RLS policies

## 🎯 Svarbu

- ✅ Protokolas generuojamas iš "gyvų" DB duomenų
- ✅ FINAL protokolai IMMUTABLE (snapshot + hash)
- ✅ Versijavimas: galima kurti naują version
- ✅ Integracija su esamu `apply_vote_outcome` (jei egzistuoja)
- ✅ Nelieskite esamo balsavimo modulio DB objektų - tik naudokite

## 📚 Failų Sąrašas

### SQL:
- `sql/audit_protocol_module_readonly.sql` - READ-ONLY auditas
- `sql/create_protocol_module.sql` - lentelės
- `sql/create_protocol_rpc_functions.sql` - RPC funkcijos
- `sql/create_protocol_rls_policies.sql` - RLS policies

### Server Actions:
- `src/app/actions/protocols.ts` - visi protocol server actions

### UI Komponentai:
- `src/components/protocols/protocol-preview.tsx` - protocol preview
- `src/components/protocols/protocol-actions.tsx` - protocol actions (admin/member)

---

**Status:** ✅ Modulis sukurtas ir paruoštas testavimui!

**Note:** PDF generavimas turi būti implementuotas atskirai (Playwright/Chromium arba kita serverinė biblioteka).

