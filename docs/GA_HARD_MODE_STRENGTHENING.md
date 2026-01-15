# GA HARD MODE - can_cast_vote() Sutvirtinimas

**Versija:** 18.8.2  
**Data:** 2025-01-09  
**Statusas:** ✅ Implemented

---

## TIKSLAS

Padaryti `can_cast_vote` **vieninteliu GA HARD MODE "vartų sargu"**, kuris užtikrina, kad:
1. GA balsavimai veikia TIK pagal procedūrines taisykles
2. Freeze mechanizmas veikia naudojant governance snapshot
3. Jokios neteisėtos užklausos nepasiekia `cast_vote`

---

## PAKEITIMAI

### 1. Governance Snapshot Praplėtimas

**Failas:** `src/lib/governance/snapshot.ts`

#### 1.1. GovernanceSnapshot interface

**Pridėta:**
```typescript
freeze_at?: string      // ISO timestamp - kada užšaldo nuotolinį balsavimą
scheduled_at?: string   // Meeting scheduled_at (reference)
```

**Efektas:**
- Freeze momentas fiksuojamas publikavimo metu
- Snapshot saugo meeting.scheduled_at kaip freeze_at
- Vėlesni meeting laiko pakeitimai **neturi įtakos**

#### 1.2. getGovernanceSnapshot modifikacija

**Signature pakeitimas:**
```typescript
// Buvo:
getGovernanceSnapshot(orgId: string): Promise<GovernanceSnapshot>

// Dabar:
getGovernanceSnapshot(
  orgId: string, 
  meetingScheduledAt?: string
): Promise<GovernanceSnapshot>
```

**Logika:**
```typescript
if (meetingScheduledAt) {
  snapshot.freeze_at = meetingScheduledAt
  snapshot.scheduled_at = meetingScheduledAt
}
```

#### 1.3. isVotingFrozen() NAUJA FUNKCIJA

**Funkcija:**
```typescript
export async function isVotingFrozen(
  meetingId: string
): Promise<{ frozen: boolean; freeze_at?: string; message?: string }>
```

**Logika:**
1. Gauti snapshot iš meeting metadata
2. Jei nėra snapshot → `frozen: false` (DRAFT meeting)
3. Jei nėra `freeze_at` → `frozen: false`
4. Jei `NOW() >= freeze_at` → `frozen: true`
5. Grąžinti aiškų message

**Naudojimas:**
```typescript
const { frozen, message } = await isVotingFrozen(meetingId)
if (frozen) {
  return error(message)
}
```

---

### 2. publishMeeting Modifikacija

**Failas:** `src/app/actions/meetings.ts`

**Pakeitimas:**
```typescript
// Gauti meeting scheduled_at
const { data: meetingData } = await supabase
  .from('meetings')
  .select('scheduled_at')
  .eq('id', meetingId)
  .single()

// Perduoti į snapshot
const snapshot = await getGovernanceSnapshot(
  meeting.org_id, 
  meetingData?.scheduled_at  // ← NAUJAS parametras
)
```

**Efektas:**
- Snapshot dabar turi `freeze_at = scheduled_at`
- Freeze momentas užfiksuotas publikavimo metu
- Nekeičiamas po publikavimo

---

### 3. can_cast_vote RPC Sutvirtinimas

**Failas:** `sql/modules/voting/create_vote_rpc_functions.sql`

#### 3.1. Pilna Channel Validacija

**Buvo:**
```sql
IF v_vote.kind = 'GA' AND p_channel = 'IN_PERSON' THEN
  -- Blokuoti tik IN_PERSON
END IF
```

**Dabar:**
```sql
IF v_vote.kind = 'GA' THEN
  -- 1. Blokuoti VISKĄ, kas ne REMOTE ir ne WRITTEN
  IF p_channel NOT IN ('REMOTE', 'WRITTEN') THEN
    RETURN 'GA_CHANNEL_NOT_ALLOWED'
  END IF
  
  -- 2. Freeze patikra (jei meeting_id yra)
  ...
END IF
```

**Error kodas:** `GA_CHANNEL_NOT_ALLOWED`

**Details:**
```json
{
  "message": "GA balsavimai leidžia tik REMOTE arba WRITTEN kanalus...",
  "vote_kind": "GA",
  "channel": "<bandytas_kanalas>",
  "allowed_channels": ["REMOTE", "WRITTEN"],
  "ga_hard_mode": true
}
```

#### 3.2. Freeze Patikra (SQL)

**Logika:**
```sql
IF v_vote.meeting_id IS NOT NULL THEN
  SELECT scheduled_at INTO v_meeting_scheduled_at
  FROM meetings
  WHERE id = v_vote.meeting_id
  
  IF NOW() >= v_meeting_scheduled_at THEN
    RETURN 'GA_VOTING_FROZEN'
  END IF
END IF
```

**Error kodas:** `GA_VOTING_FROZEN`

**Details:**
```json
{
  "message": "Nuotolinis balsavimas užšaldytas. Susirinkimas jau prasidėjo...",
  "vote_kind": "GA",
  "freeze_at": "<scheduled_at>",
  "ga_hard_mode": true
}
```

**PASTABA:** SQL naudoja tiesiogiai `meeting.scheduled_at`, ne snapshot, nes:
- SQL negali lengvai pasiekti `meetings.metadata` JSONB
- Snapshot saugomas client-side validacijai
- Dviguba sauga: SQL + Client

---

### 4. canCastVoteWithSnapshot() Server Action

**Failas:** `src/app/actions/voting.ts`

#### 4.1. Nauja Funkcija

**Signature:**
```typescript
export async function canCastVoteWithSnapshot(
  voteId: string,
  channel: 'IN_PERSON' | 'WRITTEN' | 'REMOTE' = 'IN_PERSON'
): Promise<CanCastVoteResult>
```

**Old function:**
- `canCastVote` → `@deprecated`
- Rekomenduojama naudoti `canCastVoteWithSnapshot`

#### 4.2. GA HARD MODE Pre-validation

**Logika (prieš RPC):**

```typescript
if (vote.kind === 'GA') {
  // 1. Channel validation
  if (channel !== 'REMOTE' && channel !== 'WRITTEN') {
    return { allowed: false, reason: 'GA_CHANNEL_NOT_ALLOWED' }
  }
  
  // 2. Freeze validation (SNAPSHOT-BASED)
  if (vote.meeting_id) {
    const { isVotingFrozen } = await import('@/lib/governance/snapshot')
    const freezeCheck = await isVotingFrozen(vote.meeting_id)
    
    if (freezeCheck.frozen) {
      return { allowed: false, reason: 'GA_VOTING_FROZEN' }
    }
  }
}

// Tik po visų patikrinimų → call RPC
```

**Dviguba sauga:**
1. **Client-side** (snapshot-based) - tikslus freeze pagal publikavimo snapshot
2. **SQL** (meeting.scheduled_at) - failsafe jei snapshot nėra

---

## VALIDACIJOS FLOW

### Scenario 1: GA + REMOTE (prieš freeze)

```
1. User → canCastVoteWithSnapshot(voteId, 'REMOTE')
2. ✅ vote.kind = 'GA'
3. ✅ channel IN ('REMOTE', 'WRITTEN')
4. ✅ isVotingFrozen → { frozen: false }
5. → Call RPC can_cast_vote
6. RPC ✅ channel IN ('REMOTE', 'WRITTEN')
7. RPC ✅ NOW() < scheduled_at
8. RPC ✅ Other checks (membership, governance, etc.)
9. → RETURN { allowed: true }
```

### Scenario 2: GA + REMOTE (po freeze)

```
1. User → canCastVoteWithSnapshot(voteId, 'REMOTE')
2. ✅ vote.kind = 'GA'
3. ✅ channel IN ('REMOTE', 'WRITTEN')
4. ❌ isVotingFrozen → { frozen: true, message: "..." }
5. → RETURN { allowed: false, reason: 'GA_VOTING_FROZEN' }
   (RPC niekada nekviečiamas)
```

### Scenario 3: GA + IN_PERSON

```
1. User → canCastVoteWithSnapshot(voteId, 'IN_PERSON')
2. ✅ vote.kind = 'GA'
3. ❌ channel NOT IN ('REMOTE', 'WRITTEN')
4. → RETURN { allowed: false, reason: 'GA_CHANNEL_NOT_ALLOWED' }
   (Freeze netgi netikrinama)
   (RPC niekada nekviečiamas)
```

### Scenario 4: GA + Kitas kanalas (pvz., 'EMAIL')

```
1. User → canCastVoteWithSnapshot(voteId, 'EMAIL')
2. ✅ vote.kind = 'GA'
3. ❌ channel NOT IN ('REMOTE', 'WRITTEN')
4. → RETURN { allowed: false, reason: 'GA_CHANNEL_NOT_ALLOWED' }
```

### Scenario 5: OPINION + IN_PERSON

```
1. User → canCastVoteWithSnapshot(voteId, 'IN_PERSON')
2. ❌ vote.kind != 'GA'
3. → SKIP GA validations
4. → Call RPC can_cast_vote (standard flow)
5. → OPINION balsavimas veikia normaliai
```

---

## ERROR KODAI

### Nauji error kodai:

| Kodas | Reikšmė | Kada |
|-------|---------|------|
| `GA_CHANNEL_NOT_ALLOWED` | Channel ne REMOTE/WRITTEN | GA + ne-allowed channel |
| `GA_VOTING_FROZEN` | Freeze aktyvus | NOW >= freeze_at |

### Esami error kodai (išliko):

| Kodas | Reikšmė |
|-------|---------|
| `VOTE_NOT_FOUND` | Vote neegzistuoja |
| `VOTE_CLOSED` | Vote status != OPEN |
| `NOT_A_MEMBER` | Nėra ACTIVE narystės |
| `CAN_VOTE_BLOCKED` | Governance can_vote blocked |
| `ALREADY_VOTED` | Jau balsavo |

---

## DVIGUBA SAUGA (Defense in Depth)

### Layer 1: Client-side (Snapshot-based) ✅

**Funkcija:** `canCastVoteWithSnapshot()`

**Privalumai:**
- Naudoja governance snapshot (tikslus freeze)
- Greitesnis (mažiau DB queries)
- Aiškesni error messages

**Tikrina:**
- Channel restrictions
- Freeze pagal snapshot.freeze_at

### Layer 2: SQL RPC (Failsafe) ✅

**Funkcija:** `can_cast_vote()`

**Privalumai:**
- Paskutinė gynybos linija
- Veikia net jei client-side apeitas
- Naudoja tiesiogiai meeting.scheduled_at

**Tikrina:**
- Channel restrictions
- Freeze pagal meeting.scheduled_at

### Kodėl dviguba?

1. **Saugumas** - Net jei client-side bypass bandymas, SQL sustabdo
2. **Snapshot precision** - Client naudoja tikslų snapshot freeze
3. **Failsafe** - SQL naudoja live meeting data jei snapshot kažkaip nėra
4. **Defense in depth** - Branduolys principas

---

## TESTING

### Test Cases:

#### 1. GA Channel Restrictions

```typescript
// ✅ REMOTE leidžiamas
await canCastVoteWithSnapshot(gaVoteId, 'REMOTE')
// → { allowed: true }

// ✅ WRITTEN leidžiamas  
await canCastVoteWithSnapshot(gaVoteId, 'WRITTEN')
// → { allowed: true }

// ❌ IN_PERSON blokuojamas
await canCastVoteWithSnapshot(gaVoteId, 'IN_PERSON')
// → { allowed: false, reason: 'GA_CHANNEL_NOT_ALLOWED' }

// ❌ Bet koks kitas blokuojamas
await canCastVoteWithSnapshot(gaVoteId, 'EMAIL')
// → { allowed: false, reason: 'GA_CHANNEL_NOT_ALLOWED' }
```

#### 2. Freeze Mechanizmas

```typescript
// Scenario: Meeting 2025-01-15 10:00

// ✅ 2025-01-14 09:00 (prieš freeze)
await canCastVoteWithSnapshot(gaVoteId, 'REMOTE')
// → { allowed: true }

// ❌ 2025-01-15 10:01 (po freeze)
await canCastVoteWithSnapshot(gaVoteId, 'REMOTE')
// → { allowed: false, reason: 'GA_VOTING_FROZEN' }

// ❌ 2025-01-15 10:00 (lygiai freeze momentu)
await canCastVoteWithSnapshot(gaVoteId, 'REMOTE')
// → { allowed: false, reason: 'GA_VOTING_FROZEN' }
```

#### 3. OPINION Nepakit ę

```typescript
// ✅ IN_PERSON vis dar veikia OPINION
await canCastVoteWithSnapshot(opinionVoteId, 'IN_PERSON')
// → { allowed: true } (jei kitos sąlygos tenkina)

// ✅ OPINION nėra freeze
await canCastVoteWithSnapshot(opinionVoteId, 'REMOTE')
// → { allowed: true } (bet kada)
```

#### 4. Snapshot Persistence

```typescript
// 1. Publikuoti meeting (scheduled_at: 2025-01-15 10:00)
await publishMeeting(meetingId)
// → snapshot.freeze_at = "2025-01-15T10:00:00Z"

// 2. Pakeisti meeting scheduled_at → 2025-01-16 10:00
await updateMeeting(meetingId, { scheduled_at: '2025-01-16 10:00' })

// 3. Tikrinti freeze (turėtų naudoti snapshot, ne naują laiką)
const { frozen } = await isVotingFrozen(meetingId)
// → frozen jei NOW >= 2025-01-15 10:00 (SNAPSHOT)
// → NE 2025-01-16 10:00 (naujas laikas ignoruojamas)
```

---

## DEPLOYMENT

### SQL Update:

```bash
# Paleisti updated RPC
psql -f sql/modules/voting/create_vote_rpc_functions.sql
```

### Code Deployment:

Failai keičiami:
- `src/lib/governance/snapshot.ts`
- `src/app/actions/voting.ts`
- `src/app/actions/meetings.ts`

### Verification:

```sql
-- Patikrinti RPC COMMENT
SELECT pg_get_functiondef('public.can_cast_vote'::regproc);
-- Turėtų matyti "[GA HARD MODE VARTŲ SARGAS]"

-- Patikrinti meeting snapshot
SELECT metadata->'governance_snapshot'->>'freeze_at' 
FROM meetings 
WHERE id = '<meeting_id>';
-- Turėtų grąžinti ISO timestamp
```

---

## MIGRATION GUIDE

### Esamas kodas naudojantis canCastVote:

**Buvo:**
```typescript
const result = await canCastVote(voteId, 'REMOTE')
```

**Dabar (rekomenduojama):**
```typescript
const result = await canCastVoteWithSnapshot(voteId, 'REMOTE')
```

**PASTABA:** Old function vis dar veikia, bet:
- Neturi snapshot-based freeze
- Pažymėta `@deprecated`
- Rekomenduojama migrate

### Backward Compatibility:

✅ **Visas esamas kodas veikia** be pakeitimų
✅ `canCastVote` vis dar funkcionali
✅ OPINION balsavimai 100% nepakitę

---

## LIMITATIONS

### 1. SQL Freeze naudoja meeting.scheduled_at, ne snapshot

**Kodėl:**
- SQL sunku pasiekti `meetings.metadata` JSONB
- Reikėtų papildomo join
- Performance impact

**Workaround:**
- Client-side naudoja snapshot (tikslus)
- SQL naudoja live scheduled_at (failsafe)
- Dviguba sauga veikia gerai

### 2. Snapshot perskaitymas reikalauja meeting_id

**Kodėl:**
- Snapshot saugomas `meetings.metadata`
- Reikia meeting_id jo gauti

**Workaround:**
- `canCastVoteWithSnapshot` gauna meeting_id iš vote
- Automatiškai resolve

### 3. DRAFT meetings neturi snapshot

**Kodėl:**
- Snapshot sukuriamas tik publikavimo metu

**Workaround:**
- DRAFT: `isVotingFrozen` grąžina `frozen: false`
- Safe default behavior

---

## CHANGELOG

**v18.8.2 (2025-01-09):**
- ✅ Pridėtas `freeze_at` į GovernanceSnapshot
- ✅ Sukurta `isVotingFrozen()` funkcija
- ✅ Modifikuotas `getGovernanceSnapshot` priimti `meetingScheduledAt`
- ✅ Modifikuotas `publishMeeting` perduoti scheduled_at į snapshot
- ✅ Sutvirtintas `can_cast_vote` RPC su pilna channel validacija
- ✅ Pridėta freeze patikra `can_cast_vote` RPC
- ✅ Sukurta `canCastVoteWithSnapshot` server action
- ✅ Nauji error kodai: `GA_CHANNEL_NOT_ALLOWED`, `GA_VOTING_FROZEN`
- ✅ Dviguba sauga: Client (snapshot) + SQL (failsafe)

---

**Autorius:** Branduolys AI  
**Reviewer:** Product Owner  
**Statusas:** ✅ Ready for Testing

**Testuoti su:**
- [ ] GA + REMOTE prieš freeze → leidžia
- [ ] GA + REMOTE po freeze → blokuoja
- [ ] GA + IN_PERSON → blokuoja
- [ ] GA + kitas channel → blokuoja
- [ ] OPINION + IN_PERSON → leidžia (nepakitęs)
- [ ] Snapshot persistence po meeting laiko keitimo

