# Governance flow - galutinis aprašymas

## Apžvalga

Governance procesas apima:
1. Klausimyno užpildymą
2. Ruleset sukūrimą (PROPOSED)
3. Compliance validaciją
4. Admin patvirtinimą (ACTIVE)

---

## 1. Klausimynas

**Failai:**
- `src/app/actions/governance-questions.ts`
- `src/components/onboarding/governance-step.tsx`

Klausimai turi:
- `question_key`, `question_text`, `question_type`
- sekcijas (`section`, `section_order`)
- priklausomybes (`depends_on`, `depends_value`)

Validacija:
- privalomi laukai tikrinami prieš pateikimą
- priklausomi klausimai rodomi tik jei tenkinama sąlyga

---

## 2. Governance pateikimas

**Server action:** `submitGovernanceAnswers`

Kas vyksta:
- Atnaujinama arba sukuriama `governance_configs`
- Sukuriamas / atnaujinamas `org_rulesets` su `status = PROPOSED`
- Vykdoma compliance validacija (`validate_governance_for_org`)
- Sukuriami `governance_compliance_issues`

---

## 3. Compliance validacija

**Server action:** `validateOrgCompliance`  
**RPC:** `validate_governance_for_org(p_org_id)`

Statusai:
- `OK` -> leid?iami kritiniai veiksmai
- `NEEDS_UPDATE` -> leid?iama, bet rekomenduojama papildyti
- `INVALID` -> kritiniai veiksmai blokuojami
- `UNKNOWN` -> validacija nepavyko

**Naudojama prieš:**
- susirinkimo publikavimą (`publishMeeting`)
- balsavimo kūrimą (`createVote`)

**Compliance check vyksta:**
- Prieš publikavimą: `src/app/actions/meetings.ts` (lines 576-589)
- Prieš balsavimo kūrimą: `src/app/actions/voting.ts` (lines 123-130)

Jei compliance statusas `INVALID`:
- Kritiniai veiksmai blokuojami
- Rodo klaidos pranešimą su `missing_keys` sąrašu

---

## Compliance Fix (Taisymas)

**Server action:** `submitGovernanceAnswers` (`src/app/actions/governance-submission.ts`, lines 57-72)

OWNER gali atnaujinti governance net jei organizacija jau `ACTIVE`:

**Parametras:** `allowUpdateForActive = true`

**Reikalavimai:**
- Vartotojas turi būti OWNER
- Vartotojas turi turėti aktyvų membership (`member_status = ACTIVE`)

**Naudojimas:**
- Compliance fix tikslais
- Papildyti trūkstamus governance nustatymus
- Ištaisyti compliance klaidas

**Svarbu:**
- Po aktyvacijos governance atsakymai yra read-only (išskyrus compliance fix)
- Compliance fix leidžiamas tik OWNER su aktyviu membership

---

## 4. Admin patvirtinimas

**Server action:** `activateOrganizationAdmin`

Reikalavimai:
- governance config egzistuoja
- PROPOSED ruleset egzistuoja

Rezultatas:
- `orgs.status = ACTIVE`
- `org_rulesets.status = ACTIVE`

---

## Saugumo principai

- Tik OWNER gali pildyti/pateikti governance
- Po aktyvacijos governance atsakymai yra read-only (išskyrus compliance fix)
- RLS taikoma visiems veiksmams

---

## Testavimo scenarijai

1. Užpildyti governance klausimus
2. Pateikti atsakymus
3. Patikrinti compliance statusą
4. Admin patvirtina
5. Organizacija tampa ACTIVE
