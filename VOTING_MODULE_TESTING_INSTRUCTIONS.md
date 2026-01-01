# Balsavimo Modulio Testavimo Instrukcijos

## Testavimo Scenarijai

### 1. OPINION Vote → Close → Apply → RECOMMENDED

**Tikslas:** Patikrinti, ar OPINION balsavimas tinkamai keičia rezoliucijos statusą į RECOMMENDED.

**Žingsniai:**

1. **Sukurkite rezoliuciją:**
   - Eikite į `/dashboard/[slug]/resolutions`
   - Sukurkite naują rezoliuciją (DRAFT arba PROPOSED status)

2. **Sukurkite OPINION balsavimą:**
   - Resolution card'e matysite "Sukurti balsavimą" mygtuką (tik OWNER/BOARD)
   - Pasirinkite "OPINION (Nuomonės Apklausa)"
   - **Nepasirinkite meeting** (OPINION nereikalauja)
   - Spauskite "Sukurti"

3. **Balsuokite:**
   - Kaip narys (ne OWNER/BOARD), matysite balsavimo formą
   - Pasirinkite: FOR, AGAINST arba ABSTAIN
   - Spauskite "Balsuoti"
   - Patikrinkite, ar balsas užregistruotas (suvestinėje matysite skaičius)

4. **Uždarykite balsavimą:**
   - Kaip OWNER/BOARD, matysite "Uždaryti balsavimą" mygtuką
   - Spauskite jį
   - Patikrinkite, ar balsavimas uždarytas (status = CLOSED)

5. **Pritaikykite rezultatą:**
   - Matysite "Pritaikyti rezultatą" mygtuką
   - Spauskite jį
   - **Tikėtinas rezultatas:**
     - Jei 2/3 taisyklė praėjo (3×FOR ≥ 2×(FOR+AGAINST)):
       - Rezoliucijos statusas turėtų pasikeisti į **RECOMMENDED**
       - `recommended_at` ir `recommended_by` turėtų būti užpildyti
     - Jei nepraėjo:
       - Rezoliucijos statusas lieka nepakitęs
       - Matysite klaidos pranešimą "2_3_RULE_NOT_MET"

**Patikrinimas:**
- Rezoliucijos statusas = RECOMMENDED (jei praėjo)
- `recommended_at` užpildytas
- `recommended_by` užpildytas (current user ID)

---

### 2. GA Vote su Meeting → WRITTEN Allowed → Apply → APPROVED

**Tikslas:** Patikrinti, ar GA balsavimas su meeting tinkamai keičia rezoliucijos statusą į APPROVED, ir ar early voting (WRITTEN) veikia.

**Prieš testavimą:**

1. **Sukurkite susirinkimą:**
   - Eikite į governance/susirinkimai
   - Sukurkite naują susirinkimą (meeting)

2. **Patikrinkite governance config:**
   - `governance_configs.answers->>'early_voting'` turi būti:
     - `'allow_written'` (leidžia raštu)
     - `'allow_remote'` (leidžia nuotoliu)
     - `'allow_all'` (leidžia abu)
   - Jei `'not_applicable'` - early voting neleidžiamas

3. **Sukurkite meeting attendance:**
   - Narys turi turėti `meeting_attendance` įrašą su:
     - `present = true`
     - `mode = 'WRITTEN'` (jei norite testuoti WRITTEN)

**Žingsniai:**

1. **Sukurkite rezoliuciją:**
   - Eikite į `/dashboard/[slug]/resolutions`
   - Sukurkite naują rezoliuciją

2. **Sukurkite GA balsavimą:**
   - Resolution card'e spauskite "Sukurti balsavimą"
   - Pasirinkite "GA (Visuotinis Susirinkimas)"
   - **Pasirinkite meeting** (privaloma)
   - Spauskite "Sukurti"

3. **Balsuokite WRITTEN kanalu:**
   - Kaip narys su `meeting_attendance.present=true` ir `mode='WRITTEN'`
   - Balsavimo formoje pasirinkite kanalą "Raštu" (WRITTEN)
   - Pasirinkite: FOR, AGAINST arba ABSTAIN
   - Spauskite "Balsuoti"
   - **Tikėtinas rezultatas:**
     - Jei `early_voting` leidžia WRITTEN → balsas užregistruotas
     - Jei neleidžia → klaidos pranešimas "EARLY_VOTING_NOT_ALLOWED"

4. **Patikrinkite kvorumą:**
   - Kaip OWNER/BOARD, matysite suvestinę
   - Patikrinkite, ar `meeting_quorum_status(meeting_id)` grąžina `quorum_met = true`
   - Jei ne → balsavimas negali būti patvirtintas

5. **Uždarykite balsavimą:**
   - Spauskite "Uždaryti balsavimą"
   - Patikrinkite suvestinę (UŽ/PRIEŠ/SUSILAIKĖ)

6. **Pritaikykite rezultatą:**
   - Spauskite "Pritaikyti rezultatą"
   - **Tikėtinas rezultatas:**
     - Jei kvorumas pasiektas IR 2/3 taisyklė praėjo:
       - Rezoliucijos statusas turėtų pasikeisti į **APPROVED**
       - `adopted_at` ir `adopted_by` turėtų būti užpildyti (per `approve_resolution` RPC)
     - Jei kvorumas nepasiektas:
       - Klaidos pranešimas "QUORUM_NOT_MET"
     - Jei 2/3 taisyklė nepraėjo:
       - Klaidos pranešimas "2_3_RULE_NOT_MET"

**Patikrinimas:**
- Rezoliucijos statusas = APPROVED (jei viskas praėjo)
- `adopted_at` užpildytas
- `adopted_by` užpildytas
- Kvorumas pasiektas
- 2/3 taisyklė praėjo

---

## Klaidos Scenarijai

### 1. Bandymas balsuoti be teisės

**Testas:**
- Kaip narys be `meeting_attendance` (GA atveju)
- Kaip narys su `member_status != 'ACTIVE'`

**Tikėtinas rezultatas:**
- `can_cast_vote` grąžina `allowed = false`
- Reason: "NOT_PRESENT_IN_MEETING" arba "NO_ACTIVE_MEMBERSHIP"
- UI rodo klaidos pranešimą

### 2. Bandymas sukurti balsavimą be teisės

**Testas:**
- Kaip narys (ne OWNER/BOARD) bandyti sukurti balsavimą

**Tikėtinas rezultatas:**
- UI neturi "Sukurti balsavimą" mygtuko
- Jei bandyti per API → RLS blokuoja (42501)
- Server action grąžina: "Neturite teisės sukurti balsavimą"

### 3. Bandymas uždaryti neuždarytą balsavimą

**Testas:**
- Bandyti pritaikyti rezultatą, kai balsavimas dar OPEN

**Tikėtinas rezultatas:**
- `apply_vote_outcome` grąžina `ok = false`
- Reason: "VOTE_NOT_CLOSED"
- UI rodo klaidos pranešimą

### 4. Bandymas balsuoti uždarytame balsavime

**Testas:**
- Bandyti balsuoti, kai `votes.status = 'CLOSED'`

**Tikėtinas rezultatas:**
- `can_cast_vote` grąžina `allowed = false`
- Reason: "VOTE_NOT_OPEN"
- UI rodo klaidos pranešimą

---

## Struktūrizuotų Klaidų Patikrinimas

Visi server actions grąžina struktūrizuotą klaidą:

```typescript
// can_cast_vote
{
  allowed: boolean,
  reason: string, // "VOTE_NOT_OPEN", "NOT_PRESENT_IN_MEETING", etc.
  details: { ... }
}

// cast_vote, close_vote, apply_vote_outcome
{
  ok: boolean,
  reason: string, // "VOTE_NOT_CLOSED", "QUORUM_NOT_MET", etc.
  ...
}
```

UI komponentai turėtų rodyti žmogišką tekstą pagal `reason` kodą.

---

## RLS Patikrinimas

### Create Vote RLS

**Testas:**
- Kaip narys (ne OWNER/BOARD) bandyti sukurti balsavimą per server action

**Tikėtinas rezultatas:**
- Jei RLS blokuoja → `insertError.code === '42501'`
- Server action grąžina: "Neturite teisės sukurti balsavimą. Reikalinga OWNER arba BOARD rolė."

**Pastaba:** Jei RLS vis tiek leidžia, reikia patikrinti RLS policies arba sukurti RPC `create_vote` su `SECURITY DEFINER`.

---

## 2/3 Taisyklės Skaičiavimas

**Formulė:** `3 × FOR ≥ 2 × (FOR + AGAINST)`

**Pavyzdžiai:**
- FOR=2, AGAINST=1 → `3×2 = 6`, `2×(2+1) = 6` → ✅ PRAĖJO
- FOR=1, AGAINST=1 → `3×1 = 3`, `2×(1+1) = 4` → ❌ NEPRAĖJO
- FOR=3, AGAINST=0 → `3×3 = 9`, `2×(3+0) = 6` → ✅ PRAĖJO

**ABSTAIN neskaičiuojamas** į vardiklį.

---

## Testavimo Checklist

- [ ] OPINION vote sukurtas be meeting
- [ ] OPINION vote → close → apply → RECOMMENDED
- [ ] GA vote sukurtas su meeting
- [ ] GA vote → WRITTEN allowed → balsuota
- [ ] GA vote → close → apply → APPROVED (su kvorumu)
- [ ] Klaidos: balsavimas be teisės
- [ ] Klaidos: create vote be teisės
- [ ] Klaidos: apply outcome be uždarymo
- [ ] Struktūrizuotų klaidų rodymas UI
- [ ] RLS patikrinimas create vote

