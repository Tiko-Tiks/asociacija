# DEBUG: Remote Voting Issue

**Problema:** Bandant balsuoti nuotoliu, nerodomas balsavimo UI, nors paspaudė "sutinku balsuoti nuotoliu"

**Data:** 2025-01-09

---

## PROBLEMA

Po to, kai paspaudžia "Išreikšti norą balsuoti nuotoliu", nerodomas balsavimo UI komponentas (`AgendaItemVoting`).

---

## ĮGYVENDINIMAS

### **REMOTE Voting Flow:**

1. **RemoteVotingIntent komponentas:**
   - Rodo "Išreikšti norą balsuoti nuotoliu" mygtuką
   - Paspaudus → `handleRegister` → `registerRemoteAttendance`
   - Po sėkmės → `onConfirmed()` → `handleRemoteIntentConfirmed`

2. **handleRemoteIntentConfirmed:**
   - Nustato `hasRemoteIntent = true`
   - Nustato `showVoting = true`
   - Reload vote IDs

3. **AgendaItemVoting rodymas:**
   - Rodo tik jei: `voteId && showVoting && !isMeetingClosed`

---

## GALIMOS PROBLEMOS

### **1. Votes nėra sukurti**

**Patikrinti:**
```sql
SELECT 
  v.id AS vote_id,
  v.kind,
  v.status,
  v.meeting_id,
  v.resolution_id,
  mai.item_no,
  mai.title
FROM votes v
LEFT JOIN resolutions r ON r.id = v.resolution_id
LEFT JOIN meeting_agenda_items mai ON mai.resolution_id = r.id
WHERE v.meeting_id = 'MEETING_ID'::uuid
ORDER BY mai.item_no;
```

**Expected:** Votes su `kind='GA'`, `status='OPEN'` visiems items su `resolution_id`

**Jei votes nėra:**
- Patikrinti ar `publishMeeting` sukūrė votes
- Patikrinti ar items turi `resolution_id`

---

### **2. voteIdsMap nebuvo užkrautas**

**Patikrinti:**
- Console log'ai: `[MeetingView] Final voteIdsMap:`
- Ar `voteIdsMap` yra populated po `loadVoteIds`

**Jei voteIdsMap tuščias:**
- Patikrinti ar `getVoteIdByResolution` veikia
- Patikrinti ar votes egzistuoja su `kind='GA'`

---

### **3. showVoting nėra true**

**Patikrinti:**
- Console log'ai: `[MeetingView] Remote intent confirmed - enabling voting UI`
- Ar `showVoting` tampa `true` po `handleRemoteIntentConfirmed`

**Jei showVoting false:**
- Patikrinti ar `handleRemoteIntentConfirmed` iškviečiama
- Patikrinti ar `registerRemoteAttendance` grąžina `success: true`

---

### **4. voteId nėra rastas**

**Patikrinti:**
- Debug messages UI: "⚠️ DEBUG: Vote ID nerastas item #X"
- Ar `voteId` egzistuoja `voteIdsMap` pagal `item.id`

**Jei voteId nerastas:**
- Patikrinti ar `getVoteIdByResolution` veikia
- Patikrinti ar votes egzistuoja su `kind='GA'`

---

## DEBUG STEPS

### **STEP 1: Patikrinti SQL**

Paleisti `sql/test_remote_voting_issue.sql`:
- Patikrinti ar votes sukurti
- Patikrinti ar resolutions sukurtos
- Patikrinti ar votes OPEN status

### **STEP 2: Patikrinti Console Logs**

Atidaryti browser console ir patikrinti:
1. `[MeetingView] Loading votes for X agenda items`
2. `[MeetingView] Vote ID for item #X: <vote_id>`
3. `[MeetingView] Final voteIdsMap: {...}`
4. `[MeetingView] Remote intent confirmed - enabling voting UI`
5. `[MeetingView] Reloaded vote IDs after remote intent: {...}`
6. `[MeetingView] Item #X voting conditions: {...}`

### **STEP 3: Patikrinti UI Debug Messages**

Peržiūrėti UI:
- "⚠️ DEBUG: Vote ID nerastas" - reiškia votes nėra sukurti
- "ℹ️ DEBUG: Vote ID egzistuoja, bet showVoting=false" - reiškia reikia paspausti "Išreikšti norą balsuoti nuotoliu"

---

## FIXES APPLIED

### **1. Added reload vote IDs after remote intent confirmed**

```typescript
const handleRemoteIntentConfirmed = () => {
  console.log('[MeetingView] Remote intent confirmed - enabling voting UI')
  setHasRemoteIntent(true)
  setShowVoting(true)
  
  // Force reload vote IDs after remote intent confirmed
  const reloadVoteIds = async () => {
    // ... reload logic ...
  }
  
  reloadVoteIds()
}
```

### **2. Added debug logging for voting conditions**

```typescript
{(() => {
  if (item.item_no <= 3) {
    console.log(`[MeetingView] Item #${item.item_no} voting conditions:`, {
      voteId,
      showVoting,
      isMeetingClosed,
      canShowVoting: voteId && showVoting && !isMeetingClosed,
    })
  }
  return null
})()}
```

### **3. Added debug messages in UI**

- "⚠️ DEBUG: Vote ID nerastas" - jei voteId nerastas
- "ℹ️ DEBUG: Vote ID egzistuoja, bet showVoting=false" - jei showVoting false

---

## NEXT STEPS

1. **Paleisti SQL užklausą** (`sql/test_remote_voting_issue.sql`)
2. **Patikrinti console logs** (browser console)
3. **Patikrinti UI debug messages**
4. **Pridėti daugiau debug logging** (jei reikia)

---

**END OF DEBUG DOCUMENTATION**

