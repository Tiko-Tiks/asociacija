# GA Susirinkimo Organizavimo Modulis - Sukūrimo Suvestinė

## 📋 Apžvalga

Sukurtas pilnas GA (Visuotinio Susirinkimo) organizavimo modulis su:
- **Scheduling** - su governance taisyklėmis (meeting_notice_days)
- **Agenda Builder** - darbotvarkės kūrimas ir valdymas
- **Attachments** - priedų valdymas per Supabase Storage
- **Publish** - susirinkimo publikavimas nariams

## 🗄️ Duomenų Bazės Struktūra

### 1. Meetings Lentelės Papildymai

**Failas:** `sql/create_meeting_agenda_module.sql`

Pridėti stulpeliai:
- `meeting_type` TEXT NOT NULL DEFAULT 'GA'
- `status` TEXT NOT NULL DEFAULT 'DRAFT' (DRAFT/PUBLISHED/CANCELLED/COMPLETED)
- `location` TEXT NULL
- `published_at` TIMESTAMPTZ NULL
- `notice_days` INT NULL
- `notice_sent_at` TIMESTAMPTZ NULL
- `agenda_version` INT NOT NULL DEFAULT 1

### 2. Naujos Lentelės

#### `meeting_agenda_items`
- `id` UUID PK
- `meeting_id` UUID FK → meetings
- `item_no` INT (unique per meeting)
- `title` TEXT NOT NULL
- `summary` TEXT
- `details` TEXT
- `resolution_id` UUID FK → resolutions (optional)
- `created_by` UUID
- `created_at`, `updated_at`

#### `meeting_agenda_attachments`
- `id` UUID PK
- `agenda_item_id` UUID FK → meeting_agenda_items
- `storage_bucket` TEXT DEFAULT 'meeting-documents'
- `storage_path` TEXT NOT NULL
- `file_name` TEXT NOT NULL
- `mime_type` TEXT
- `size_bytes` BIGINT
- `uploaded_by` UUID
- `uploaded_at` TIMESTAMPTZ

### 3. View

**`meeting_agenda_public`** - sujungia meetings + agenda_items + attachments (tik PUBLISHED)

## 🔧 RPC Funkcijos

**Failas:** `sql/create_meeting_agenda_rpc_functions.sql`

### A) `get_governance_int(p_org_id, p_key, p_default_int)`
- Gauna int reikšmę iš `governance_configs.answers->>key`
- Jei nėra - grąžina default

### B) `can_schedule_meeting(p_org_id, p_scheduled_at)`
- Tikrina ar susirinkimas gali būti suplanuotas
- Grąžina: `allowed`, `reason`, `earliest_allowed`, `notice_days`, `details`

### C) `create_meeting_ga(p_org_id, p_title, p_scheduled_at, p_location)`
- Sukuria GA susirinkimą (DRAFT status)
- Reikalauja OWNER/BOARD role
- Validuoja scheduling taisykles

### D) `update_meeting_schedule(p_meeting_id, p_scheduled_at, p_location)`
- Atnaujina susirinkimo datą/vietą (tik DRAFT)

### E) Agenda CRUD:
- `add_agenda_item(p_meeting_id, p_item_no, p_title, p_summary, p_details, p_resolution_id)`
- `update_agenda_item(p_agenda_item_id, ...)`
- `delete_agenda_item(p_agenda_item_id)`

### F) `attach_agenda_file_metadata(p_agenda_item_id, p_storage_path, p_file_name, ...)`
- Prideda priedo metaduomenis (failas jau uploadintas į Storage)

### G) `publish_meeting(p_meeting_id)`
- Publikuoja susirinkimą (DRAFT → PUBLISHED)
- Reikalauja bent 1 agenda item
- Validuoja scheduling taisykles
- Set `published_at`, `notice_days`, `agenda_version++`

## 🔒 RLS Policies

**Failas:** `sql/create_meeting_agenda_rls_policies.sql`

### Meetings:
- **Members:** gali matyti tik PUBLISHED
- **OWNER/BOARD:** gali matyti DRAFT/PUBLISHED, kurti/redaguoti/publikuoti

### Agenda Items & Attachments:
- **Members:** gali skaityti tik jei meeting.status='PUBLISHED'
- **OWNER/BOARD:** gali CRUD bet kada (savo org), bet tik jei meeting.status='DRAFT'

## 🎨 Server Actions

**Failas:** `src/app/actions/meetings.ts`

### Scheduling:
- `canScheduleMeeting(orgId, scheduledAt)` - tikrina scheduling taisykles
- `createMeetingGA(orgId, title, scheduledAt, location?)` - sukuria meeting
- `updateMeetingSchedule(meetingId, scheduledAt, location?)` - atnaujina datą

### Agenda:
- `addAgendaItem(meetingId, itemNo, title, summary?, details?, resolutionId?)`
- `updateAgendaItem(agendaItemId, updates)`
- `deleteAgendaItem(agendaItemId)`
- `getAgendaItems(meetingId)`

### Attachments:
- `attachAgendaFileMetadata(agendaItemId, storagePath, fileName, mimeType?, sizeBytes?)`
- `getAgendaAttachments(agendaItemId)`
- `getAgendaAttachmentSignedUrl(attachmentId)` - generuoja signed URL (1h validity)

### Publish:
- `publishMeeting(meetingId)` - publikuoja meeting

### List:
- `listMeetings(orgId, includeDraft?)` - list meetings
- `getMeeting(meetingId)` - get single meeting

## 🖼️ UI Komponentai

### 1. Create Meeting Modal
**Failas:** `src/components/meetings/create-meeting-modal.tsx`

- Forma: pavadinimas, data/laikas, vieta
- **Realtime validacija:** kviečia `can_schedule_meeting` ir rodo "Ankščiausia galima data"
- Create (RPC `create_meeting_ga`)

### 2. Agenda Builder
**Failas:** `src/components/meetings/agenda-builder.tsx`

- Darbotvarkės builder:
  - Pridėti klausimą (item_no, title, summary, details)
  - Pririšti prie esamos rezoliucijos (pasirinkimas iš resolutions DRAFT/PROPOSED)
  - Priedai: upload PDF/nuotrauka → į storage; po upload kviečia `attach_agenda_file_metadata`
- Publish mygtukas (RPC `publish_meeting`)
- Po publish: darbotvarkė read-only

### 3. Meeting View
**Failas:** `src/components/meetings/meeting-view.tsx`

- Meeting detail puslapis:
  - Data/laikas, vieta
  - Darbotvarkės sąrašas (accordion)
  - Kiekviename klausime: summary + "Išsamiau" (details)
  - Priedai: matyti failų sąrašą, atsisiųsti per signed URL
- Jei klausimas susietas su rezoliucija: mygtukas "Atidaryti nutarimą"

## 🔗 Integracija su Voting Moduliu

**Failas:** `src/components/voting/voting-section.tsx` (atnaujinta)

- GA vote kuriamas iš rezoliucijos puslapio
- GA vote turi turėti `meeting_id` (pasirenkamas iš PUBLISHED/DRAFT GA meeting'ų pagal org)
- Meetings fetch filtruoja: `status IN ('DRAFT', 'PUBLISHED')` ir `meeting_type = 'GA'`

## 📦 Supabase Storage

- **Bucket:** `meeting-documents` (rekomenduojama private)
- **Path format:** `org/{orgId}/meetings/{meetingId}/agenda/{agendaItemId}/file.pdf`
- **Signed URLs:** generuojamos per `getAgendaAttachmentSignedUrl()` (1h validity)

## ✅ Testavimo Scenarijai

### A) Scheduling:
- Jei `meeting_notice_days=30` → bandant sukurti susirinkimą už 10 dienų turi grąžinti `ok=false`, `reason NOTICE_TOO_SHORT`, `earliest_allowed`.

### B) Agenda:
- Negalima publish, jei nėra nei vieno item.

### C) Publish:
- Po publish nariai mato meeting ir darbotvarkę, admin gali matyti viską.

### D) Attachments:
- Admin upload meta + narys gali gauti signed URL tik jei meeting PUBLISHED.

## 📝 Migracijos Eiliškumas

1. **Pirmiausia:** `sql/audit_meeting_module_readonly.sql` - READ-ONLY auditas
2. **Tada:** `sql/create_meeting_agenda_module.sql` - lentelės ir view
3. **Tada:** `sql/create_meeting_agenda_rpc_functions.sql` - RPC funkcijos
4. **Galiausiai:** `sql/create_meeting_agenda_rls_policies.sql` - RLS policies

## 🎯 Svarbu

- ✅ Visi veiksmai per RPC, kliente – tik UI
- ✅ Nelieskite balsavimo DB objektų
- ✅ Roles naudoja `memberships.role` (OWNER/MEMBER) ir `positions` (BOARD)
- ✅ Governance taisyklės iš `governance_configs.answers->>'meeting_notice_days'`
- ✅ Default notice_days = 14, jei nėra sukonfigūruota

## 📚 Failų Sąrašas

### SQL:
- `sql/audit_meeting_module_readonly.sql` - READ-ONLY auditas
- `sql/create_meeting_agenda_module.sql` - lentelės ir view
- `sql/create_meeting_agenda_rpc_functions.sql` - RPC funkcijos
- `sql/create_meeting_agenda_rls_policies.sql` - RLS policies

### Server Actions:
- `src/app/actions/meetings.ts` - visi meeting/agenda server actions

### UI Komponentai:
- `src/components/meetings/create-meeting-modal.tsx` - meeting create form
- `src/components/meetings/agenda-builder.tsx` - agenda builder
- `src/components/meetings/meeting-view.tsx` - meeting view (nariams)

### Integracija:
- `src/components/voting/voting-section.tsx` - atnaujinta meetings fetch

---

**Status:** ✅ Modulis sukurtas ir paruoštas testavimui!

