# PDF Generavimo Implementacija - Suvestinė

## ✅ Atlikta

### 1. Playwright Instaliacija ✅

- ✅ `npm install playwright` - įdiegtas Playwright
- ✅ `npx playwright install chromium` - įdiegtas Chromium browser
- ✅ Dynamic import Playwright (tik Node.js runtime)

### 2. RPC Funkcija - set_protocol_pdf ✅

**Failas:** `sql/create_set_protocol_pdf_rpc.sql`

- ✅ `set_protocol_pdf(p_protocol_id, p_bucket, p_path)`
- ✅ Leidžia atnaujinti tik `pdf_bucket` ir `pdf_path` FINAL protokolams
- ✅ Reikalauja OWNER/BOARD role
- ✅ Immutability: negali keisti snapshot, tik PDF path

### 3. Server Action - generateProtocolPdf ✅

**Failas:** `src/app/actions/generate-protocol-pdf.ts`

**Veikimo principas:**
1. ✅ Gauna snapshot per RPC `get_meeting_protocol(protocol_id)`
2. ✅ Render HTML template iš snapshot (Lithuanian headings)
3. ✅ Render PDF su Playwright:
   - `chromium.launch()`
   - `page.setContent(html, {waitUntil:'networkidle'})`
   - `page.pdf({format:'A4', printBackground:true})`
4. ✅ Upload PDF į Storage:
   - bucket: `protocols` (private)
   - path: `org/{orgId}/meetings/{meetingId}/protocols/{protocol_id}_v{version}.pdf`
5. ✅ Persist PDF path per RPC `set_protocol_pdf()`

**HTML Template:**
- ✅ Lithuanian headings: "PROTOKOLAS Nr.", data, vieta, kvorumas, darbotvarkė
- ✅ Balsavimo rezultatai: UŽ/PRIEŠ/SUSILAIKĖ + tallies
- ✅ Resolution status: APPROVED + adopted_at/by
- ✅ Professional styling (A4 format, margins)

### 4. Server Action - getProtocolPdfSignedUrl ✅

**Failas:** `src/app/actions/protocols.ts`

- ✅ Validuoja: member must belong to org
- ✅ Validuoja: protocol must be FINAL
- ✅ Generuoja signed URL (1h validity)
- ✅ Bucket: `protocols` (private)

### 5. UI Komponentai ✅

**Failas:** `src/components/protocols/protocol-actions.tsx`

**Admin (OWNER/BOARD):**
- ✅ "Generuoti PDF" mygtukas (jei FINAL ir pdf_path nėra)
- ✅ "Atsisiųsti PDF" mygtukas (jei pdf_path yra)
- ✅ Loading state: "Generuojama..."

**Member:**
- ✅ Tik FINAL protokolai
- ✅ "Atsisiųsti PDF" mygtukas (jei pdf_path yra)
- ✅ "PDF dar negeneruotas" (jei pdf_path nėra)

## 📋 HTML Template Struktūra

### Sections:
1. **Header:** "PROTOKOLAS" + Nr. {protocol_number}
2. **Susirinkimo informacija:**
   - Pavadinimas
   - Data ir laikas
   - Vieta (jei yra)
   - Protokolas sudarytas (finalized_at)
3. **Dalyvavimas:**
   - Asmeniškai / Raštu / Nuotoliniu būdu
   - Iš viso dalyvavo
4. **Kvorumas:**
   - Kvorumas: PASIEKTAS/NEPASIEKTAS
   - Dalyvavo / Reikia / Kvorumo procentas
5. **Darbotvarkė:**
   - Kiekvienam item:
     - item_no, title, summary, details
     - Resolution (jei yra): title, status, adopted_at/recommended_at
     - Vote results: UŽ/PRIEŠ/SUSILAIKĖ + tallies
     - Attachments (jei yra)
6. **Footer:** Protokolas sugeneruotas + versija

## 🔧 Techniniai Detalės

### Runtime:
- ✅ `export const runtime = 'nodejs'` - Node.js runtime (ne Edge)

### Playwright:
- ✅ Dynamic import (tik Node.js runtime)
- ✅ Chromium browser
- ✅ PDF format: A4
- ✅ Margins: 20mm top/bottom, 15mm left/right
- ✅ Print background: true

### Storage:
- ✅ Bucket: `protocols` (private)
- ✅ Path format: `org/{orgId}/meetings/{meetingId}/protocols/{protocol_id}_v{version}.pdf`
- ✅ Content-Type: `application/pdf`
- ✅ Upsert: true (overwrite if exists)

### Security:
- ✅ RPC `set_protocol_pdf` - tik OWNER/BOARD
- ✅ RPC tik atnaujina pdf_bucket/pdf_path (ne snapshot)
- ✅ Signed URL - tik FINAL protokolams + org membership check

## ✅ Testavimo Scenarijai

### 1) OWNER generuoja PDF:
- ✅ Paspaudžia "Generuoti PDF"
- ✅ PDF sugeneruojamas ir uploadinamas
- ✅ pdf_path atnaujinamas per RPC
- ✅ "Atsisiųsti PDF" mygtukas atsiranda

### 2) MEMBER atsisiunčia PDF:
- ✅ Matyti tik FINAL protokolai
- ✅ Paspaudžia "Atsisiųsti PDF"
- ✅ Signed URL generuojamas (1h validity)
- ✅ PDF atsidaro naujame tab'e

### 3) PDF turinys:
- ✅ Rodo visą protokolo informaciją
- ✅ Lithuanian headings
- ✅ Balsavimo rezultatai (UŽ/PRIEŠ/SUSILAIKĖ)
- ✅ Resolution status (APPROVED + adopted_at/by)

## 📝 Failų Sąrašas

### SQL:
- `sql/create_set_protocol_pdf_rpc.sql` - RPC funkcija PDF path update

### Server Actions:
- `src/app/actions/generate-protocol-pdf.ts` - PDF generavimas (Playwright)
- `src/app/actions/protocols.ts` - atnaujinta `getProtocolPdfSignedUrl` (validation)

### UI:
- `src/components/protocols/protocol-actions.tsx` - "Generuoti PDF" mygtukas

### Dependencies:
- `playwright` - įdiegtas
- `chromium` - įdiegtas

---

**Status:** ✅ PDF generavimas pilnai implementuotas!

**Note:** Supabase Storage bucket `protocols` turi būti sukurtas per Supabase Dashboard (Storage > Buckets > Create bucket: `protocols`, private).

