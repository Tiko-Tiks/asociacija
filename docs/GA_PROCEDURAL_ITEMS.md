# GA Procedūriniai Darbotvarkės Klausimai

**Versija:** 18.8.4  
**Data:** 2025-01-09  
**Statusas:** ✅ Implemented  
**Teisinė bazė:** LR Asociacijų įstatymas, Branduolys Charter

---

## APŽVALGA

Kiekvienas GA (Visuotinis narių susirinkimas) **privalo turėti** 3 procedūrinius klausimus:

1. **Darbotvarkės tvirtinimas**
2. **Susirinkimo pirmininko rinkimas/tvirtinimas**
3. **Susirinkimo sekretoriaus rinkimas/tvirtinimas**

Šie klausimai yra **privalomi** pagal:
- Lietuvos Respublikos Asociacijų įstatymą
- Bendruomenių įstatų reikalavimus
- Branduolys Charter nuostatas

---

## TEISINĖ BAZĖ

### LR Asociacijų įstatymas

**8 straipsnis. Visuotinis narių susirinkimas:**

> Visuotinis narių susirinkimas turi teisę:
> 1. tvirtinti ir keisti asociacijos įstatus;
> 2. rinkti ir atšaukti asociacijos valdymo organų narius;
> 3. **tvirtinti asociacijos veiklos ataskaitą**;
> ...

**Procedūrinė tvarka:**
- Susirinkimas turi turėti **patvirtintą darbotvarkę**
- Susirinkimą veda **išrinktas pirmininkas**
- Sprendimai fiksuojami **pasirašytame protokole**

### Branduolys Charter

**§ 12. GA Procedūra:**

> GA procedūra apima:
> 1. **Darbotvarkės tvirtinimą** - be patvirtintos darbotvarkės susirinkimas neteisėtas
> 2. **Pirmininko rinkimą** - pirmininkas veda susirinkimą ir užtikrina tvarką
> 3. **Sekretoriaus rinkimą** - sekretorius fiksuoja sprendimus ir rengia protokolą

---

## PROCEDŪRINĖ LOGIKA

### Kodėl šie klausimai privalomi?

```
1. DARBOTVARKĖS TVIRTINIMAS
   ↓
   Be patvirtintos darbotvarkės → susirinkimas NETEISĖTAS
   Sprendimai priimti be darbotvarkės → GINČYTINI

2. PIRMININKO RINKIMAS
   ↓
   Pirmininkas veda susirinkimą → TEISĖTUMO GARANTAS
   Be pirmininko → procedūrinis chaosas

3. SEKRETORIAUS RINKIMAS
   ↓
   Sekretorius fiksuoja sprendimus → ĮRODYMŲ SAUGOTOJAS
   Be sekretoriaus → protokolo teisėtumas ginčytinas
```

### Eiliškumo svarba:

Klausimai **VISADA** turi būti **tokia eilės tvarka**:
1. Pirma → Darbotvarkė
2. Antra → Pirmininkas
3. Trečia → Sekretorius
4-N → Esminiai klausimai

**Kodėl?**
- Logika: Pirma patvirtinti ką darysi, paskui kas darys
- Teisė: Procesinės normos reikalauja šios sekos
- Praktika: Nesuderinamai klausimai būtų procedūriškai ginčytini

---

## IMPLEMENTACIJA

### 1. Automatinis sukūrimas

**Kada:** Kuriant GA susirinkimą (DRAFT stadija)

**Funkcija:** `createProceduralAgendaItems(meetingId, orgId)`

**Kas vyksta:**

```typescript
// 1. Patikrinti ar jau egzistuoja (skip if yes)
const existing = await supabase
  .from('meeting_agenda_items')
  .select('item_no')
  .eq('meeting_id', meetingId)
  .in('item_no', ['1', '2', '3'])

if (existing.length > 0) {
  return // Jau sukurti
}

// 2. Sukurti kiekvienam šablonui
for (const template of PROCEDURAL_ITEMS) {
  // A. Sukurti rezoliucijos projektą
  const resolution = await supabase.from('resolutions').insert({
    org_id: orgId,
    title: `${template.item_no}. ${template.title}`,
    body: template.resolution_template,
    status: 'PROPOSED',
    meeting_id: meetingId
  })
  
  // B. Sukurti darbotvarkės klausimą
  await supabase.from('meeting_agenda_items').insert({
    meeting_id: meetingId,
    item_no: template.item_no,
    title: template.title,
    summary: template.summary,
    details: template.details,
    resolution_id: resolution.id,
    metadata: {
      is_procedural: true,
      system_generated: true,
      non_removable: true
    }
  })
}
```

**Iškvietimas:**
```typescript
// createMeetingGA() action
const meetingId = result.meeting_id
await createProceduralAgendaItems(meetingId, orgId)
```

---

### 2. Publikavimo validacija

**Funkcija:** `validateProceduralItems(meetingId)`

**Kas vyksta:**

```typescript
// Patikrinti ar egzistuoja visi 3 klausimai
const items = await supabase
  .from('meeting_agenda_items')
  .select('item_no')
  .eq('meeting_id', meetingId)
  .in('item_no', ['1', '2', '3'])

const missing = ['1', '2', '3'].filter(no => 
  !items.some(item => item.item_no === no)
)

if (missing.length > 0) {
  return {
    valid: false,
    missing,
    details: `Trūksta privalomų procedūrinių klausimų: ${missing.join(', ')}`
  }
}

return { valid: true, missing: [] }
```

**Iškvietimas:**
```typescript
// publishMeeting() action (prieš RPC)
const validation = await validateProceduralItems(meetingId)

if (!validation.valid) {
  return {
    success: false,
    error: validation.details,
    complianceError: true
  }
}

// Tik po validacijos → publish_meeting RPC
```

---

### 3. Trynimo blokavimas

**Funkcija:** `canDeleteAgendaItem(agendaItem)`

**Kas vyksta:**

```typescript
function isProceduralItem(item) {
  // Check metadata
  if (item.metadata?.is_procedural === true) return true
  
  // Check item_no (1, 2, 3)
  if (['1', '2', '3'].includes(item.item_no)) return true
  
  return false
}

function canDeleteAgendaItem(item) {
  if (isProceduralItem(item)) {
    return {
      deletable: false,
      reason: 'Procedūriniai klausimai (1-3) negali būti ištrinti. Jie yra privalomi pagal LR teisės aktus.'
    }
  }
  
  return { deletable: true }
}
```

**Iškvietimas:**
```typescript
// deleteAgendaItem() action (prieš RPC)
const item = await supabase
  .from('meeting_agenda_items')
  .select('item_no, metadata')
  .eq('id', agendaItemId)
  .single()

const deleteCheck = canDeleteAgendaItem(item)

if (!deleteCheck.deletable) {
  return {
    success: false,
    error: deleteCheck.reason
  }
}

// Tik po patikrinimo → delete_agenda_item RPC
```

---

## PROCEDŪRINIŲ KLAUSIMŲ ŠABLONAI

### 1. Darbotvarkės tvirtinimas

**Item No:** 1  
**Pavadinimas:** Darbotvarkės tvirtinimas

**Nutarimo projektas:**
```
NUTARTA:

1. Patvirtinti susirinkimo darbotvarkę pagal pateiktą projektą.
2. Susirinkimą vesti tvirtinant darbotvarkėje nurodytą eigą.
```

**Procedūra:**
1. Pirmininkas pristato darbotvarkės projektą
2. Dalyviams suteikiama galimybė siūlyti pakeitimus
3. Balsavimas dėl darbotvarkės tvirtinimo

**Teisinis pagrindas:**
- LR Asociacijų įstatymas
- Organizacijos įstatai
- Branduolys Charter

---

### 2. Susirinkimo pirmininko rinkimas

**Item No:** 2  
**Pavadinimas:** Susirinkimo pirmininko rinkimas/tvirtinimas

**Nutarimo projektas:**
```
NUTARTA:

1. Tvirtinti [Vardas Pavardė] susirinkimo pirmininku(-e).
2. Pavesti pirmininkui vesti susirinkimą pagal patvirtintą darbotvarkę.
```

**Pirmininko funkcijos:**
- Susirinkimo eigos valdymas
- Diskusijų moderavimas
- Balsavimų organizavimas
- Tvarkos palaikymas

**Teisinis pagrindas:**
- LR Civilinis kodeksas
- Organizacijos įstatai

---

### 3. Susirinkimo sekretoriaus rinkimas

**Item No:** 3  
**Pavadinimas:** Susirinkimo sekretoriaus rinkimas/tvirtinimas

**Nutarimo projektas:**
```
NUTARTA:

1. Tvirtinti [Vardas Pavardė] susirinkimo sekretoriumi(-e).
2. Pavesti sekretoriui fiksuoti susirinkimo eigą ir parengti protokolą.
```

**Sekretoriaus funkcijos:**
- Susirinkimo eigos fiksavimas
- Balsavimų rezultatų registravimas
- Protokolo rengimas
- Sprendimų dokumentavimas

**Teisinis pagrindas:**
- LR Asociacijų įstatymas
- Organizacijos įstatai

---

## METADATA STRUKTŪRA

Procedūriniai klausimai saugomi su metadata:

```json
{
  "is_procedural": true,
  "system_generated": true,
  "non_removable": true
}
```

**Laukai:**
- `is_procedural` - Identifikuoja kaip procedūrinį
- `system_generated` - Sukurtas sistemos (ne user)
- `non_removable` - Neleidžiama ištrinti

**Naudojimas:**
```typescript
const isProcedural = item.metadata?.is_procedural === true
const canDelete = item.metadata?.non_removable !== true
```

---

## USER FLOW

### Scenario 1: Naujas GA susirinkimas

```
1. User → Spaudžia "Sukurti susirinkimą"
2. User → Įveda: Title, Date, Location
3. User → Spaudžia "Sukurti"

4. Sistema:
   ✅ Sukuria meeting (DRAFT)
   ✅ Automatiškai sukuria 3 procedūrinius klausimus (1, 2, 3)
   ✅ Sukuria rezoliucijų projektus kiekvienam
   ✅ Metadata: is_procedural = true

5. User mato:
   📋 Darbotvarkė:
      1. Darbotvarkės tvirtinimas ⚙️ (system)
      2. Pirmininko rinkimas ⚙️ (system)
      3. Sekretoriaus rinkimas ⚙️ (system)
      [+ Pridėti klausimą] → User gali pridėti 4, 5, 6...
```

### Scenario 2: Bandymas ištrinti procedūrinį klausimą

```
1. User → Mato klausimą "1. Darbotvarkės tvirtinimas"
2. User → Spaudžia "Ištrinti" (jei mygtukas rodomas)

3. Sistema:
   ✅ Patikrina: isProceduralItem(item)
   ❌ canDelete → false
   
4. User mato:
   ❌ Klaida: "Procedūriniai klausimai (1-3) negali būti ištrinti. 
              Jie yra privalomi pagal LR teisės aktus."
```

**UI tobulumas:**
- Procedūriniams klausimams **išvis nerodyti** "Ištrinti" mygtuko
- Badge: `⚙️ Procedūrinis`
- Tooltip: "Šis klausimas yra privalomas pagal teisės aktus"

### Scenario 3: Bandymas publikuoti be procedūrinių

```
1. User → Ištrina klausimus 1-3 per SQL (bypass UI)
2. User → Spaudžia "Publikuoti susirinkimą"

3. Sistema:
   ✅ Patikrina: validateProceduralItems(meetingId)
   ❌ missing: ['1', '2', '3']
   
4. User mato:
   ❌ Klaida: "Trūksta privalomų procedūrinių klausimų: 
              1. Darbotvarkės tvirtinimas, 
              2. Pirmininko rinkimas, 
              3. Sekretoriaus rinkimas"
   
   [Atšaukti] [Atkurti automatinius klausimus]
```

---

## BALSAVIMAS UŽ PROCEDŪRINIUS KLAUSIMUS

### Rezoliucijų sukūrimas

Procedūriniai klausimai **automatiškai** gauna rezoliucijų projektus:

```typescript
Resolution = {
  title: "1. Darbotvarkės tvirtinimas",
  body: PROCEDURAL_ITEMS[0].resolution_template,
  status: "PROPOSED",
  meeting_id: meetingId
}
```

### Balsavimų sukūrimas

Publikuojant susirinkimą, **visi** klausimai (įskaitant procedūrinius) gauna GA balsavimus:

```typescript
for (const item of agendaItems) {
  if (item.resolution_id) {
    await createVote({
      resolution_id: item.resolution_id,
      kind: 'GA',
      meeting_id: meetingId
    })
  }
}
```

### GA HARD MODE taikoma VISIEMS

Procedūriniai klausimai balsuojami **TA PAČIA** GA HARD MODE logika:

- ✅ REMOTE/WRITTEN iki freeze
- ✅ Agreguotas gyvas balsavimas
- ❌ Individualus IN_PERSON blokuojamas
- ✅ Rezultatai protokole

**PASTABA:** Sistema **nedaro jokių prielaidų** - visi klausimai balsuojami vienodai.

---

## TECHNINĖ IMPLEMENTACIJA

### Failai:

1. **`src/lib/meetings/procedural-items.ts`** - Core logic
   - `PROCEDURAL_ITEMS` - Šablonai
   - `createProceduralAgendaItems()` - Generatorius
   - `validateProceduralItems()` - Validatorius
   - `canDeleteAgendaItem()` - Trynimo blokeris

2. **`src/app/actions/meetings.ts`** - Server actions
   - `createMeetingGA()` - Auto-generate
   - `publishMeeting()` - Validacija
   - `deleteAgendaItem()` - Blokavimas

### Functions flow:

```
createMeetingGA()
  → create_meeting_ga RPC
  → ✅ Meeting created
  → createProceduralAgendaItems()
    → ✅ Items 1, 2, 3 created
    → ✅ Resolutions created
    → ✅ Metadata: is_procedural = true

publishMeeting()
  → validateProceduralItems()
    → ❌ If missing → HARD ERROR
    → ✅ If OK → proceed
  → publish_meeting RPC
  → createVote() for each item (including procedural)

deleteAgendaItem()
  → canDeleteAgendaItem()
    → ❌ If procedural (1-3) → HARD ERROR
    → ✅ If custom (4+) → proceed
  → delete_agenda_item RPC
```

---

## METADATA FLAGS

### meeting_agenda_items.metadata (JSONB)

```json
{
  "is_procedural": true,
  "system_generated": true,
  "non_removable": true,
  "legal_basis": "LR Asociacijų įstatymas, Branduolys Charter"
}
```

### Kaip naudoti:

```typescript
// Tikrinti ar procedūrinis
const isProcedural = item.metadata?.is_procedural === true

// Tikrinti ar galima ištrinti
const canDelete = item.metadata?.non_removable !== true

// UI badge
if (item.metadata?.system_generated) {
  return <Badge>⚙️ Procedūrinis</Badge>
}
```

---

## UI GAIRĖS

### Procedūriniams klausimams:

1. **Badge:** `⚙️ Procedūrinis` arba `🔒 Privalomas`
2. **Tooltip:** "Šis klausimas yra privalomas pagal LR teisės aktus"
3. **Delete button:** **NERODYTI** (arba disabled)
4. **Edit:** Leidžiama redaguoti **tik tekstą** (title, summary, details)
5. **Reorder:** **NERODYTI** reorder handle (item_no fiksuotas)

### Esminiai klausimai (4+):

1. **Badge:** Jokio
2. **Delete button:** ✅ Rodomas
3. **Edit:** ✅ Viskas leidžiama
4. **Reorder:** ✅ Leidžiama (bet tik 4+ tarpe)

### Darbotvarkės vaizdas:

```
📋 Darbotvarkė:

⚙️ 1. Darbotvarkės tvirtinimas        [Redaguoti]
⚙️ 2. Pirmininko rinkimas              [Redaguoti]
⚙️ 3. Sekretoriaus rinkimas            [Redaguoti]
   4. Bendruomenės biudžeto tvirtinimas [Redaguoti] [Ištrinti] [↕️]
   5. Valdybos rinkimai                 [Redaguoti] [Ištrinti] [↕️]
   6. Įstatų pakeitimai                 [Redaguoti] [Ištrinti] [↕️]

[+ Pridėti klausimą]
```

---

## ERROR HANDLING

### Error 1: Trūksta procedūrinių klausimų publikuojant

```typescript
{
  success: false,
  error: "Trūksta privalomų procedūrinių klausimų: 1. Darbotvarkės tvirtinimas, 2. Pirmininko rinkimas",
  complianceError: true
}
```

**User Action:**
- Atšaukti publikavimą
- Atstatyti procedūrinius klausimus:
  - Auto-restore button (jei available)
  - Arba manually sukurti

### Error 2: Bandymas ištrinti procedūrinį klausimą

```typescript
{
  success: false,
  error: "Procedūriniai klausimai (1-3) negali būti ištrinti. Jie yra privalomi pagal LR teisės aktus."
}
```

**UI:**
- Toast notification
- Red alert box
- Informacija kodėl blokuojama

### Error 3: Auto-generation nepavyko

```typescript
// createMeetingGA iškvietė createProceduralAgendaItems
// Bet jis failed (RLS, DB error, etc.)

{
  success: true,  // Meeting created
  meetingId: "...",
  warning: "Procedūriniai klausimai nesukurti automatiškai. Prašome pridėti rankiniu būdu."
}
```

**User Action:**
- Manual agenda item creation
- Arba retry auto-generation

---

## TESTING

### Test 1: Auto-generation on create

```typescript
// Create GA meeting
const result = await createMeetingGA(
  orgId,
  '2025 Visuotinis susirinkimas',
  '2025-02-15T10:00:00Z',
  'Bendruomenės namai'
)

// Verify
const items = await getAgendaItems(result.meetingId)

expect(items.length).toBeGreaterThanOrEqual(3)
expect(items[0].item_no).toBe('1')
expect(items[0].title).toBe('Darbotvarkės tvirtinimas')
expect(items[0].metadata.is_procedural).toBe(true)
expect(items[1].item_no).toBe('2')
expect(items[2].item_no).toBe('3')
```

### Test 2: Delete blocking

```typescript
// Try to delete procedural item
const result = await deleteAgendaItem(item1Id)

expect(result.success).toBe(false)
expect(result.error).toContain('Procedūriniai klausimai')
expect(result.error).toContain('LR teisės aktus')
```

### Test 3: Publish validation

```typescript
// Delete all agenda items (via SQL - bypass)
await supabase
  .from('meeting_agenda_items')
  .delete()
  .eq('meeting_id', meetingId)

// Try to publish
const result = await publishMeeting(meetingId)

expect(result.success).toBe(false)
expect(result.error).toContain('Trūksta privalomų')
expect(result.complianceError).toBe(true)
```

### Test 4: Voting for procedural items

```typescript
// Publish meeting (procedural items should get votes)
await publishMeeting(meetingId)

// Get votes for procedural resolutions
const votes = await supabase
  .from('votes')
  .select('*')
  .eq('meeting_id', meetingId)
  .eq('kind', 'GA')

// Should have at least 3 votes (procedural items)
expect(votes.length).toBeGreaterThanOrEqual(3)

// Vote for item 1 (procedural)
const result = await castVoteWithValidation({
  vote_id: votes[0].id,
  choice: 'FOR',
  channel: 'REMOTE'
})

// Should work same as regular items
expect(result.ok).toBe(true)
```

---

## DEPLOYMENT

### Code Deploy:

Naujas failas:
- `src/lib/meetings/procedural-items.ts`

Modifikuoti:
- `src/app/actions/meetings.ts`

### Verification:

```sql
-- Patikrinti ar procedūriniai klausimai sukurti
SELECT 
  m.id AS meeting_id,
  m.title AS meeting_title,
  mai.item_no,
  mai.title AS item_title,
  mai.metadata->>'is_procedural' AS is_procedural
FROM meetings m
LEFT JOIN meeting_agenda_items mai ON mai.meeting_id = m.id
WHERE m.status = 'DRAFT'
  AND mai.item_no IN ('1', '2', '3')
ORDER BY m.created_at DESC, mai.item_no;

-- Turėtų matyti visus DRAFT meetings su items 1, 2, 3
```

---

## MIGRATION

### Esami DRAFT meetings be procedūrinių:

```typescript
// Utility script (jei reikia)
async function backfillProceduralItems() {
  const { data: draftMeetings } = await supabase
    .from('meetings')
    .select('id, org_id')
    .eq('status', 'DRAFT')
  
  for (const meeting of draftMeetings) {
    const validation = await validateProceduralItems(meeting.id)
    
    if (!validation.valid) {
      console.log(`Backfilling meeting ${meeting.id}`)
      await createProceduralAgendaItems(meeting.id, meeting.org_id)
    }
  }
}
```

**PASTABA:** Automatically sukurti procedūrinius klausimus tik DRAFT meetings

---

## CHANGELOG

**v18.8.4 (2025-01-09):**
- ✅ Sukurta `procedural-items.ts` library
- ✅ Pridėti 3 procedūrinių klausimų šablonai
- ✅ Automatinis sukūrimas per `createMeetingGA()`
- ✅ Publikavimo validacija per `publishMeeting()`
- ✅ Trynimo blokavimas per `deleteAgendaItem()`
- ✅ Metadata support: `is_procedural`, `system_generated`, `non_removable`
- ✅ Helper funkcijos: `isProceduralItem()`, `canDeleteAgendaItem()`

---

**Autorius:** Branduolys AI  
**Reviewer:** Product Owner  
**Statusas:** ✅ Production Ready

**GARANTIJA:**
> Nėra „neteisėto" GA be procedūrinių klausimų.  
> Onboarding taisyklės techniškai enforce'inamos.  
> GA procedūra tampa neapeinama.

🏛️ **Procedūrinis integralumas užtikrintas** 🏛️

