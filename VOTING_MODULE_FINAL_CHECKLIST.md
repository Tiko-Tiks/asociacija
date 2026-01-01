# Balsavimo Modulio Final Checklist

## ✅ 1. Create Vote RLS Patikrinimas

### Server Action (`src/app/actions/voting.ts` - `createVote`):
- ✅ RLS klaidos apdorojimas: `insertError.code === '42501'` → struktūrizuota klaida
- ✅ Klaidos pranešimas: "RLS klaida: Neturite teisės sukurti balsavimą. Reikalinga OWNER arba BOARD rolė. (error.message)"
- ✅ Visos kitos klaidos taip pat rodo exact error message ir code

### UI Validacija (`src/components/voting/create-vote-modal.tsx`):
- ✅ Validacija prieš kviečiant server action: `if (!isOwner && !isBoard) → error`
- ✅ Rodo exact error iš server action (includes RLS error details)

**Rezultatas:** Jei RLS blokuoja, UI rodo exact error message su code.

---

## ✅ 2. Refetch po Veiksmų

### Po `cast_vote` (`src/components/voting/voting-section.tsx` - `handleVoteCast`):
- ✅ Refetch vote: `getVote(activeVote.id)`
- ✅ Refetch tally: `getVoteTally(activeVote.id)`
- ✅ Atnaujina `activeVote` ir `tally` state

### Po `close_vote` (`src/components/voting/voting-section.tsx` - `handleVoteClosed`):
- ✅ Refetch vote: `getVote(activeVote.id)`
- ✅ Refetch tally: `getVoteTally(activeVote.id)`
- ✅ Atnaujina `activeVote` ir `tally` state

### Po `apply_vote_outcome` (`src/components/voting/voting-section.tsx` - `handleOutcomeApplied`):
- ✅ Refetch vote: `getVote(activeVote.id)`
- ✅ Refetch tally: `getVoteTally(activeVote.id)`
- ✅ Atnaujina `activeVote` ir `tally` state
- ✅ `window.location.reload()` - atnaujina resolution status (APPROVED/RECOMMENDED)

**Rezultatas:** Po visų veiksmų UI atnaujinamas su naujais duomenimis.

---

## ✅ 3. Channel UI Logika

### GA Balsavimai (`src/components/voting/vote-form.tsx`):
- ✅ Preflight check: `can_cast_vote` kviečiamas visiems kanalams (IN_PERSON, WRITTEN, REMOTE)
- ✅ Channel state: `channelChecks` saugo kiekvieno kanalo `allowed`, `reason`, `details`
- ✅ UI rodo kanalus:
  - Enabled: jei `can_cast_vote.allowed = true` tam kanalui
  - Disabled: jei `can_cast_vote.allowed = false` + rodo `reason` ir `details`
- ✅ Kanalas pasirinkimas: tik enabled kanalai pasirenkami

### OPINION Balsavimai:
- ✅ Default: `IN_PERSON` (automatiškai nustatomas)
- ✅ Tik `IN_PERSON` kanalas rodomas
- ✅ Preflight check: tik `IN_PERSON` kanalui

**Rezultatas:** GA kanalai rodomi tik jei `can_cast_vote.allowed=true`, disabled kanalai rodo reason.

---

## ✅ 4. Performance Optimizacija

### VotingSection (`src/components/voting/voting-section.tsx`):
- ✅ **Nėra automatinio refresh** - duomenys kraunami tik:
  - Pirmą kartą (useEffect su `resolutionId` dependency)
  - Po veiksmų (cast/close/apply)
  - Po explicit "Atnaujinti" mygtuko paspaudimo
- ✅ **Explicit Refresh Button:**
  - Rodo "Atnaujinti" mygtuką (OWNER/BOARD)
  - Spauskite → `loadData()` → refetch vote + tally + meetings
- ✅ **Nėra polling/interval** - jokio automatinio refresh

**Rezultatas:** VotingSection ne spam'ina DB - tik explicit refresh arba po veiksmų.

---

## Testavimo Scenarijai

### SCENARIJUS 1: OPINION → RECOMMENDED

**Žingsniai:**
1. Sukurkite rezoliuciją (PROPOSED)
2. Sukurkite OPINION balsavimą (be meeting)
3. Balsuokite kaip MEMBER (FOR/AGAINST/ABSTAIN)
4. Uždarykite balsavimą (OWNER/BOARD)
5. Pritaikykite rezultatą
6. ✅ Patikrinkite: Rezoliucijos statusas = RECOMMENDED (jei 2/3 praėjo)

**Detalės:** `VOTING_MODULE_TESTING_SCRIPT.md`

### SCENARIJUS 2: GA → APPROVED

**Žingsniai:**
1. Sukurkite meeting
2. Sukurkite meeting_attendance (present=true, mode=WRITTEN)
3. Patikrinkite governance_config early_voting (allow_written/allow_remote/allow_all)
4. Sukurkite rezoliuciją (PROPOSED)
5. Sukurkite GA balsavimą (su meeting)
6. Balsuokite WRITTEN kanalu (jei enabled)
7. Uždarykite balsavimą
8. Pritaikykite rezultatą
9. ✅ Patikrinkite: Rezoliucijos statusas = APPROVED (jei kvorumas + 2/3 praėjo)

**Detalės:** `VOTING_MODULE_TESTING_SCRIPT.md`

---

## Failų Sąrašas

### Pakeisti:
- ✅ `src/app/actions/voting.ts` (RLS error handling, refetch logic)
- ✅ `src/components/voting/voting-section.tsx` (refetch po veiksmų, refresh button)
- ✅ `src/components/voting/vote-form.tsx` (channel UI logika, preflight checks)
- ✅ `src/components/voting/create-vote-modal.tsx` (exact error surfacing)

### Sukurti:
- ✅ `VOTING_MODULE_TESTING_SCRIPT.md` (testavimo instrukcijos)

---

## Svarbu

1. **RLS Errors:** Visos RLS klaidos rodo exact error message su code
2. **Refetch:** Po cast/close/apply - refetch vote + tally + resolution status
3. **Channel UI:** GA kanalai enabled/disabled pagal `can_cast_vote.allowed`
4. **Performance:** Nėra automatinio refresh - tik explicit "Atnaujinti" mygtukas

Viskas paruošta testavimui! 🎯

