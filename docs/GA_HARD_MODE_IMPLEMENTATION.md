# GA HARD MODE - Implementacijos dokumentacija

**Versija:** 18.8.1  
**Data:** 2025-01-09  
**Statusas:** ✅ Implemented

---

## APŽVALGA

GA HARD MODE yra procedūrinis užraktas, kuris apibrėžia, kaip leidžiama naudoti esamą balsavimo sistemą GA (Visuotinio narių susirinkimo) balsavimams.

**Prioritetas:**
```
GA HARD MODE > Universal Voting > Default Behavior
```

---

## PAKEITIMAI

### 1. GA_MODE Konfigūracija

**Naujas failas:** `src/lib/config/ga-mode.ts`

**Funkcijos:**
- `getGAMode()` - Gauti dabartinį režimą (TEST | PRODUCTION)
- `isProductionMode()` - Boolean check
- `isTestMode()` - Boolean check
- `canCompleteGA(hasQuorum, hasSignedPDF)` - Validacija
- `logGAMode(context)` - Logging

**Environment variable:**
```bash
GA_MODE=TEST  # arba PRODUCTION
```

**Default:** TEST (saugumas pirmiausia)

**Dokumentacija:** `docs/GA_MODE_CONFIGURATION.md`

---

### 2. RPC Funkcijos (SQL)

#### 2.1. `can_cast_vote` modifikacija

**Failas:** `sql/modules/voting/create_vote_rpc_functions.sql`

**Pridėta GA HARD MODE validacija:**

```sql
-- GA balsavimai NELEIDŽIA individualaus IN_PERSON balsavimo
IF v_vote.kind = 'GA' AND p_channel = 'IN_PERSON' THEN
  RETURN QUERY SELECT 
    false, 
    'GA_IN_PERSON_BLOCKED'::TEXT,
    jsonb_build_object(
      'message', 'GA balsavimai neleidžia individualaus gyvo balsavimo...',
      'allowed_channels', ARRAY['REMOTE', 'WRITTEN'],
      'ga_hard_mode', true
    );
  RETURN;
END IF;
```

**Pozicija:** Po `closes_at` patikrinimo, prieš membership check

**Error kodas:** `GA_IN_PERSON_BLOCKED`

#### 2.2. `cast_vote` modifikacija

**Failas:** `sql/modules/voting/create_vote_rpc_functions.sql`

**Pridėta safety check (double enforcement):**

```sql
-- GA HARD MODE SAFETY CHECK
IF v_vote.kind = 'GA' AND p_channel = 'IN_PERSON' THEN
  RETURN QUERY SELECT false, 'GA_IN_PERSON_BLOCKED'::TEXT;
  RETURN;
END IF;
```

**Pozicija:** Po vote exists check, prieš `can_cast_vote` preflight

**Kodėl double enforcement?**
- Defense in depth
- Apsauga nuo `can_cast_vote` bypass bandymų
- Explicit failsafe

#### 2.3. `set_vote_live_totals` comment update

**Failas:** `sql/modules/voting/create_set_vote_live_totals.sql`

**Atnaujintas COMMENT:**
```sql
'[GA HARD MODE] Sets live voting totals for a GA vote through AGGREGATED input only. 
This is the ONLY way to record live votes for GA - individual IN_PERSON ballots are blocked.'
```

**Funkcionalumas:** Nepakeistas (jau veikė teisingai)

---

### 3. Governance Snapshot

**Naujas failas:** `src/lib/governance/snapshot.ts`

**Funkcijos:**

1. **`getGovernanceSnapshot(orgId)`**
   - Gauti dabartinį governance snapshot
   - Ištraukia `early_voting_days`, `quorum_percentage`, etc.
   - Grąžina `GovernanceSnapshot` objektą

2. **`saveMeetingSnapshot(meetingId, snapshot)`**
   - Išsaugoti snapshot į `meetings.metadata`
   - JSONB formato

3. **`getMeetingSnapshot(meetingId)`**
   - Gauti snapshot iš meeting metadata
   - Fallback: dedukuoti iš `published_at`

4. **`getEarlyVotingDays(orgId, meetingId?)`**
   - Gauti `early_voting_days` iš snapshot arba current governance
   - Jei `meetingId` provided - naudoja snapshot
   - Jei ne - naudoja current governance

**GovernanceSnapshot interface:**
```typescript
{
  early_voting_days: number
  meeting_notice_days: number
  quorum_percentage: number
  can_vote_rules: {
    max_debt?: number
    check_suspensions?: boolean
    check_arrears?: boolean
  }
  snapshot_at: string
  snapshot_source: 'PUBLISH' | 'MANUAL'
}
```

---

### 4. Server Actions Modifikacijos

#### 4.1. `publishMeeting` modifikacija

**Failas:** `src/app/actions/meetings.ts`

**Pridėta po sėkmingo publikavimo:**

```typescript
// GOVERNANCE SNAPSHOT (GA HARD MODE)
const { getGovernanceSnapshot, saveMeetingSnapshot } = await import('@/lib/governance/snapshot')
const snapshot = await getGovernanceSnapshot(meeting.org_id)
await saveMeetingSnapshot(meetingId, snapshot)
```

**Pozicija:** Po `publish_meeting` RPC, prieš votes sukūrimą

**Error handling:** Logina klaidą, bet **neprovaliuoja** publish

#### 4.2. `createVote` modifikacija

**Failas:** `src/app/actions/voting.ts`

**Pakeista `early_voting_days` logika:**

```typescript
// Buvo:
const { data: earlyVotingData } = await supabase.rpc('get_governance_int', {
  p_org_id: resolution.org_id,
  p_key: 'early_voting_days',
  p_default: 0
})

// Dabar:
const { getEarlyVotingDays } = await import('@/lib/governance/snapshot')
const earlyVotingDays = await getEarlyVotingDays(resolution.org_id, input.meeting_id)
```

**Efektas:**
- Jei `meeting_id` yra (GA) → naudoja snapshot
- Jei nėra (OPINION) → naudoja current governance

#### 4.3. `applyVoteOutcomeWithMode` NAUJA FUNKCIJA

**Failas:** `src/app/actions/voting.ts`

**Naujas wrapper su GA HARD MODE support:**

```typescript
export async function applyVoteOutcomeWithMode(
  voteId: string,
  options?: { meetingId?: string; force?: boolean }
): Promise<ApplyVoteOutcomeResult & { ga_mode?: string; test_only?: boolean }>
```

**Logika:**

1. **Patikrina vote.kind**
   - Jei ne 'GA' → standard flow
   - Jei 'GA' → įjungia GA HARD MODE

2. **GA TEST režimas:**
   - Kviečia `apply_vote_outcome` RPC
   - Grąžina rezultatus su `test_only: true`
   - **PASTABA:** RPC vis tiek atnaujina `resolutions.status`, bet TEST rezultatai neturėtų būti laikomi galutiniais

3. **GA PRODUCTION režimas:**
   - Validuoja `canCompleteGA(hasQuorum, hasSignedPDF)`
   - Jei validacija FAIL → grąžina error
   - Jei validacija OK → kviečia RPC ir taiko rezultatus

**Return type praplėstas:**
```typescript
{
  ...ApplyVoteOutcomeResult,
  ga_mode?: 'TEST' | 'PRODUCTION',
  test_only?: boolean  // true jei TEST režimas
}
```

**Old function status:**
- `applyVoteOutcome` pažymėta `@deprecated`
- Rekomenduojama naudoti `applyVoteOutcomeWithMode`

---

## DB PAKEITIMAI

**❌ JOKIŲ DB pakeitimų**

- Naudojamos esamos lentelės
- Naudojami esami stulpeliai
- `meetings.metadata` (JSONB) naudojama snapshot storage
- Jokių RLS pakeitimų

✅ **Code Freeze laikomas**

---

## VALIDATION LOGIKA

### GA Balsavimas NELEIDŽIA:

1. **Individualaus IN_PERSON balsavimo**
   - `can_cast_vote` grąžina `GA_IN_PERSON_BLOCKED`
   - `cast_vote` papildomai blokuoja (safety)
   - Error message aiškus ir informuojantis

2. **PRODUCTION be kvorumo**
   - `canCompleteGA` grąžina `allowed: false`
   - `applyVoteOutcomeWithMode` blokuoja

3. **PRODUCTION be PDF**
   - `canCompleteGA` grąžina `allowed: false`
   - `applyVoteOutcomeWithMode` blokuoja

### GA Balsavimas LEIDŽIA:

1. **REMOTE/WRITTEN balsavimą**
   - `can_cast_vote` leidžia
   - `cast_vote` įrašo normaliai

2. **Agreguotą gyvąjį balsavimą**
   - Per `set_vote_live_totals` RPC
   - Automatinis `live_for_count` skaičiavimas

3. **TEST režimą be reikalavimų**
   - Rezultatai skaičiuojami
   - Teisinės pasekmės netaikytos

---

## ERROR KODAI

### Nauji error kodai:

- **`GA_IN_PERSON_BLOCKED`** - Bandymas balsuoti IN_PERSON GA atveju
- **`PRODUCTION_REQUIREMENTS_NOT_MET`** - PRODUCTION validacija failed

### Error details structure:

```json
{
  "allowed": false,
  "reason": "GA_IN_PERSON_BLOCKED",
  "details": {
    "message": "GA balsavimai neleidžia individualaus gyvo balsavimo...",
    "vote_kind": "GA",
    "channel": "IN_PERSON",
    "allowed_channels": ["REMOTE", "WRITTEN"],
    "ga_hard_mode": true
  }
}
```

---

## TESTING

### Test Scenarios:

1. **GA + IN_PERSON attempt**
   - ✅ Turėtų grąžinti `GA_IN_PERSON_BLOCKED`
   - ✅ Turėtų pasiūlyti REMOTE/WRITTEN

2. **GA + REMOTE**
   - ✅ Turėtų leisti balsuoti normaliai

3. **OPINION + IN_PERSON**
   - ✅ Turėtų leisti balsuoti (nepakitę)

4. **TEST režimas**
   - ✅ Turėtų grąžinti rezultatus
   - ✅ `test_only: true` flag

5. **PRODUCTION be kvorumo**
   - ✅ Turėtų blokuoti su aiškia klaida

6. **Governance snapshot**
   - ✅ Publish → snapshot išsaugotas
   - ✅ createVote → naudoja snapshot

---

## DEPLOYMENT

### Environment setup:

**Development:**
```bash
GA_MODE=TEST
```

**Staging:**
```bash
GA_MODE=TEST
```

**Production:**
```bash
GA_MODE=PRODUCTION
```

### SQL Deployment:

Paleisti:
```sql
sql/modules/voting/create_vote_rpc_functions.sql
sql/modules/voting/create_set_vote_live_totals.sql
```

**SVARBU:** Tai REPLACE funkcijos - perašo esamas

### Verification:

1. Patikrinti `can_cast_vote` turi GA HARD MODE check
2. Patikrinti `cast_vote` turi safety check
3. Patikrinti `GA_MODE` env variable nustatyta

---

## LIMITATIONS & FUTURE WORK

### Current Limitations:

1. **TEST režimas vis tiek taiko RPC pakeitimus**
   - RPC `apply_vote_outcome` vis tiek UPDATE resolutions.status
   - Reikėtų wrapper logikos atstatyti status po TEST
   - Arba modifikuoti RPC priimti `p_dry_run` (Code Freeze draudžia)

2. **Quorum calculation**
   - Kol kas hardcoded `hasQuorum = !!meeting`
   - Reikia proper quorum skaičiavimo
   - Planuojama v18.9

3. **PDF validation**
   - Tik tikrina ar `protocol_pdf_url` exists
   - Nėra signature validation
   - Planuojama v18.9

### Future Enhancements:

1. **Dry run RPC parameter**
   - Modifikuoti `apply_vote_outcome` priimti `p_dry_run BOOLEAN`
   - TEST režimu naudoti dry run
   - Reikia atšaukti Code Freeze

2. **Quorum calculation RPC**
   - Sukurti `calculate_meeting_quorum(meeting_id)`
   - Naudoti `applyVoteOutcomeWithMode`

3. **PDF signature verification**
   - Integruoti digital signature check
   - Storage layer validation

---

## ROLLBACK PLAN

Jei reikia grįžti atgal:

1. **SQL Rollback:**
   ```sql
   -- Restore old versions:
   -- git checkout HEAD~1 sql/modules/voting/create_vote_rpc_functions.sql
   -- Deploy old version
   ```

2. **Code Rollback:**
   - Remove `src/lib/config/ga-mode.ts`
   - Revert `src/app/actions/voting.ts` changes
   - Revert `src/app/actions/meetings.ts` changes

3. **Environment:**
   ```bash
   # No change needed - default is TEST
   ```

**PASTABA:** Rollback nesugadins duomenų - visi pakeitimai logikos lygmenyje

---

## CHANGELOG

**v18.8.1 (2025-01-09):**
- ✅ Pridėtas GA_MODE konfigūracija (TEST | PRODUCTION)
- ✅ Modifikuotas `can_cast_vote` - blokuoja GA + IN_PERSON
- ✅ Modifikuotas `cast_vote` - double enforcement
- ✅ Atnaujintas `set_vote_live_totals` comment
- ✅ Implementuotas governance snapshot mechanizmas
- ✅ Modifikuotas `publishMeeting` - išsaugo snapshot
- ✅ Modifikuotas `createVote` - naudoja snapshot
- ✅ Sukurtas `applyVoteOutcomeWithMode` - TEST vs PRODUCTION
- ✅ Dokumentacija: GA_MODE_CONFIGURATION.md
- ✅ Dokumentacija: VOTING_FLOW_SPECIFICATION.md v18.8.1

---

**Autorius:** Branduolys AI  
**Reviewer:** Product Owner  
**Statusas:** ✅ Ready for Testing

**Testuoti su:**
- [ ] GA susirinkimas TEST režimu
- [ ] GA susirinkimas PRODUCTION režimu
- [ ] OPINION balsavimas (turėtų būti nepakitęs)
- [ ] Governance snapshot persistence

