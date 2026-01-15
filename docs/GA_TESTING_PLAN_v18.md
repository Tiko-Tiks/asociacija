# GA MODULIO TESTAVIMO PLANAS v18.8.6

**Data:** 2025-01-09  
**Versija:** v18.8.6 MVP  
**Tikslas:** Validuoti GA HARD MODE prieš production

---

## PRE-TEST CHECKLIST

### ✅ **Prieš pradedant:**

- [ ] SQL migracijos deployed (`sql/GA_HARD_MODE_DEPLOYMENT.sql`)
- [ ] `GA_MODE=TEST` nustatytas
- [ ] Application restarted
- [ ] Test organization sukurta
- [ ] Test users sukurti (OWNER, MEMBER)
- [ ] Governance config aktyvuotas

---

## TEST SCENARIOS

### **TEST 1: GA Sukūrimas**

**Tikslas:** Patikrinti ar procedūriniai klausimai auto-generuojami

**Žingsniai:**
1. Login kaip OWNER
2. Navigate: `/dashboard/[slug]/governance/new`
3. Create GA meeting:
   - Title: "Test GA 2025"
   - Date: Future (pvz., 2025-02-15)
   - Location: "Test location"
4. Submit

**Expected:**
- ✅ Meeting created (DRAFT)
- ✅ Items 1-3 automatiškai sukurti:
  - 1. Darbotvarkės tvirtinimas
  - 2. Pirmininko rinkimas
  - 3. Sekretoriaus rinkimas
- ✅ Metadata: `is_procedural: true`
- ✅ Resolutions sukurtos kiekvienam

**Verify:**
```sql
SELECT item_no, title, metadata->>'is_procedural'
FROM meeting_agenda_items
WHERE meeting_id = '<test_meeting_id>'
ORDER BY item_no;

-- Expected: 3 rows (1, 2, 3) with is_procedural = 'true'
```

---

### **TEST 2: Procedūrinių klausimų apsauga**

**Tikslas:** Patikrinti ar negalima ištrinti items 1-3

**Žingsniai:**
1. Bandyti ištrinti "1. Darbotvarkės tvirtinimas"
2. Click "Delete" (jei mygtukas rodomas)

**Expected:**
- ❌ Error: "Procedūriniai klausimai (1-3) negali būti ištrinti..."
- ✅ Item lieka

**Verify:**
```sql
SELECT COUNT(*) FROM meeting_agenda_items
WHERE meeting_id = '<test_meeting_id>'
AND item_no IN ('1', '2', '3');

-- Expected: 3 (visi dar egzistuoja)
```

---

### **TEST 3: Publikavimas**

**Tikslas:** Patikrinti governance snapshot

**Žingsniai:**
1. Add custom agenda item (4. Test klausimas)
2. Click "Publikuoti susirinkimą"

**Expected:**
- ✅ Status: DRAFT → PUBLISHED
- ✅ Governance snapshot išsaugotas
- ✅ Votes sukurti visiems items (1-4)
- ✅ opens_at apskaičiuotas

**Verify:**
```sql
-- Check snapshot
SELECT metadata->'governance_snapshot'
FROM meetings
WHERE id = '<test_meeting_id>';

-- Expected: JSON su early_voting_days, freeze_at, etc.

-- Check votes
SELECT COUNT(*), kind, status
FROM votes
WHERE meeting_id = '<test_meeting_id>'
GROUP BY kind, status;

-- Expected: 4 votes, kind='GA', status='OPEN'
```

---

### **TEST 4: REMOTE Balsavimas (prieš freeze)**

**Tikslas:** Member gali balsuoti REMOTE

**Žingsniai:**
1. Login kaip MEMBER (ne OWNER)
2. Navigate: `/dashboard/[slug]/member`
3. Should see active votes
4. Click "UŽ" for item 1

**Expected:**
- ✅ Vote cast successfully
- ✅ Message: "Jūsų balsas užfiksuotas"
- ✅ Shows "Mano balsas: UŽ"

**Verify:**
```sql
SELECT choice, channel
FROM vote_ballots vb
JOIN votes v ON v.id = vb.vote_id
WHERE v.meeting_id = '<test_meeting_id>'
AND vb.membership_id = '<member_membership_id>';

-- Expected: choice='FOR', channel='REMOTE'
```

---

### **TEST 5: IN_PERSON Blokavimas (GA HARD MODE)**

**Tikslas:** GA + IN_PERSON techniškai neįmanomas

**Žingsniai:**
1. Bandyti balsuoti per UI su channel='IN_PERSON'
   (reikia modifikuoti komponentą arba direct RPC call)

**Test RPC directly:**
```sql
SELECT * FROM cast_vote(
  '<ga_vote_id>'::uuid,
  'FOR',
  'IN_PERSON'
);
```

**Expected:**
- ❌ Error: `{ ok: false, reason: 'GA_CHANNEL_BLOCKED' }`
- ✅ Ballot NEĮRAŠYTAS

**Triple Layer check:**
- Layer 1 (client): Turėtų blokuoti prieš RPC
- Layer 2 (can_cast_vote): Turėtų grąžinti `GA_CHANNEL_NOT_ALLOWED`
- Layer 3 (cast_vote): Turėtų grąžinti `GA_CHANNEL_BLOCKED`

---

### **TEST 6: Freeze Mechanism**

**Tikslas:** Po scheduled_at neleidžia REMOTE voting

**Setup:**
1. Update meeting scheduled_at į praeitį:
   ```sql
   UPDATE meetings
   SET scheduled_at = NOW() - interval '1 hour'
   WHERE id = '<test_meeting_id>';
   ```

2. Bandyti balsuoti REMOTE

**Expected:**
- ❌ Error: "GA_VOTING_FROZEN"
- ✅ Message: "Nuotolinis balsavimas užšaldytas..."
- ✅ Ballot NEĮRAŠYTAS

**Restore:**
```sql
UPDATE meetings
SET scheduled_at = NOW() + interval '7 days'
WHERE id = '<test_meeting_id>';
```

---

### **TEST 7: Procedūrinė eiga (Sequence Lock-in)**

**Tikslas:** Esminiai (4+) užrakinti iki procedūrinių (1-3)

**Setup:**
- Items 1, 2, 3: PROPOSED (dar nebalsavotos)
- Item 4: PROPOSED

**Žingsniai:**
1. Bandyti `closeVoteWithValidation(vote_item_4)`

**Expected:**
- ❌ Error: `GA_PROCEDURE_NOT_COMPLETED`
- ✅ Message: "Procedūrinė eiga neužbaigta. Prieš taikant esminius klausimus, reikia užbaigti: 1, 2, 3"

**Then:**
1. Complete items 1, 2, 3 (vote, close, apply)
2. Bandyti close item 4 dar kartą

**Expected:**
- ✅ Success - item 4 unlocked

---

### **TEST 8: Completion Validation (TEST režimas)**

**Tikslas:** TEST leidžia complete be PDF

**Setup:**
- Items 1-3: APPROVED
- All votes: CLOSED
- PDF: NONE
- `GA_MODE=TEST`

**Žingsniai:**
1. Navigate: `/dashboard/[slug]/chair`
2. Click "UŽBAIGTI GA SUSIRINKIMĄ"

**Expected:**
- ✅ Success
- ✅ Meeting status → COMPLETED
- ✅ metadata.test_only = true
- ✅ Message: "TEST režimas: Rezultatai neturi teisinės galios"

**Verify:**
```sql
SELECT status, metadata
FROM meetings
WHERE id = '<test_meeting_id>';

-- Expected: status='COMPLETED', metadata.test_only=true
```

---

### **TEST 9: Completion Validation (PRODUCTION režimas)**

**Tikslas:** PRODUCTION blokuoja be PDF

**Setup:**
- Change: `GA_MODE=PRODUCTION`
- Restart app
- Items 1-3: APPROVED
- All votes: CLOSED
- PDF: **NONE** ❌

**Žingsniai:**
1. Navigate: `/dashboard/[slug]/chair`
2. Click "UŽBAIGTI GA SUSIRINKIMĄ"

**Expected:**
- ❌ Error: "PRODUCTION režimas: Neįvykdytos visos sąlygos. Trūksta: Pasirašytas protokolas (PDF)"
- ✅ Meeting status lieka PUBLISHED
- ✅ Button disabled arba shows error

**Then:**
1. Upload dummy PDF
2. Bandyti dar kartą

**Expected:**
- ✅ Success (if all other requirements met)

---

### **TEST 10: OPINION balsavimas (unchanged)**

**Tikslas:** OPINION nepakitęs, IN_PERSON veikia

**Žingsniai:**
1. Create OPINION vote (ne GA)
2. Try cast vote IN_PERSON

**Expected:**
- ✅ Success (leidžia)
- ✅ Ballot įrašytas su channel='IN_PERSON'

**Verify:**
```sql
SELECT choice, channel
FROM vote_ballots
WHERE vote_id = '<opinion_vote_id>';

-- Expected: channel='IN_PERSON' (allowed for OPINION)
```

---

### **TEST 11: Dashboard Access Control**

**Tikslas:** Role-based access

**Scenarios:**

**A. Chair dashboard (OWNER):**
```
Login: OWNER
Navigate: /dashboard/[slug]/chair
Expected: ✅ Access granted
```

**B. Chair dashboard (MEMBER):**
```
Login: MEMBER (not OWNER, no PIRMININKAS position)
Navigate: /dashboard/[slug]/chair
Expected: ❌ Redirect to /dashboard/[slug]
```

**C. Member dashboard (MEMBER):**
```
Login: MEMBER
Navigate: /dashboard/[slug]/member
Expected: ✅ Access granted
```

---

## TEST EXECUTION CHECKLIST

- [ ] TEST 1: GA sukūrimas ✅
- [ ] TEST 2: Procedūrinių apsauga ✅
- [ ] TEST 3: Publikavimas + snapshot ✅
- [ ] TEST 4: REMOTE balsavimas ✅
- [ ] TEST 5: IN_PERSON blokavimas ✅
- [ ] TEST 6: Freeze mechanism ✅
- [ ] TEST 7: Procedūrinė eiga ✅
- [ ] TEST 8: Completion TEST ✅
- [ ] TEST 9: Completion PRODUCTION ✅
- [ ] TEST 10: OPINION unchanged ✅
- [ ] TEST 11: Dashboard access ✅

**Kai visi ✅ → GA HARD MODE VALIDATED**

---

## BUG REPORTING

**Jei rasite problemą:**

1. **Dokumentuoti:**
   - Scenario
   - Expected behavior
   - Actual behavior
   - Error messages

2. **Check logs:**
   - Browser console
   - Server logs
   - SQL query logs

3. **Report formato:**
   ```
   TEST: [Test number]
   SCENARIO: [What you did]
   EXPECTED: [What should happen]
   ACTUAL: [What happened]
   ERROR: [Error message]
   LOGS: [Relevant logs]
   ```

---

**Autorius:** Branduolys AI  
**Statusas:** ✅ Test Plan Ready

🧪 **READY TO TEST** 🧪

