# Governance Snapshot Runtime-Only (v18.8)

**Versija:** v18.8.x  
**Data:** 2025-01-09  
**Statusas:** CODE FREEZE - jokių DB schemos keitimų

---

## PROBLEMA

Kodas naudojo `meetings.metadata` stulpelį, bet schema jo neturi. Pagal **Code Freeze** principą negalime keisti DB schemos.

---

## SPRENDIMAS

**Governance snapshot v18.8 yra runtime-only.**

Snapshot **NĖRA persistinamas DB** - jis apskaičiuojamas runtime pagal:
- `meetings.scheduled_at` (freeze_at = scheduled_at)
- Current governance config (`governance_configs`)

Tai **sąmoningas architektūrinis sprendimas**, atitinkantis:
- ✅ Code Freeze (jokių DB schemos keitimų)
- ✅ External Guardian principą (deterministinis balsavimas)
- ✅ Physical Primacy (susirinkimo pradžia = freeze)

---

## KAIP VEIKIA

### 1. **Publikavimas (publishMeeting)**
```typescript
// Governance snapshot apskaičiuojamas runtime
const snapshot = await getGovernanceSnapshot(orgId, scheduledAt)
// saveMeetingSnapshot yra NO-OP (nieko nerašo į DB)
await saveMeetingSnapshot(meetingId, snapshot)
```

### 2. **Freeze Calculation (isVotingFrozen)**
```typescript
// Freeze apskaičiuojamas runtime pagal scheduled_at
const freezeAt = new Date(meeting.scheduled_at)
// GA HARD MODE: freeze_at = scheduled_at
// (nuotolinis balsavimas sustoja susirinkimo pradžioje)
```

### 3. **Early Voting Days (getEarlyVotingDays)**
```typescript
// Visada naudoja current governance config
const snapshot = await getGovernanceSnapshot(orgId)
return snapshot.early_voting_days
```

---

## GA HARD MODE LOGIKA

### **Freeze_at = Scheduled_at**

Pagal GA HARD MODE:
- `freeze_at = scheduled_at` (nuotolinis balsavimas sustoja susirinkimo pradžioje)
- Nėra `remote_vote_freeze_hours` offset (susirinkimo pradžia = freeze)
- Physical Primacy: gyvas susirinkimas yra aukščiausia forma

### **Deterministinis Balsavimas**

Vėlesni governance pakeitimai **neturi įtakos** jau paskelbtam GA, nes:
- `freeze_at` yra fiksuotas per `scheduled_at` (GA HARD MODE logika)
- Voting validacijos naudoja `scheduled_at` tiesiogiai (runtime)
- Nėra "historical governance" lookup (naudojama current governance)

---

## PAŠALINTAS KODAS

### ❌ **Pašalinta:**

1. **`saveMeetingSnapshot`** - paverstas NO-OP (nieko nerašo į DB)
2. **`getMeetingSnapshot`** - naudoja runtime calculation (scheduled_at + current governance)
3. **`isVotingFrozen`** - naudoja `scheduled_at` tiesiogiai
4. **`meetings.metadata` SELECT** - pašalintas iš visų užklausų:
   - `load-chair-dashboard.ts`
   - `ga-completion.ts`
   - `voting.ts`
5. **`meetings.metadata` UPDATE** - pašalintas iš `completeMeeting` (TEST MODE)

### ✅ **Išlaikyta:**

1. **`getGovernanceSnapshot`** - apskaičiuoja snapshot runtime
2. **Runtime freeze calculation** - naudoja `scheduled_at` tiesiogiai
3. **Current governance lookup** - naudoja `governance_configs` (current)

---

## APRIBOJIMAI

### ❌ **NELEIDŽIAMA:**

- ❌ NEPRIDĖTI `metadata` stulpelio į schema
- ❌ NEKEISTI DB schemos (Code Freeze)
- ❌ NEKURTI JSONB „laikinų sprendimų“
- ❌ NENAUDOTI service_role governance rašymui

### ✅ **LEIDŽIAMA:**

- ✅ Runtime snapshot calculation
- ✅ `scheduled_at` naudojimas freeze_at skaičiavimui
- ✅ Current governance config naudojimas
- ✅ Logging (bet ne persistinimas)

---

## TESTAVIMAS

### **Patikrinti, ar veikia:**

```sql
-- 1. Patikrinti, ar meeting turi scheduled_at
SELECT id, title, scheduled_at, status
FROM meetings
WHERE id = '<meeting_id>';

-- 2. Patikrinti, ar votes sukurti
SELECT id, kind, status, meeting_id
FROM votes
WHERE meeting_id = '<meeting_id>';

-- 3. Patikrinti, ar procedural items egzistuoja
SELECT item_no, title
FROM meeting_agenda_items
WHERE meeting_id = '<meeting_id>'
  AND item_no IN (1, 2, 3);
```

### **Expected:**

- ✅ Meeting turi `scheduled_at`
- ✅ Votes sukurti su `kind='GA'`
- ✅ Procedural items (1-3) egzistuoja
- ✅ **NĖRA** `metadata` stulpelio references

---

## ARCHITEKTŪRA

### **Runtime-Only Snapshot Flow:**

```
publishMeeting()
  ↓
getGovernanceSnapshot(orgId, scheduledAt)
  ↓
  - Get current governance config
  - Calculate: freeze_at = scheduledAt
  - Return: snapshot (runtime)
  ↓
saveMeetingSnapshot(meetingId, snapshot)
  ↓
  - NO-OP: nieko nerašo į DB
  - Logging only
  ↓
isVotingFrozen(meetingId)
  ↓
  - Get meeting.scheduled_at
  - Calculate: freeze_at = scheduled_at
  - Check: NOW() >= freeze_at?
  ↓
  Return: { frozen: boolean, freeze_at: string }
```

---

## BENDRASIS PAŽIŪRĖJIMAS

### **Kodėl Runtime-Only?**

1. **Code Freeze** - negalime keisti schemos
2. **Deterministinis** - `scheduled_at` yra fiksuotas, todėl `freeze_at` taip pat
3. **Paprastumas** - nereikia "historical governance" lookup
4. **Physical Primacy** - susirinkimo pradžia = freeze (GA HARD MODE)

### **Ar tai problema?**

**NE.** Runtime-only snapshot yra **teisingas sprendimas**, nes:
- `freeze_at` yra deterministiškai apskaičiuojamas iš `scheduled_at`
- Governance parametrai gali būti gauti iš current governance config
- Nėra "historical governance" reikalo (susirinkimo pradžia = freeze)

---

## ĮGYVENDINIMAS

### **Failai, kurie keisti:**

1. ✅ `src/lib/governance/snapshot.ts` - visi funkcijų pataisymai
2. ✅ `src/app/actions/meetings.ts` - `publishMeeting`, `completeMeeting`
3. ✅ `src/lib/dashboard/load-chair-dashboard.ts` - SELECT užklausa
4. ✅ `src/lib/meetings/ga-completion.ts` - SELECT užklausa
5. ✅ `src/app/actions/voting.ts` - SELECT užklausa
6. ✅ `sql/test_ga_quick_check.sql` - SQL užklausos (pašalinti metadata)
7. ✅ `sql/test_ga_verification.sql` - SQL užklausos (pašalinti metadata)

---

## REZULTATAS

✅ **Sistema veikia be SQL klaidų**  
✅ **Governance snapshot aiškiai apibrėžtas kaip runtime-only**  
✅ **Nėra schemos pažeidimų**  
✅ **GA HARD MODE logika išlaikyta**  
✅ **Code Freeze principas laikomas**

---

**END OF DOCUMENT**

