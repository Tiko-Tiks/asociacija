# Balsavimo flow - galutinis aprašymas

## Pagrindinė logika
- Sistema registruoja tik balsavimo rezultatus. Balsai nėra simuliuojami.
- Rezoliucija atnaujinama tik jei jos statusas `PROPOSED`.
- Rezoliucijos statusai keičiasi tik: `DRAFT -> PROPOSED -> (APPROVED | REJECTED)`.
- Po `APPROVED` rezoliucija tampa nekintama (DB trigeriai).
- Perėjimo metu automatiškai nustatomi `adopted_at` ir `adopted_by`.

**Server action:** `applyVoteOutcome` (`src/app/actions/voting.ts`)

Rezultatas:
- `APPROVED`, jei `votes_for > votes_against`
- `REJECTED`, kitu atveju

---

## Balsavimo tipai

1. **GA (General Assembly)**
   - Sukuriamas automatiškai publikavus susirinkimą su `resolution_id`.
   - Pagrindinis kelias: `/dashboard/[slug]/governance/[id]`.

2. **OPINION**
   - Kuriamas rankiniu būdu rezoliucijos puslapyje, jei balsavimo dar nėra.
   - Pagrindinis kelias nariams: `/dashboard/[slug]/voting`.

---

## Automatinis balsavimų kūrimas

**Server action:** `publishMeeting` (`src/app/actions/meetings.ts`, lines 618-648)

Kai susirinkimas publikuojamas (`DRAFT -> PUBLISHED`), sistema automatiškai:
1. Gauna visus agenda items su `resolution_id`
2. Kiekvienam agenda item su `resolution_id` sukuria GA balsavimą
3. Patikrina, ar balsavimas jau egzistuoja (išvengia dublikatų)
4. Sukuria balsavimą su `kind = 'GA'` ir `meeting_id`

**Svarbu:**
- Balsavimai sukuriami tik jei agenda item turi `resolution_id`
- Jei balsavimas jau egzistuoja, jis neperkūriamas
- Klaidos balsavimų kūrime neblokuoja susirinkimo publikavimo (soft-fail)

---

## Early Voting (Ankstyvas balsavimas)

**Server action:** `createVote` (`src/app/actions/voting.ts`, lines 137-178)

Sistema apskaičiuoja `opens_at` datą pagal `early_voting_days` governance setting:

**Logika:**
- Jei `meeting_id` nurodytas:
  - Gaunamas `early_voting_days` iš governance (default: 0)
  - Jei `early_voting_days > 0`: `opens_at = meeting.scheduled_at - early_voting_days`
  - Jei `early_voting_days = 0`: `opens_at = NOW()` (balsavimas atidaromas iškart)
- Jei `meeting_id` nenurodytas (OPINION):
  - `opens_at = NOW()` (balsavimas atidaromas iškart)

**Governance setting:**
- `early_voting_days` - skaičius dienų prieš susirinkimą, kada balsavimas atidaromas
- Default: 0 (balsavimas atidaromas iškart)

---

## OWNER balsavimo privilegijos

**RPC funkcija:** `can_cast_vote` (`sql/create_vote_rpc_functions.sql`)

OWNER turi specialias privilegijas balsavime:
- OWNER gali balsuoti **nepriklausomai** nuo `can_vote` governance rule
- OWNER balsavimas neblokuojamas `can_vote = false` nustatymo
- OWNER turi turėti aktyvų membership (`member_status = ACTIVE`)
- OWNER turi turėti aktyvų balsavimą (`opens_at <= NOW()` ir `closes_at >= NOW()`)

**Logika:**
1. Jei vartotojas yra OWNER → balsavimas leidžiamas (jei membership aktyvus ir balsavimas atidarytas)
2. Jei vartotojas nėra OWNER → tikrinamas `can_vote` governance rule

---

## Balsavimo puslapiai

- Nariai: `/dashboard/[slug]/voting` (aktyvūs balsavimai)
- Rezoliucijos (OWNER/BOARD ir nariai): `/dashboard/[slug]/resolutions`
- Susirinkimų balsavimai: `/dashboard/[slug]/governance/[id]`
- Legacy: `/dashboard/voting` -> redirect į `/dashboard/[slug]/voting`

---

## Testavimo scenarijai

1. **GA balsavimas (automatinis kūrimas)**
   - Sukurti susirinkimą su darbotvarkės klausimu (`resolution_id`)
   - Publikuoti susirinkimą (`publishMeeting`)
   - Patikrinti, ar GA balsavimas automatiškai atsirado
   - Patikrinti, ar `opens_at` apskaičiuotas pagal `early_voting_days`

2. **OPINION balsavimas**
   - Atidaryti rezoliuciją
   - Jei balsavimo nėra, sukurti OPINION
   - Patikrinti, ar nariai gali balsuoti

3. **OWNER privilegijos**
   - Prisijungti kaip OWNER
   - Bandyti balsuoti, kai `can_vote = false`
   - Patikrinti, kad OWNER gali balsuoti nepaisant `can_vote` nustatymo

4. **Early Voting**
   - Nustatyti `early_voting_days = 7`
   - Sukurti susirinkimą su data po 7 dienų
   - Publikuoti susirinkimą
   - Patikrinti, kad balsavimas atidarytas iškart (jei `early_voting_days = 0`)

5. **Rezultato taikymas**
   - Uždaryti balsavimą
   - Taikyti rezultatą
   - Rezoliucijos statusas tampa `APPROVED` arba `REJECTED`
