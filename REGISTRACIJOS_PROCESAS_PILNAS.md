# Pilnas registracijos procesas – Nariai ir Mazgai/Bendruomenės

## Apžvalga

Branduolys sistemoje yra du pagrindiniai registracijos procesai:
1. **Bendruomenės/Mazgo registracija** – naujos organizacijos sukūrimas
2. **Nario registracija** – esamos bendruomenės nario prisijungimas

---

## 1. BENDRUOMENĖS/MAZGO REGISTRACIJOS PROCESAS

### 1.1. Pradinė paraiška (Vieša forma)

**Vieta:** `/register-community`  
**API:** `POST /api/register-community`  
**Failas:** `src/app/api/register-community/route.ts`

#### Kas vyksta:
1. Vartotojas užpildo registracijos formą su šiais laukais:
   - Bendruomenės pavadinimas (privalomas)
   - Kontaktinis asmuo (neprivalomas)
   - El. paštas (privalomas)
   - Aprašymas (neprivalomas)
   - Registracijos numeris (neprivalomas)
   - Adresas (neprivalomas)
   - Naudojimo tikslas (neprivalomas)

2. Sistema sukuria `community_applications` įrašą:
   - `status = PENDING`
   - Generuojamas unikalus `token` (32 baitai, base64url)
   - `token_expires_at` = dabartinis laikas + 30 dienų

3. El. laiškų siuntimas:
   - **Admin:** informacinis el. laiškas apie naują paraišką
   - **Paraiškos pateikėjas:** patvirtinimo el. laiškas su nuoroda `/onboarding/continue?token=...`

#### Svarbu:
- Jei tam pačiam el. paštui jau yra aktyvi paraiška (ne REJECTED) ir token dar galioja, grąžinamas esamas tokenas
- Token galioja 30 dienų
- Paraiška saugoma prieš paskyros sukūrimą

---

### 1.2. Onboarding startas (Paskyros sukūrimas)

**Vieta:** `/onboarding/continue?token=...`  
**API:** `POST /api/onboarding/start`  
**Failas:** `src/app/api/onboarding/start/route.ts`

#### Kas vyksta:
1. **Token validacija:**
   - Patikrinamas token galiojimas (`token_expires_at`)
   - Jei token nebegalioja, grąžinama klaida

2. **Vartotojo sukūrimas:**
   - Generuojamas laikinas slaptažodis (16 baitų, base64)
   - Sukuriamas Supabase Auth vartotojas:
     - `email_confirm: true` (automatiškai patvirtintas)
     - `user_metadata.full_name` = kontaktinis asmuo arba bendruomenės pavadinimas
     - `user_metadata.registration_source` = 'community_registration'

3. **Esamų vartotojų apdorojimas:**
   - Jei vartotojas jau egzistuoja:
     - Sistema bando rasti esamą vartotoją per `profiles` lentelę
     - Jei rastas, bando rasti esamą organizaciją per `memberships`
     - Jei organizacija rasta, grąžinama esama organizacija (neperkūriama)
     - Jei organizacija nerasta, grąžinama klaida

4. **Profilio sukūrimas:**
   - Sukuriamas `profiles` įrašas su:
     - `id` = vartotojo UUID
     - `full_name` = kontaktinis asmuo arba bendruomenės pavadinimas
     - `email` = el. paštas

5. **Organizacijos sukūrimas:**
   - Generuojamas unikalus `slug` iš bendruomenės pavadinimo
   - Sukuriamas `orgs` įrašas su:
     - `name` = bendruomenės pavadinimas
     - `slug` = unikalus slug
     - `status = ONBOARDING` (svarbu: ne ACTIVE!)
     - `registration_number` (jei pateiktas)
     - `address` (jei pateiktas)
     - `usage_purpose` (jei pateiktas)

6. **Narystės sukūrimas:**
   - Sukuriamas `memberships` įrašas su:
     - `org_id` = naujos organizacijos ID
     - `user_id` = vartotojo ID
     - `role = OWNER`
     - `member_status = ACTIVE`

7. **Paraiškos atnaujinimas:**
   - `community_applications.status` = `IN_PROGRESS`

8. **El. laiškas:**
   - Siunčiamas sveikinimo el. laiškas su:
     - Laikinu slaptažodžiu
     - Nuoroda į `/dashboard/{slug}/onboarding`

9. **Auto-login:**
   - Client gauna slaptažodį iš API atsakymo
   - Client automatiškai prisijungia su sugeneruotu slaptažodžiu
   - Vartotojas nukreipiamas į `/dashboard/{slug}/onboarding`

---

### 1.3. Onboarding žingsniai

**Vieta:** `/dashboard/{slug}/onboarding`  
**Komponentas:** `src/components/onboarding/onboarding-wizard.tsx`

#### Žingsnis 1: Valdymo klausimai

**Komponentas:** `GovernanceStep`  
**Server action:** `submitGovernanceAnswers`  
**Failas:** `src/app/actions/governance-submission.ts`

##### Kas vyksta:
1. Vartotojas užpildo governance klausimus:
   - Valdybos narių skaičius
   - Pirmininko kadencijos pradžia ir trukmė
   - Valdybos kadencijos nustatymai
   - Naujo nario patvirtinimo būdas (`new_member_approval`)
   - Kiti governance parametrai

2. Sistema sukuria/atnaujina:
   - `governance_configs` įrašą su `answers` JSONB
   - `org_rulesets` įrašą su:
     - `status = PROPOSED` (svarbu: ne ACTIVE!)
     - `answers` = governance atsakymai
     - `generated_text` = sugeneruotas ruleset tekstas

3. **Valdybos narių priskyrimas (jei reikia):**
   - Jei `board_member_count > 0`, rodomas `BoardMembersStep`
   - Vartotojas priskiria valdybos narius su termino datomis
   - Sukuriami `board_member_assignments` įrašai

#### Žingsnis 2: Privalomi sutikimai

**Komponentas:** `ConsentsStep`  
**Server action:** `submitConsents`

##### Kas vyksta:
1. Sistema nustato trūkstamus sutikimus pagal governance nustatymus
2. Vartotojas priima visus privalomus sutikimus
3. Sukuriami/atnaujinami `org_consents` įrašai

#### Žingsnis 3: Laukiama patvirtinimo

**Komponentas:** `WaitingStep` + `ReadinessChecklist`

##### Kas vyksta:
1. Sistema patikrina, ar viskas paruošta:
   - Ar yra governance config
   - Ar yra PROPOSED ruleset
   - Ar priimti visi sutikimai
   - Ar (jei reikia) priskirti valdybos nariai

2. Rodo readiness checklist su trūkstamais elementais

3. Laukiama admin patvirtinimo

---

### 1.4. Admin patvirtinimas

**Vieta:** Admin panelė  
**Server action:** `activateOrganization`  
**Failas:** `src/app/actions/admin/manage-orgs.ts`

#### Kas vyksta:
1. Admin peržiūri organizacijos informaciją:
   - Governance atsakymus
   - PROPOSED ruleset
   - Narių skaičių
   - Kitus duomenis

2. Admin patvirtina organizaciją, jei:
   - Yra governance config
   - Yra PROPOSED ruleset

3. Sistema atnaujina:
   - `orgs.status = ACTIVE`
   - `org_rulesets.status = ACTIVE` (PROPOSED → ACTIVE)
   - `community_applications.status = APPROVED`

4. Organizacija tampa pilnai aktyvia ir gali naudoti sistemą

---

### 1.5. Organizacijos statusų perėjimai

```
PENDING (community_applications)
    ↓
ONBOARDING (orgs) - po onboarding start
    ↓
[Onboarding žingsniai]
    ↓
PENDING_REVIEW (efektyvus status) - kai yra governance + PROPOSED ruleset
    ↓
ACTIVE (orgs) - po admin patvirtinimo
```

**Statusų reikšmės:**
- `PENDING` - paraiška pateikta, laukiama onboarding starto
- `ONBOARDING` - organizacija sukurta, vyksta onboarding
- `PENDING_REVIEW` - onboarding baigtas, laukiama admin patvirtinimo
- `ACTIVE` - organizacija patvirtinta ir aktyvi

---

## 2. NARIO REGISTRACIJOS PROCESAS

### 2.1. Vieša registracijos forma

**Vieta:** `/c/{slug}` (bendruomenės viešas puslapis)  
**Komponentas:** `src/components/public/member-registration-form.tsx`  
**Server action:** `registerMember`  
**Failas:** `src/app/actions/register-member.ts`

#### Laukai:
- El. paštas (privalomas)
- Vardas (neprivalomas)
- Pavardė (neprivalomas)

---

### 2.2. Registracijos validacijos

#### 2.2.1. El. pašto validacija
- Formatas turi būti teisingas
- El. paštas normalizuojamas (lowercase, trim)

#### 2.2.2. Organizacijos patikrinimas
- Organizacija turi egzistuoti pagal slug
- Organizacija turi būti `ACTIVE` statuso
- Jei organizacija neaktyvi, registracija blokuojama

#### 2.2.3. Dublikatų patikrinimas
- Jei membership `ACTIVE` → klaida: "Jūs jau esate šios bendruomenės narys"
- Jei membership `PENDING` → klaida: "Jūsų prašymas jau pateiktas ir laukia patvirtinimo"

---

### 2.3. Governance nustatymų patikrinimas

**RPC funkcija:** `get_governance_string(p_org_id, 'new_member_approval', 'chairman')`

#### Galimos reikšmės:
- `auto` → narys aktyvuojamas iš karto (`member_status = ACTIVE`)
- `chairman` → reikia pirmininko patvirtinimo (`member_status = PENDING`)
- `board` → reikia valdybos patvirtinimo (`member_status = PENDING`)
- `members` → reikia narių patvirtinimo (`member_status = PENDING`)

---

### 2.4. Membership sukūrimas

#### 2.4.1. Esamas vartotojas
- Jei vartotojas jau egzistuoja (rastas per `profiles`):
  - Sukuriamas arba atnaujinamas `memberships` įrašas
  - `role = MEMBER`
  - `member_status` = `ACTIVE` arba `PENDING` (pagal governance)

#### 2.4.2. Naujas vartotojas
**SVARBU:** Dabartinėje versijoje (v17.0) nauji vartotojai **negali** būti sukurti per viešą registracijos formą, nes reikia `service_role` teisių.

- Sistema grąžina klaidą: "Nauji vartotojai turi pirmiausia užsiregistruoti. Prašome naudoti registracijos formą."
- Vartotojas turi pirmiausia užsiregistruoti per Supabase Auth registracijos formą

#### 2.4.3. Membership laukai
- `memberships.status` visada `ACTIVE` (nepainiokite su `member_status`)
- `member_status` = `ACTIVE` arba `PENDING` (priklauso nuo governance)

---

### 2.5. Profilio atnaujinimas

Jei pateikti vardas arba pavardė:
- Atnaujinamas `profiles` įrašas su:
  - `full_name` = "Vardas Pavardė"
  - `first_name` = vardas
  - `last_name` = pavardė

---

### 2.6. El. laiškų siuntimas

#### 2.6.1. Nariui
**Funkcija:** `getMemberRegistrationEmail`

**Turinys priklauso nuo `requiresApproval`:**
- Jei `requiresApproval = true`:
  - Informacija apie patvirtinimo procesą
  - Nurodymas laukti patvirtinimo
- Jei `requiresApproval = false`:
  - Sveikinimas
  - Nurodymas prisijungti

**Svarbu:** Visais atvejais nurodoma naudoti "Pamiršau slaptažodį" funkciją prisijungimo puslapyje.

#### 2.6.2. OWNER pranešimas
**Funkcija:** `getMemberRegistrationOwnerNotificationEmail`

- Siunčiamas tik jei `requiresApproval = true`
- Nuoroda į `/dashboard/{slug}/members`
- Informacija apie naują registracijos prašymą

**Pastaba:** Dabartinėje versijoje (v17.0) OWNER el. laiškas gali būti praleistas, nes reikia `service_role` teisių gauti OWNER el. paštą.

---

### 2.7. Audit logging

**Action:** `MEMBER_REGISTRATION`  
**Lentelė:** `audit_logs`

**Įrašas su:**
- `org_id`
- `user_id`
- `action = 'MEMBER_REGISTRATION'`
- `target_table = 'memberships'`
- `target_id` = membership ID
- `new_value` = JSON su email, member_status, requires_approval

**Svarbu:** Audit logging yra soft-fail (klaida neblokuoja proceso).

---

### 2.8. Revalidation

Po sėkmingos registracijos:
- `revalidatePath('/c/{slug}', 'page')` - atnaujinamas viešas puslapis

---

## 3. SVARBŪS SKIRTUMAI IR APRIBOJIMAI

### 3.1. Vartotojo sukūrimas

**Bendruomenės registracija:**
- ✅ Gali sukurti vartotoją (naudojant `service_role`)
- ✅ Automatiškai patvirtina el. paštą (`email_confirm: true`)
- ✅ Generuoja laikiną slaptažodį

**Nario registracija:**
- ❌ Negali sukurti naujo vartotojo (reikia `service_role`)
- ⚠️ Veikia tik su esamais vartotojais
- ⚠️ Nauji vartotojai turi pirmiausia užsiregistruoti per Auth

### 3.2. Statusų valdymas

**Organizacijos:**
- `orgs.status` valdo organizacijos būseną
- `ONBOARDING` → `ACTIVE` per admin patvirtinimą

**Memberships:**
- `memberships.status` visada `ACTIVE` (struktūrinis laukas)
- `member_status` valdo nario būseną (`ACTIVE` arba `PENDING`)

### 3.3. Governance integracija

**Bendruomenės registracija:**
- Governance klausimai užpildomi onboarding metu
- Sukuriamas PROPOSED ruleset
- Admin patvirtina → ACTIVE ruleset

**Nario registracija:**
- Naudoja esamą governance config
- Patikrina `new_member_approval` nustatymą
- Nustato `member_status` pagal governance

---

## 4. TESTAVIMO SCENARIJAI

### 4.1. Bendruomenės registracija

1. **Nauja bendruomenė:**
   - Pateikti paraišką per `/register-community`
   - Atidaryti gautą nuorodą su token
   - Užbaigti onboarding (governance + sutikimai)
   - Admin patvirtina
   - Patikrinti, kad `/dashboard/{slug}` veikia

2. **Esamas vartotojas:**
   - Pateikti paraišką su esamu el. paštu
   - Sistema turi rasti esamą vartotoją
   - Jei organizacija jau egzistuoja, grąžinama esama

### 4.2. Nario registracija

1. **Naujas narys, auto-approval:**
   - `new_member_approval = auto`
   - Membership sukuriamas su `member_status = ACTIVE`
   - Narys gali iš karto naudoti sistemą

2. **Naujas narys, reikia patvirtinimo:**
   - `new_member_approval = chairman`
   - Membership sukuriamas su `member_status = PENDING`
   - OWNER gauna pranešimą
   - OWNER patvirtina per `/dashboard/{slug}/members`

3. **Esamas vartotojas, nauja bendruomenė:**
   - Vartotojas jau turi paskyrą
   - Registruojasi į naują bendruomenę
   - Sukuriamas naujas membership

4. **Dublikatai:**
   - Bandyti registruotis su ACTIVE membership → klaida
   - Bandyti registruotis su PENDING membership → klaida

5. **Neaktyvi bendruomenė:**
   - Bandyti registruotis į ONBOARDING bendruomenę → klaida

---

## 5. TECHNINĖS PASTABOS

### 5.1. Duomenų bazės struktūra

**Lentelės:**
- `community_applications` - paraiškos
- `orgs` - organizacijos
- `memberships` - narystės
- `profiles` - vartotojų profiliai
- `governance_configs` - governance atsakymai
- `org_rulesets` - organizacijos taisyklės
- `org_consents` - sutikimai
- `audit_logs` - audit įrašai

### 5.2. RLS (Row Level Security)

- Visi procesai veikia per RLS politikas
- Admin funkcijos naudoja `service_role` klientą
- Viešos funkcijos naudoja `public` klientą

### 5.3. El. laiškų siuntimas

- Visi el. laiškai siunčiami per `sendEmail` funkciją
- El. laiškai yra soft-fail (klaida neblokuoja proceso)
- El. laiškų šablonai: `src/lib/email-templates.ts`

---

## 6. ŽEMĖLAPIS: VISAS REGISTRACIJOS SRAUTAS

```
┌─────────────────────────────────────────────────────────────┐
│ BENDRUOMENĖS REGISTRACIJA                                    │
└─────────────────────────────────────────────────────────────┘

1. /register-community
   ├─> POST /api/register-community
   ├─> community_applications (PENDING)
   ├─> Token generavimas (30 dienų)
   └─> El. laiškas su nuoroda

2. /onboarding/continue?token=...
   ├─> POST /api/onboarding/start
   ├─> Auth vartotojas (email_confirm: true)
   ├─> profiles
   ├─> orgs (ONBOARDING)
   ├─> memberships (OWNER, ACTIVE)
   └─> Auto-login → /dashboard/{slug}/onboarding

3. /dashboard/{slug}/onboarding
   ├─> Žingsnis 1: Governance
   │   ├─> governance_configs
   │   ├─> org_rulesets (PROPOSED)
   │   └─> board_member_assignments (jei reikia)
   ├─> Žingsnis 2: Sutikimai
   │   └─> org_consents
   └─> Žingsnis 3: Laukiama patvirtinimo

4. Admin panelė
   ├─> activateOrganization
   ├─> orgs.status = ACTIVE
   └─> org_rulesets.status = ACTIVE

┌─────────────────────────────────────────────────────────────┐
│ NARIO REGISTRACIJA                                           │
└─────────────────────────────────────────────────────────────┘

1. /c/{slug}
   ├─> registerMember
   ├─> Validacijos
   ├─> Governance patikrinimas (new_member_approval)
   ├─> memberships (MEMBER, ACTIVE arba PENDING)
   ├─> El. laiškas nariui
   ├─> El. laiškas OWNER (jei reikia patvirtinimo)
   ├─> audit_logs
   └─> revalidatePath
```

---

## 7. SVARBŪS KODŲ FAILAI

### Bendruomenės registracija:
- `src/app/api/register-community/route.ts` - paraiškos API
- `src/app/api/onboarding/start/route.ts` - onboarding startas
- `src/components/onboarding/onboarding-wizard.tsx` - onboarding vedlys
- `src/app/actions/governance-submission.ts` - governance pateikimas
- `src/app/actions/admin/manage-orgs.ts` - admin patvirtinimas

### Nario registracija:
- `src/components/public/member-registration-form.tsx` - registracijos forma
- `src/app/actions/register-member.ts` - registracijos logika

### Bendri:
- `src/lib/email-templates.ts` - el. laiškų šablonai
- `src/lib/email.ts` - el. laiškų siuntimas

---

## 8. GALIMI PATOBULINIMAI

### Dabartiniai apribojimai:
1. **Nario registracija negali sukurti naujo vartotojo**
   - Reikia `service_role` teisių
   - Sprendimas: naudoti Supabase Auth registracijos formą

2. **OWNER el. laiškas gali būti praleistas**
   - Reikia `service_role` teisių gauti OWNER el. paštą
   - Sprendimas: naudoti RPC funkciją arba pridėti el. paštą į profiles

3. **Token galiojimas**
   - 30 dienų gali būti per ilgas arba per trumpas
   - Sprendimas: padaryti konfigūruojamą

---

## 9. IŠVADOS

Registracijos procesas Branduolys sistemoje yra sudėtingas ir apima:

1. **Bendruomenės registracija:**
   - 5 etapų procesas (paraiška → onboarding → patvirtinimas)
   - Pilnas vartotojo, organizacijos ir narystės sukūrimas
   - Governance integracija
   - Admin patvirtinimas

2. **Nario registracija:**
   - Paprastesnis procesas (forma → membership)
   - Governance nustatymų integracija
   - Automatinis arba patvirtinimo reikalaujantis procesas

Abu procesai yra saugūs, auditinami ir atitinka Governance Layer v19.0 reikalavimus.
