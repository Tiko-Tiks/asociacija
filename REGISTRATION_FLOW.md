# Bendruomenės registracijos flow - galutinis aprašymas

## Apžvalga

Registracijos procesas sudarytas iš 5 etapų:
1. Pradinė paraiška (vieša forma)
2. Onboarding startas (paskyros sukūrimas)
3. Onboarding žingsniai (governance + sutikimai)
4. Admin patvirtinimas
5. Organizacijos aktyvacija

---

## 1. Pradin? parai?ka

**Failas:** `src/app/register-community/page.tsx`  
**API:** `POST /api/register-community`

Kas vyksta:
- Pateikiama paraiška ir sukuriamas `community_applications` įrašas su `status = PENDING`.
- Generuojamas token ir `token_expires_at` (30 dienų).
- Išsiunčiamas el. laiškas su nuoroda į `/onboarding/continue?token=...`.

**Svarbu:** jei tam pačiam el. paštui jau yra aktyvi paraiška (ne REJECTED) ir token galioja, grąžinamas esamas tokenas.

---

## 2. Onboarding startas

**Failas:** `src/app/onboarding/continue/page.tsx`  
**API:** `POST /api/onboarding/start`

Kas vyksta:
- Patikrinamas token galiojimas.
- Sukuriamas vartotojas, organizacija, profilis, membership:
  - `orgs.status = ONBOARDING`
  - `memberships.role = OWNER`
  - `member_status = ACTIVE`
- Sugeneruojamas laikinas slaptažodis ir išsiunčiamas el. laiškas.
- Vartotojas nukreipiamas į `/dashboard/{slug}/onboarding`.

### Organizacijos duomenų laukai

Organizacijos sukuriamos su papildomais laukais iš `community_applications`:
- `registration_number` - Registracijos numeris
- `address` - Adresas
- `usage_purpose` - Kur bus naudojama platforma

**Kodas:** `src/app/api/onboarding/start/route.ts` (lines 207-216)

### Slaptažodžio valdymas

**Generavimas:**
- Slaptažodis generuojamas naudojant `randomBytes(16)` (`src/app/api/onboarding/start/route.ts`, line 101)
- Slaptažodis grąžinamas client-side auto-login tikslams (line 289)
- Slaptažodis siunčiamas el. laišku vartotojui

**Auto-login:**
- Client gauna slaptažodį iš API atsakymo
- Client automatiškai prisijungia su sugeneruotu slaptažodžiu
- Vartotojas nukreipiamas į `/dashboard/{slug}/onboarding`

### Esamų vartotojų apdorojimas

**Kodas:** `src/app/api/onboarding/start/route.ts` (lines 115-184)

Jei vartotojas jau egzistuoja:
1. Sistema bando rasti esamą vartotoją per `profiles` lentelę
2. Jei rastas, bando rasti esamą organizaciją per `memberships`
3. Jei organizacija rasta, grąžinama esama organizacija (neperkūriama)
4. Jei organizacija nerasta, grąžinama klaida

**Svarbu:**
- Sistema neperkuria vartotojo, jei jis jau egzistuoja
- Sistema bando rasti esamą organizaciją, jei vartotojas jau turi membership

---

## 3. Onboarding žingsniai

**Failas:** `src/components/onboarding/onboarding-wizard.tsx`

Žingsniai:
1. **Governance klausimai** (`governance-step.tsx`)
2. **Privalomi sutikimai** (`consents-step.tsx`)
3. **Laukiama patvirtinimo** (`waiting-step.tsx`)

Governance pateikimas:
**Server action:** `submitGovernanceAnswers`  
Sukuria/atnaujina `governance_configs` ir `org_rulesets` (status: PROPOSED).

---

## 4. Admin patvirtinimas

**Failas:** `src/app/actions/admin/manage-orgs.ts`

Admin patvirtina organizaciją, jei:
- yra governance config
- yra PROPOSED ruleset

Rezultatas:
`orgs.status = ACTIVE`  
`org_rulesets.status = ACTIVE`

---

## 5. Aktyvacija ir prieiga

**Failas:** `src/app/actions/onboarding-status.ts`

Jei `orgs.status = ACTIVE`, onboarding laikomas baigtu ir leidžiama naudoti sistemą.

---

## Token galiojimas

**Galiojimas:** 30 dienų  
**Vieta:** `src/app/api/register-community/route.ts`

---

## Testavimo scenarijai

1. Pateikti paraišką per `/register-community`
2. Atidaryti gautą nuorodą su token
3. Užbaigti onboarding
4. Admin patvirtina
5. Patikrinti, kad `/dashboard/[slug]` veikia
