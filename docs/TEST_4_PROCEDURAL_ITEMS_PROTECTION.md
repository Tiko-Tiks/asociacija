# TEST 4: Procedūrinių klausimų apsauga

**Testas:** Procedūrinių klausimų (1-3) apsauga nuo ištrinimo  
**Statusas:** ✅ **READY FOR TESTING**  
**Data:** 2025-01-09

---

## TIKSLAS

Patikrinti, ar procedūriniai klausimai (1, 2, 3) yra apsaugoti nuo ištrinimo tiek UI, tiek server-side lygmenyje.

---

## ĮGYVENDINIMAS

### **UI LYGMENYJE:**

1. **Agenda Builder komponentas** (`src/components/meetings/agenda-builder.tsx`):
   - Procedūriniams klausimams (item_no <= 3) rodoma "Privalomas" badge
   - Procedūriniams klausimams (item_no <= 3) "Delete" mygtukas **NĖRA rodomas**
   - Procedūriniams klausimams rodomas disabled menu item: "Privalomas klausimas - negalima redaguoti"

2. **handleDelete funkcija:**
   ```typescript
   if (itemNo <= 3) {
     toast({
       title: 'Klaida',
       description: 'Pirmų trijų klausimų negalima trinti',
       variant: 'destructive',
     })
     return
   }
   ```

### **SERVER-SIDE LYGMENYJE:**

1. **deleteAgendaItem funkcija** (`src/app/actions/meetings.ts`):
   - Patikrina ar klausimas yra procedūrinis (item_no 1, 2, 3)
   - Jei taip → grąžina HARD ERROR
   - Jei ne → leidžia trinti

2. **canDeleteAgendaItem funkcija** (`src/lib/meetings/procedural-items.ts`):
   ```typescript
   if (isProceduralItem(agendaItem)) {
     return {
       deletable: false,
       reason: 'Procedūriniai klausimai (1-3) negali būti ištrinti. Jie yra privalomi pagal LR teisės aktus.',
     }
   }
   ```

---

## TEST SCENARIOS

### **TEST 4.1: UI Lygmenyje (Agenda Builder)**

**Žingsniai:**
1. Login kaip OWNER
2. Navigate: `/dashboard/[slug]/governance/[meeting_id]` (DRAFT meeting)
3. Peržiūrėti darbotvarkės klausimus

**Expected:**
- ✅ Items 1-3 turi "Privalomas" badge
- ✅ Items 1-3 **NETURI** "Delete" mygtuko dropdown meniu
- ✅ Items 1-3 dropdown meniu rodo: "Privalomas klausimas - negalima redaguoti" (disabled)
- ✅ Items 4+ turi "Delete" mygtuką

---

### **TEST 4.2: Client-Side Validation (handleDelete)**

**Žingsniai:**
1. Bandyti iškviesti `handleDelete(item.id, item.item_no)` tiesiogiai per browser console
2. Arba modifikuoti UI laikinai, kad rodytų "Delete" mygtuką item 1-3

**Expected:**
- ✅ `handleDelete` grąžina error toast: "Pirmų trijų klausimų negalima trinti"
- ✅ Item **NĖRA ištrintas**

---

### **TEST 4.3: Server-Side Validation (deleteAgendaItem RPC)**

**Test per SQL:**
```sql
-- Bandyti ištrinti procedūrinį klausimą per RPC
SELECT * FROM delete_agenda_item('PROCEDURAL_ITEM_ID'::uuid);

-- ARBA tiesiogiai per deleteAgendaItem server action
-- (reikia testuoti per UI arba API)
```

**Expected:**
- ❌ RPC grąžina error: "Procedūriniai klausimai (1-3) negali būti ištrinti..."
- ✅ Item **NĖRA ištrintas** iš DB

---

### **TEST 4.4: SQL Direct Attempt (Bypass Protection)**

**Žingsniai:**
```sql
-- Bandyti ištrinti tiesiogiai per SQL (bypass RLS)
-- NOTE: Tai turėtų būti neįmanoma dėl RLS, bet reikia patikrinti

-- 1. Rasti procedūrinio klausimo ID
SELECT id, item_no, title
FROM meeting_agenda_items
WHERE meeting_id = 'MEETING_ID'::uuid
  AND item_no IN (1, 2, 3);

-- 2. Bandyti ištrinti (turėtų veikti tik per RPC su RLS)
-- DELETE FROM meeting_agenda_items WHERE id = 'ITEM_ID'::uuid;
-- (Šis turėtų būti blokuojamas RLS, bet reikia patikrinti)
```

**Expected:**
- ⚠️ RLS turėtų blokuoti tiesioginį DELETE
- ✅ RPC `delete_agenda_item` blokuoja procedūrinius klausimus
- ✅ Server action `deleteAgendaItem` blokuoja procedūrinius klausimus

---

## VERIFICATION SQL

### **Patikrinti, ar visi procedūriniai klausimai egzistuoja:**

```sql
-- PAKEISTI MEETING_ID
SELECT 
  item_no,
  title,
  id
FROM meeting_agenda_items
WHERE meeting_id = 'MEETING_ID'::uuid
  AND item_no IN (1, 2, 3)
ORDER BY item_no;

-- Expected: 3 rows (1, 2, 3) visada egzistuoja
```

---

## TEST RESULT EXPECTED

### ✅ **PASS CRITERIA:**

1. ✅ UI neleidžia trinti procedūrinių klausimų (item_no <= 3)
2. ✅ Client-side validation blokuoja trinimą
3. ✅ Server-side validation blokuoja trinimą
4. ✅ Procedūriniai klausimai (1-3) visada egzistuoja po bet kokių bandymų trinti

### ❌ **FAIL CRITERIA:**

1. ❌ UI leidžia trinti procedūrinius klausimus
2. ❌ Client-side validation neblokuoja trinimo
3. ❌ Server-side validation neblokuoja trinimo
4. ❌ Procedūriniai klausimai gali būti ištrinti

---

## NOTES

- **Triple Layer Protection:**
  1. UI lygmenyje (slepia "Delete" mygtuką)
  2. Client-side validation (`handleDelete`)
  3. Server-side validation (`deleteAgendaItem`)

- **Legal Basis:**
  - Procedūriniai klausimai yra privalomi pagal LR teisės aktus
  - Jie negali būti ištrinti, nes yra būtini GA proceso teisėtumui

- **Code Reference:**
  - `src/components/meetings/agenda-builder.tsx` - UI implementation
  - `src/app/actions/meetings.ts` - Server action
  - `src/lib/meetings/procedural-items.ts` - Validation logic

---

**END OF TEST 4 DOCUMENTATION**

