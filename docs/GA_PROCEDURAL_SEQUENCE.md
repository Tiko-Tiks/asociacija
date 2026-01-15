# GA Procedūrinė Eiga (Sequence Enforcement)

**Versija:** 18.8.5  
**Data:** 2025-01-09  
**Statusas:** ✅ Implemented  
**Principas:** Procedural Lock-in

---

## FILOSOFIJA

> **Esminiai sprendimai techniškai neįmanomi be pilnai įvykdytos GA procedūros.**

GA susirinkimas vyksta **griežta tvarka**:
1. Pirma → Procedūriniai klausimai (1-3)
2. Tik tada → Esminiai klausimai (4+)

**Kodėl?**
- **Teisinis integralumas** - Be procedūros sprendimai ginčytini
- **Loginis teisingumas** - Negalima balsuoti be patvirtintos darbotvarkės
- **Praktinis saugumas** - Procedūra garantuoja legitimumą

---

## PROCEDŪRINIS "LOCK-IN"

### Kas yra Lock-in?

**Procedural Lock-in** - techninis mechanizmas, kuris užtikrina, kad:
- Esminiai klausimai **užrakinti**, kol nepraėjo procedūriniai
- Neleidžiama "peršokti" procedūrinių žingsnių
- GA eiga tampa **neapeinama**

### Kaip veikia?

```
┌─────────────────────────────────────────────────┐
│ PROCEDŪRINIAI KLAUSIMAI (1-3)                   │
├─────────────────────────────────────────────────┤
│ 1. Darbotvarkės tvirtinimas    [🔓 UNLOCKED]   │
│ 2. Pirmininko rinkimas          [🔓 UNLOCKED]   │
│ 3. Sekretoriaus rinkimas        [🔓 UNLOCKED]   │
└─────────────────────────────────────────────────┘
            ↓ (Visi APPROVED)
┌─────────────────────────────────────────────────┐
│ ESMINIAI KLAUSIMAI (4+)         [🔓 UNLOCKED]   │
├─────────────────────────────────────────────────┤
│ 4. Biudžeto tvirtinimas         [🔓 Leidžiama]  │
│ 5. Valdybos rinkimai            [🔓 Leidžiama]  │
│ 6. Įstatų pakeitimai            [🔓 Leidžiama]  │
└─────────────────────────────────────────────────┘

TAČIAU:

┌─────────────────────────────────────────────────┐
│ PROCEDŪRINIAI KLAUSIMAI (1-3)                   │
├─────────────────────────────────────────────────┤
│ 1. Darbotvarkės tvirtinimas    [✅ APPROVED]    │
│ 2. Pirmininko rinkimas          [❌ PENDING]    │
│ 3. Sekretoriaus rinkimas        [❌ PENDING]    │
└─────────────────────────────────────────────────┘
            ↓ (Ne visi APPROVED)
┌─────────────────────────────────────────────────┐
│ ESMINIAI KLAUSIMAI (4+)         [🔒 LOCKED]     │
├─────────────────────────────────────────────────┤
│ 4. Biudžeto tvirtinimas         [🔒 BLOKUOTA]   │
│ 5. Valdybos rinkimai            [🔒 BLOKUOTA]   │
│ 6. Įstatų pakeitimai            [🔒 BLOKUOTA]   │
└─────────────────────────────────────────────────┘
```

---

## IMPLEMENTACIJA

### 1. Validatoriaus funkcijos

**Failas:** `src/lib/meetings/procedural-items.ts`

#### **isProceduralSequenceCompleted(meetingId, currentItemNo?)**

**Logika:**
```typescript
// 1. Jei tai procedūrinis klausimas (1-3) - visada leisti
if (['1', '2', '3'].includes(currentItemNo)) {
  return { completed: true, missing: [] }
}

// 2. Gauti visus procedūrinius klausimus su resolutions
const items = await supabase
  .from('meeting_agenda_items')
  .select('item_no, resolutions(status)')
  .eq('meeting_id', meetingId)
  .in('item_no', ['1', '2', '3'])

// 3. Patikrinti ar visi APPROVED
const missing = []
for (const requiredNo of ['1', '2', '3']) {
  const item = items.find(i => i.item_no === requiredNo)
  if (!item || item.resolutions?.status !== 'APPROVED') {
    missing.push(requiredNo)
  }
}

// 4. Grąžinti rezultatą
if (missing.length > 0) {
  return {
    completed: false,
    missing: ['2', '3'],
    details: 'Procedūrinė eiga neužbaigta. Prieš taikant esminius klausimus, reikia užbaigti: 2. Pirmininko rinkimas, 3. Sekretoriaus rinkimas'
  }
}

return { completed: true, missing: [] }
```

#### **canApplyVoteOutcome(meetingId, agendaItemNo)**

**Logika:**
```typescript
// Procedūriniams (1-3) - visada leisti
if (['1', '2', '3'].includes(agendaItemNo)) {
  return { allowed: true }
}

// Esminiam klausimui (4+) - patikrinti procedūrinę eigą
const sequenceCheck = await isProceduralSequenceCompleted(meetingId, agendaItemNo)

if (!sequenceCheck.completed) {
  return {
    allowed: false,
    reason: sequenceCheck.details
  }
}

return { allowed: true }
```

---

### 2. closeVoteWithValidation

**Failas:** `src/app/actions/voting.ts`

**Funkcija:**
```typescript
export async function closeVoteWithValidation(
  voteId: string
): Promise<CloseVoteResult>
```

**Logika:**
```typescript
// 1. Gauti vote info
const vote = await supabase
  .from('votes')
  .select('kind, meeting_id, resolution_id')
  .eq('id', voteId)
  .single()

// 2. Jei GA - patikrinti procedūrinę eigą
if (vote.kind === 'GA' && vote.meeting_id) {
  // Gauti agenda item_no
  const agendaItem = await supabase
    .from('meeting_agenda_items')
    .select('item_no')
    .eq('meeting_id', vote.meeting_id)
    .eq('resolution_id', vote.resolution_id)
    .single()
  
  // Validuoti procedūrinę eigą
  const sequenceCheck = await canApplyVoteOutcome(
    vote.meeting_id, 
    agendaItem.item_no
  )
  
  if (!sequenceCheck.allowed) {
    return {
      ok: false,
      reason: 'GA_PROCEDURE_NOT_COMPLETED',
      votes_for: null,
      votes_against: null,
      votes_abstain: null
    }
  }
}

// 3. Tik po validacijos → close_vote RPC
const result = await supabase.rpc('close_vote', { p_vote_id: voteId })
```

**Old function:**
- `closeVote()` → `@deprecated`

---

### 3. applyVoteOutcomeWithMode

**Failas:** `src/app/actions/voting.ts`

**Pridėta procedūrinės eigos validacija:**

```typescript
if (vote.kind === 'GA' && meetingId) {
  // Gauti agenda item
  const agendaItem = await supabase
    .from('meeting_agenda_items')
    .select('item_no')
    .eq('meeting_id', meetingId)
    .eq('resolution_id', vote.resolution_id)
    .single()
  
  // Validuoti procedūrinę eigą
  const sequenceCheck = await canApplyVoteOutcome(meetingId, agendaItem.item_no)
  
  if (!sequenceCheck.allowed) {
    return {
      ok: false,
      reason: 'GA_PROCEDURE_NOT_COMPLETED',
      ...
    }
  }
}

// Tik po validacijos → apply_vote_outcome RPC
```

---

## VALIDATION FLOW

### Scenario 1: Procedūrinis klausimas (1-3)

```
User → closeVoteWithValidation(vote_for_item_1)
  ↓
Get vote: kind='GA', meeting_id, resolution_id
  ↓
Get agenda item: item_no='1'
  ↓
canApplyVoteOutcome(meetingId, '1')
  ↓
✅ Procedural item (1-3) → allowed: true
  ↓
close_vote RPC → ✅ SUCCESS
```

**Rezultatas:** ✅ Leidžiama uždaryti ir taikyti

### Scenario 2: Esminis klausimas (4+), procedūra OK

```
User → applyVoteOutcomeWithMode(vote_for_item_4)
  ↓
Get vote: kind='GA', meeting_id, resolution_id
  ↓
Get agenda item: item_no='4'
  ↓
canApplyVoteOutcome(meetingId, '4')
  ↓
isProceduralSequenceCompleted(meetingId, '4')
  ↓
Check items 1, 2, 3:
  ✅ Item 1: resolution.status = 'APPROVED'
  ✅ Item 2: resolution.status = 'APPROVED'
  ✅ Item 3: resolution.status = 'APPROVED'
  ↓
✅ completed: true
  ↓
apply_vote_outcome RPC → ✅ SUCCESS
```

**Rezultatas:** ✅ Leidžiama taikyti

### Scenario 3: Esminis klausimas (4+), procedūra INCOMPLETE

```
User → applyVoteOutcomeWithMode(vote_for_item_4)
  ↓
Get vote: kind='GA', meeting_id, resolution_id
  ↓
Get agenda item: item_no='4'
  ↓
canApplyVoteOutcome(meetingId, '4')
  ↓
isProceduralSequenceCompleted(meetingId, '4')
  ↓
Check items 1, 2, 3:
  ✅ Item 1: resolution.status = 'APPROVED'
  ❌ Item 2: resolution.status = 'PROPOSED'  ← PENDING!
  ❌ Item 3: resolution.status = 'PROPOSED'  ← PENDING!
  ↓
❌ completed: false
   missing: ['2', '3']
  ↓
RETURN {
  ok: false,
  reason: 'GA_PROCEDURE_NOT_COMPLETED',
  details: 'Procedūrinė eiga neužbaigta. Prieš taikant esminius klausimus, reikia užbaigti: 2. Pirmininko rinkimas, 3. Sekretoriaus rinkimas'
}
```

**Rezultatas:** ❌ BLOKUOTA - procedūra neužbaigta

### Scenario 4: Esminis klausimas, procedūrinis REJECTED

```
User → closeVoteWithValidation(vote_for_item_5)
  ↓
Check items 1, 2, 3:
  ✅ Item 1: status = 'APPROVED'
  ❌ Item 2: status = 'REJECTED'  ← ATMESTA!
  ✅ Item 3: status = 'APPROVED'
  ↓
❌ completed: false
   missing: ['2']
  ↓
RETURN {
  ok: false,
  reason: 'GA_PROCEDURE_NOT_COMPLETED'
}
```

**Rezultatas:** ❌ BLOKUOTA - pirmininkas neiš rinktas!

**Praktinė reikšmė:**
- Jei pirmininkas neišrinktas → susirinkimas negali tęstis
- Sistema techninėje blokuoja tolimesnius sprendimus
- **Procedūrinis integralumas** užtikrintas

---

## TEISINIS PAGRINDAS

### Kodėl eiliškumas privalomas?

#### 1. Darbotvarkės tvirtinimas (PIRMAS)

**LR Asociacijų įstatymas:**
> Susirinkimas gali priimti sprendimus tik pagal **patvirtintą darbotvarkę**.

**Jei nepatvirtinta:**
- Sprendimai priimti ne pagal darbotvarkę → **ginčytini**
- Procedūrinis pažeidimas → **teisinis pagrindas kvestionuotinas**

**Sistema:**
- ❌ Neleidžia taikyti rezultatų klausimams 4+, kol item 1 ne APPROVED
- ✅ Techninis teisinio reikalavimo enforcement

#### 2. Pirmininko rinkimas (ANTRAS)

**LR Civilinis kodeksas:**
> Susirinkimą veda **išrinktas** pirmininkas.

**Jei neišrinktas:**
- Susirinkimo sprendimai → **procedūriškai neteisingi**
- Gali būti ginčijami teisme

**Sistema:**
- ❌ Neleidžia taikyti rezultatų, kol item 2 ne APPROVED
- ✅ Garantuoja, kad sprendimai priimti su teisėtu pirmininku

#### 3. Sekretoriaus rinkimas (TREČIAS)

**LR Asociacijų įstatymas:**
> Susirinkimo sprendimai fiksuojami **protokole**, kurį rengia **sekretorius**.

**Jei neišrinktas:**
- Protokolo teisėtumas → **ginčytinas**
- Sprendimų fiksavimas → **ne pagal procedūrą**

**Sistema:**
- ❌ Neleidžia taikyti rezultatų, kol item 3 ne APPROVED
- ✅ Garantuoja, kad sprendimai fiksuojami teisėtai

---

## ERROR HANDLING

### Error: GA_PROCEDURE_NOT_COMPLETED

**Kada:**
- Bandoma uždaryti/taikyti esminį klausimą (4+)
- Bet procedūriniai klausimai (1-3) dar ne APPROVED

**Error message:**
```
Procedūrinė eiga neužbaigta.

Prieš taikant esminius klausimus, reikia užbaigti:
- 2. Pirmininko rinkimas
- 3. Sekretoriaus rinkimas

Šie klausimai turi būti balsuoti ir patvirtinti pirma.
```

**User action:**
1. Grįžti prie procedūrinių klausimų
2. Užbaigti balsavimus
3. Taikyti rezultatus
4. Tik tada grįžti prie esminių klausimų

---

## USER FLOW

### Scenario: Bandymas praleisti procedūrą

```
GA susirinkimas:
  1. Darbotvarkės tvirtinimas [✅ APPROVED]
  2. Pirmininko rinkimas      [⏳ PENDING]
  3. Sekretoriaus rinkimas    [⏳ PENDING]
  4. Biudžeto tvirtinimas     [⏳ PENDING]

User bandymas:
  → Spaudžia "Uždaryti balsavimą" ant item 4

Sistema:
  1. ✅ Balsavimas užbaigtas
  2. User spaudžia "Taikyti rezultatą"
  3. ❌ Sistema patikrina procedūrą
  4. ❌ Items 2 ir 3 dar ne APPROVED
  5. ❌ BLOKUOJA su klaida:
  
     🚫 Procedūrinė eiga neužbaigta
     
        Prieš taikant "4. Biudžeto tvirtinimas", reikia užbaigti:
        - 2. Pirmininko rinkimas (dabartinis statusas: PENDING)
        - 3. Sekretoriaus rinkimas (dabartinis statusas: PENDING)
        
        [Grįžti prie procedūrinių klausimų]

User:
  → Grįžta prie klausimų 2 ir 3
  → Užbaigia balsavimus
  → Taiko rezultatus
  → Items 2, 3 → APPROVED
  → DABAR gali taikyti item 4
```

---

## UI GAIRĖS

### Locked Items indikacija

**Kol procedūra neužbaigta:**

```
📋 Darbotvarkė:

✅ 1. Darbotvarkės tvirtinimas     [PRIIMTA]     [✓ Užbaigta]
⏳ 2. Pirmininko rinkimas           [BALSAVIMAS]  [Uždaryti balsavimą]
⏳ 3. Sekretoriaus rinkimas         [BALSAVIMAS]  [Uždaryti balsavimą]

🔒 4. Biudžeto tvirtinimas          [BALSAVIMAS]  [🔒 Užrakinta]
   ⚠️ Užrakinta, kol neužbaigti klausimai 2-3

🔒 5. Valdybos rinkimai              [BALSAVIMAS]  [🔒 Užrakinta]
   ⚠️ Užrakinta, kol neužbaigti klausimai 2-3
```

**Po procedūros užbaigimo:**

```
📋 Darbotvarkė:

✅ 1. Darbotvarkės tvirtinimas     [PRIIMTA]     [✓ Užbaigta]
✅ 2. Pirmininko rinkimas           [PRIIMTA]     [✓ Užbaigta]
✅ 3. Sekretoriaus rinkimas         [PRIIMTA]     [✓ Užbaigta]

🔓 4. Biudžeto tvirtinimas          [BALSAVIMAS]  [Uždaryti balsavimą]
🔓 5. Valdybos rinkimai              [BALSAVIMAS]  [Uždaryti balsavimą]
```

### UI Komponentai:

**Badge:**
```tsx
{isProcedural(item) && (
  <Badge variant="secondary">⚙️ Procedūrinis</Badge>
)}

{!isProcedural(item) && !sequenceCompleted && (
  <Badge variant="outline">🔒 Užrakinta</Badge>
)}
```

**Tooltip:**
```tsx
{!sequenceCompleted && (
  <Tooltip>
    <TooltipTrigger>🔒</TooltipTrigger>
    <TooltipContent>
      Užrakinta, kol neužbaigti procedūriniai klausimai: {missing.join(', ')}
    </TooltipContent>
  </Tooltip>
)}
```

**Button state:**
```tsx
<Button
  onClick={handleCloseVote}
  disabled={!isProcedural(item) && !sequenceCompleted}
>
  {sequenceCompleted ? 'Uždaryti balsavimą' : '🔒 Užrakinta'}
</Button>
```

---

## TESTING

### Test 1: Procedūrinių klausimų taikymas

```typescript
// Setup: Items 1, 2, 3 visi PENDING

// Close item 1
const result1 = await closeVoteWithValidation(vote_item_1)
expect(result1.ok).toBe(true) // ✅ Leidžia (procedūrinis)

// Apply item 1
const apply1 = await applyVoteOutcomeWithMode(vote_item_1)
expect(apply1.ok).toBe(true) // ✅ Leidžia (procedūrinis)

// Now item 1 = APPROVED
```

### Test 2: Esminio klausimo blokavimas

```typescript
// Setup:
// - Item 1: APPROVED ✅
// - Item 2: PENDING ⏳
// - Item 3: PENDING ⏳
// - Item 4: PENDING ⏳

// Try to close item 4
const result4 = await closeVoteWithValidation(vote_item_4)
expect(result4.ok).toBe(false)
expect(result4.reason).toBe('GA_PROCEDURE_NOT_COMPLETED')

// Try to apply item 4
const apply4 = await applyVoteOutcomeWithMode(vote_item_4)
expect(apply4.ok).toBe(false)
expect(apply4.reason).toBe('GA_PROCEDURE_NOT_COMPLETED')
```

### Test 3: Pilnas workflow

```typescript
// 1. Užbaigti visus procedūrinius
await applyVoteOutcomeWithMode(vote_item_1) // ✅
await applyVoteOutcomeWithMode(vote_item_2) // ✅
await applyVoteOutcomeWithMode(vote_item_3) // ✅

// 2. Dabar esminiai atrakinti
const result4 = await closeVoteWithValidation(vote_item_4)
expect(result4.ok).toBe(true) // ✅ Leidžia

const apply4 = await applyVoteOutcomeWithMode(vote_item_4)
expect(apply4.ok).toBe(true) // ✅ Leidžia
```

### Test 4: OPINION nepakitęs

```typescript
// OPINION vote (no meeting_id)
const result = await closeVoteWithValidation(opinion_vote)
expect(result.ok).toBe(true) // ✅ Leidžia (ne GA)

// OPINION vote (nepatikriname procedūros)
const apply = await applyVoteOutcomeWithMode(opinion_vote)
expect(apply.ok).toBe(true) // ✅ Leidžia
```

---

## EDGE CASES

### Case 1: Procedūrinis klausimas atmestas

**Scenario:**
```
Item 2 (Pirmininkas): BALSAVIMAS → votes_for: 5, votes_against: 15
  → Outcome: REJECTED
```

**Praktinė reikšmė:**
- Pirmininkas **neiš rinktas**
- Susirinkimas **negali tęstis**

**Sistema:**
- ❌ Blokuoja esminius klausimus
- ⚠️ Reikia:
  - Balsuoti dar kartą (naujas kandidatas)
  - Arba nutraukti susirinkimą (ne quorum)

### Case 2: Dalinis procedūros užbaigimas

**Scenario:**
```
Item 1: APPROVED ✅
Item 2: APPROVED ✅
Item 3: PENDING ⏳
```

**Sistema:**
- ❌ Vis tiek blokuoja esminius klausimus
- Reikalauja **VISŲ 3** procedūrinių

**Kodėl?**
- Be sekretoriaus protokolas **neteisėtas**
- Sprendimai nefiksuojami pagal procedūrą

### Case 3: Procedūriniai įvykdyti ne eilės tvarka

**Scenario:**
```
User užbaigė tokia tvarka:
  1. Item 2 (Pirmininkas) → APPROVED
  2. Item 3 (Sekretorius) → APPROVED
  3. Item 1 (Darbotvarkė) → PENDING
```

**Sistema:**
- ❌ Blokuoja esminius klausimus
- Reikalauja **VISŲ 3**, nepriklausomai nuo tvarkos

**PASTABA:** Fiziškai susirinkime tvarka svarbi, bet sistema tikrina tik **rezultatus**, ne **eigą**.

---

## DEPLOYMENT

### Code Deploy:

Modifikuoti:
- `src/lib/meetings/procedural-items.ts`
- `src/app/actions/voting.ts`

### Verification:

```typescript
// 1. Create GA meeting with procedural items
const meeting = await createMeetingGA(...)
const items = await getAgendaItems(meeting.meetingId)

// Verify procedural items exist
expect(items.filter(i => ['1','2','3'].includes(i.item_no)).length).toBe(3)

// 2. Try to apply item 4 without completing 1-3
const result = await applyVoteOutcomeWithMode(vote_item_4)
expect(result.ok).toBe(false)
expect(result.reason).toBe('GA_PROCEDURE_NOT_COMPLETED')

// 3. Complete 1-3, then item 4 should work
await applyVoteOutcomeWithMode(vote_item_1)
await applyVoteOutcomeWithMode(vote_item_2)
await applyVoteOutcomeWithMode(vote_item_3)

const result4 = await applyVoteOutcomeWithMode(vote_item_4)
expect(result4.ok).toBe(true)
```

---

## LIMITATIONS

### 1. Eiliškumas vs Rezultatai

**Sistema tikrina:**
- ✅ Ar visi 1-3 yra APPROVED
- ❌ **Netikrina** ar jie užbaigti **eiliškumo tvarka**

**Kodėl?**
- Fiziškai susirinkime tvarka svarbi
- Bet sistema tikrina tik **finalnius rezultatus**
- Pirmininkas turi užtikrinti eiliškumą gyvai

**Future:** Galima pridėti `completed_at` timestamp check (reikia schema change)

### 2. Procedūrinio klausimo REJECTION

**Scenario:** Pirmininkas atmestas

**Sistema:**
- ❌ Blokuoja esminius klausimus
- ⚠️ Reikia manual intervention

**Praktika:**
- Balsuoti dar kartą (naujas kandidatas)
- Arba nutraukti GA (ne quorum / procedūrinė klaida)

**Future:** Galima pridėti "re-vote" mechanizmą

### 3. Procedūrinių klausimų keitimas

**Sistema leidžia:**
- ✅ Redaguoti title, summary, details
- ✅ Pakeisti kandidato vardą nutarime
- ❌ **Ištrinti** klausimą
- ❌ **Pakeisti item_no**

---

## CHANGELOG

**v18.8.5 (2025-01-09):**
- ✅ Sukurta `isProceduralSequenceCompleted()` funkcija
- ✅ Sukurta `canApplyVoteOutcome()` funkcija
- ✅ Modifikuotas `closeVoteWithValidation()` - procedūrinė validacija
- ✅ Modifikuotas `applyVoteOutcomeWithMode()` - procedūrinė priklausomybė
- ✅ Naujas error: `GA_PROCEDURE_NOT_COMPLETED`
- ✅ Procedural lock-in enforcement
- ✅ UI gairės locked items

---

**Autorius:** Branduolys AI  
**Reviewer:** Product Owner  
**Statusas:** ✅ Production Ready

**GARANTIJA:**
> Esminiai sprendimai techniškai neįmanomi be pilnai įvykdytos GA procedūros.  
> GA tampa ne tik „su klausimais", bet su privaloma teisine seka.

🏛️ **PROCEDŪRINIS LOCK-IN AKTYVUS** 🏛️

