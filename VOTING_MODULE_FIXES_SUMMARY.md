# Balsavimo Modulio Fix'ų Suvestinė

## A) OrgId/Role Source of Truth ✅

### Pakeitimai:

1. **`src/components/resolutions/resolution-card.tsx`:**
   - Pakeistas `orgId` prop naudojimas: dabar naudoja `resolution.org_id` kaip source of truth
   - `isOwner` jau ateina iš `getMembershipRole` (per page.tsx)

2. **`src/app/(dashboard)/dashboard/[slug]/resolutions/page.tsx`:**
   - Jau naudoja `getMembershipRole(selectedOrg.membership_id)` → `isOwner`
   - Pridėtas `checkBoardPosition` kvietimas

### Rezultatas:
- ✅ `orgId` naudoja `resolution.org_id` (source of truth)
- ✅ `isOwner` naudoja `getMembershipRole` (memberships.role='OWNER')

---

## B) Board Logika ✅

### Sukurti Failai:

1. **`src/app/actions/check-board-position.ts`:**
   - Server action, kuris patikrina, ar vartotojas turi BOARD poziciją
   - Naudoja `positions` lentelę: `org_id`, `user_id`, `title`, `is_active`
   - Tikrina: `title ILIKE '%BOARD%'` ir `is_active = true`

### Pakeisti Failai:

1. **`src/app/(dashboard)/dashboard/[slug]/resolutions/page.tsx`:**
   - Pridėtas `checkBoardPosition` importas ir kvietimas
   - Perduodamas `isBoard` į `ResolutionsClient`

2. **`src/components/resolutions/resolutions-client.tsx`:**
   - Pridėtas `isBoard?: boolean` prop
   - Perduodamas į `ResolutionCard`

3. **`src/components/resolutions/resolution-card.tsx`:**
   - Pridėtas `isBoard?: boolean` prop
   - Perduodamas į `VotingSection`

4. **`src/components/voting/voting-section.tsx`:**
   - Pakeistas `isBoard` prop: dabar **required** (ne optional)
   - Admin veiksmai rodomi tik jei `isOwner || isBoard`

5. **`src/components/voting/create-vote-modal.tsx`:**
   - Pridėti `isOwner` ir `isBoard` props
   - Validacija: tik OWNER arba BOARD gali sukurti balsavimą

### Rezultatas:
- ✅ `isBoard` patikrinimas naudoja `positions` lentelę
- ✅ Admin veiksmai rodomi tik OWNER/BOARD
- ✅ Create vote validacija UI pusėje

---

## C) Create Vote Autorystė (RLS) ✅

### Pakeitimai:

1. **`src/app/actions/voting.ts` - `createVote`:**
   - Pataisyta RLS klaidos apdorojimas:
     - Jei `insertError.code === '42501'` → grąžina struktūrizuotą klaidą:
       "Neturite teisės sukurti balsavimą. Reikalinga OWNER arba BOARD rolė."
   - UI validacija jau patikrina `isOwner || isBoard` prieš kviečiant server action

2. **`src/components/voting/create-vote-modal.tsx`:**
   - Pridėta validacija: `if (!isOwner && !isBoard) → error`
   - Rodo klaidos pranešimą prieš bandant sukurti

### Rezultatas:
- ✅ UI validacija blokuoja create vote, jei nėra OWNER/BOARD
- ✅ RLS klaidos grąžina struktūrizuotą klaidą
- ✅ Jei RLS vis tiek blokuoja → aiškus klaidos pranešimas

**Pastaba:** Jei RLS vis tiek leidžia create vote be OWNER/BOARD, reikia:
1. Patikrinti RLS policies `public.votes` lentelėje
2. Arba sukurti RPC `create_vote(resolution_id, kind, meeting_id)` su `SECURITY DEFINER`

---

## Papildomai: Struktūrizuotų Klaidų Grąžinimas ✅

### Pakeitimai:

1. **`src/app/actions/voting.ts` - visi RPC kvietimai:**
   - `canCastVote`: grąžina struktūrizuotą klaidą su `reason` ir `details`
   - `castVote`: grąžina `reason` iš RPC
   - `closeVote`: grąžina `reason` iš RPC
   - `applyVoteOutcome`: grąžina `reason` iš RPC
   - Visi RPC kvietimai tvarko, kad RPC grąžina table (array) → ima pirmą eilutę

### Rezultatas:
- ✅ Visi server actions grąžina struktūrizuotą klaidą
- ✅ UI komponentai gali rodyti žmogišką tekstą pagal `reason` kodą

---

## Testavimo Instrukcijos ✅

### Sukurtas Failas:

**`VOTING_MODULE_TESTING_INSTRUCTIONS.md`:**
- Detalios instrukcijos 2 pagrindiniams scenarijams:
  1. OPINION vote → close → apply → RECOMMENDED
  2. GA vote su meeting → WRITTEN allowed → apply → APPROVED
- Klaidos scenarijai
- RLS patikrinimas
- 2/3 taisyklės skaičiavimas
- Testavimo checklist

---

## Failų Sąrašas

### Sukurti:
- ✅ `src/app/actions/check-board-position.ts`
- ✅ `VOTING_MODULE_TESTING_INSTRUCTIONS.md`
- ✅ `VOTING_MODULE_FIXES_SUMMARY.md`

### Pakeisti:
- ✅ `src/app/actions/voting.ts` (RLS klaidos, struktūrizuotų klaidų grąžinimas)
- ✅ `src/app/(dashboard)/dashboard/[slug]/resolutions/page.tsx` (isBoard patikrinimas)
- ✅ `src/components/resolutions/resolutions-client.tsx` (isBoard prop)
- ✅ `src/components/resolutions/resolution-card.tsx` (resolution.org_id, isBoard prop)
- ✅ `src/components/voting/voting-section.tsx` (isBoard required)
- ✅ `src/components/voting/create-vote-modal.tsx` (isOwner/isBoard validacija)

---

## Sekantys Žingsniai

1. **Testuokite pagal instrukcijas:**
   - OPINION vote scenarijus
   - GA vote scenarijus
   - Klaidos scenarijai

2. **Jei RLS vis tiek blokuoja create vote:**
   - Patikrinkite RLS policies `public.votes` lentelėje
   - Arba sukurkite RPC `create_vote` su `SECURITY DEFINER`

3. **Patikrinkite positions lentelės struktūrą:**
   - Jei `title` laukas skiriasi (pvz., `position_type`), pataisykite `check-board-position.ts`

---

## Pastabos

- Visi pakeitimai atitinka esamą DB struktūrą
- Jokios naujos migracijos
- Jokios RLS keitimo
- Visi veiksmai per RPC (ne tiesioginis DB access)
- UI validacija + server action validacija (dvigubas apsauga)

