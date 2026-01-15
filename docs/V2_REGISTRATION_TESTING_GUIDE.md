# V2 Registracijos Modulio Testavimo Gairės

**STATUS: TESTING GUIDE**  
**VERSION: 2.0**

## Testavimo Strategija

Testuokite nuo paprasčiausio iki sudėtingiausio:
1. **Community Registration** (pradžia)
2. **Onboarding Start** (vartotojo sukūrimas)
3. **Pre-Onboarding Flow** (governance, consents, readiness)
4. **Organization Activation** (admin/board)
5. **Member Registration** (narių registracija)

---

## 1. Community Registration (Pradžia)

### 1.1. Bazinis Testas

**URL**: `/register-community-v2`

**Testavimo žingsniai**:
1. Atidarykite `/register-community-v2` puslapį
2. Užpildykite formą:
   - **Community name**: `Test Bendruomenė V2`
   - **Email**: `test-v2@example.com`
   - **Contact person**: `Test Vartotojas`
   - **Description**: `Test aprašymas`
3. Pateikite formą

**Tikėtini rezultatai**:
- ✅ Forma pateikiama be klaidų
- ✅ Rodomas sėkmės pranešimas
- ✅ Gaunamas el. laiškas su token nuoroda
- ✅ `community_applications` lentelėje sukuriamas įrašas su `status='PENDING'`

**Patikrinimas DB**:
```sql
SELECT id, community_name, email, status, token, token_expires_at, metadata
FROM community_applications
WHERE email = 'test-v2@example.com'
ORDER BY created_at DESC
LIMIT 1;
```

**Tikėtina metadata struktūra**:
```json
{
  "fact": {
    "source": "community_registration_v2",
    "submitted_at": "ISO timestamp",
    "ip_address": "client IP"
  }
}
```

### 1.2. Rate Limiting Testas

**Testavimo žingsniai**:
1. Pateikite 3 paraiškas su tuo pačiu el. paštu per 7 dienas
2. Pabandykite pateikti 4-ąją paraišką

**Tikėtini rezultatai**:
- ✅ Pirmos 3 paraiškos priimamos
- ✅ 4-oji paraiška grąžina HTTP 429 su klaida: "Per daug paraiškų..."
- ✅ `audit_logs` lentelėje yra `RATE_LIMIT_CHECK` įrašai

**Patikrinimas DB**:
```sql
SELECT action, metadata->'fact'->>'decision' as decision, metadata->'fact'->>'email' as email
FROM audit_logs
WHERE action = 'RATE_LIMIT_CHECK'
  AND metadata->'fact'->>'email' = 'test-v2@example.com'
ORDER BY created_at DESC;
```

### 1.3. Esamos Paraiškos Testas

**Testavimo žingsniai**:
1. Pateikite paraišką su el. paštu `test-v2@example.com`
2. Iš karto pateikite antrą paraišką su tuo pačiu el. paštu (prieš token expiry)

**Tikėtini rezultatai**:
- ✅ Grąžinamas esamas token (ne sukuria naujo įrašo)
- ✅ Response turi `existing: true`
- ✅ Grąžinamas `onboardingLink` su esamu token

### 1.4. AI Analysis Testas (Optional)

**Testavimo žingsniai**:
1. Pateikite paraišką su `statutes` lauku užpildytu
2. Patikrinkite metadata

**Tikėtini rezultatai**:
- ✅ `metadata.ai.summary` egzistuoja
- ✅ `metadata.ai.risks` egzistuoja (masyvas)
- ✅ `metadata.ai.disclaimer` = `true`

---

## 2. Onboarding Start

### 2.1. Bazinis Testas

**URL**: `/onboarding/continue?token=<token>`

**Testavimo žingsniai**:
1. Gaukite token iš el. laiško (arba iš DB)
2. Atidarykite `/onboarding/continue?token=<token>`
3. Arba naudokite API: `POST /api/v2/onboarding/start` su `{ "token": "<token>" }`

**Tikėtini rezultatai**:
- ✅ Sukuriamas auth vartotojas (jei neegzistuoja)
- ✅ Sukuriamas `profiles` įrašas
- ✅ Sukuriamas `orgs` įrašas su:
  - `status = 'ONBOARDING'`
  - `metadata.fact.pre_org = true`
- ✅ Sukuriamas `memberships` įrašas su:
  - `role = 'OWNER'`
  - `member_status = 'PENDING'`
- ✅ `community_applications.status` atnaujinamas į `'IN_PROGRESS'`
- ✅ Gaunamas magic link el. laiškas su nuoroda į `/pre-onboarding/{slug}`

**Patikrinimas DB**:
```sql
-- Patikrinkite org
SELECT id, name, slug, status, metadata->'fact'->>'pre_org' as pre_org
FROM orgs
WHERE slug = '<generated-slug>';

-- Patikrinkite membership
SELECT id, org_id, user_id, role, member_status
FROM memberships
WHERE org_id = '<org-id>'
  AND role = 'OWNER';

-- Patikrinkite application
SELECT status
FROM community_applications
WHERE id = '<application-id>';
```

### 2.2. Netinkamo Token Testas

**Testavimo žingsniai**:
1. Pabandykite naudoti netinkamą token
2. Pabandykite naudoti expyrintą token

**Tikėtini rezultatai**:
- ✅ Grąžinama klaida su aiškiu pranešimu
- ✅ `audit_logs` lentelėje yra `INVALID_ONBOARDING_TOKEN` įrašas

---

## 3. Pre-Onboarding Flow

### 3.1. Prieigos Testas

**URL**: `/pre-onboarding/{slug}`

**Testavimo žingsniai**:
1. Prisijunkite kaip OWNER (naudojant magic link)
2. Atidarykite `/pre-onboarding/{slug}`

**Tikėtini rezultatai**:
- ✅ Puslapis atidaromas be klaidų
- ✅ Rodomas Governance žingsnis (jei `status = 'ONBOARDING'`)
- ✅ Rodomas Consents žingsnis (jei `status = 'SUBMITTED_FOR_REVIEW'`)

**Negalimi scenarijai** (turėtų blokuoti):
- ❌ Ne-OWNER vartotojas → 404
- ❌ Ne-PRE_ORG org → 404
- ❌ ACTIVE org → 404

### 3.2. Governance Step Testas

**Testavimo žingsniai**:
1. Užpildykite governance klausimus
2. Pridėkite valdybos narius (jei reikia)
3. Pateikite formą

**Tikėtini rezultatai**:
- ✅ `orgs.metadata.governance.proposed.*` užpildytas
- ✅ `orgs.metadata.governance.proposed.board_members` masyvas sukuriamas
- ✅ `orgs.status` atnaujinamas į `'SUBMITTED_FOR_REVIEW'`
- ✅ `audit_logs` lentelėje yra `GOVERNANCE_PROPOSED` įrašas
- ✅ Puslapis pereina į Consents žingsnį

**Patikrinimas DB**:
```sql
SELECT 
  status,
  metadata->'governance'->'proposed' as proposed_governance
FROM orgs
WHERE id = '<org-id>';
```

### 3.3. Consents Step Testas

**Testavimo žingsniai**:
1. Peržiūrėkite reikalingus sutikimus
2. Priimkite visus sutikimus

**Tikėtini rezultatai**:
- ✅ Rodomi visi reikalingi sutikimai (`CHAIRMAN_REQUIRED_CONSENTS`)
- ✅ Kiekvienas sutikimas gali būti priimtas
- ✅ `member_consents` lentelėje sukuriami įrašai
- ✅ `audit_logs` lentelėje yra `CONSENTS_ACCEPTED` įrašai
- ✅ Puslapis pereina į Readiness žingsnį

**Patikrinimas DB**:
```sql
SELECT consent_type, agreed_at
FROM member_consents
WHERE org_id = '<org-id>'
  AND user_id = '<user-id>';
```

### 3.4. Readiness Step Testas

**Testavimo žingsniai**:
1. Patikrinkite readiness checklist

**Tikėtini rezultatai**:
- ✅ Rodomas readiness checklist su PASS/MISSING indikatoriais
- ✅ Rodomas pranešimas "Laukiama gyvos patvirtinimo sprendimo"
- ✅ Jokių mutacijų (tik skaitymas)

---

## 4. Organization Activation (Admin/Board)

### 4.1. Bazinis Activation Testas

**Testavimo žingsniai**:
1. Sukurkite APPROVED resolution (gyvas sprendimas)
2. Iškvieskite `activateOrganizationV2(orgId, resolutionId)`

**Tikėtini rezultatai**:
- ✅ `orgs.status` atnaujinamas į `'ACTIVE'`
- ✅ `orgs.metadata.fact.pre_org` pašalinamas
- ✅ `orgs.metadata.governance.proposed` perkėlimas į `governance.*`
- ✅ `community_applications.status` atnaujinamas į `'APPROVED'`
- ✅ `audit_logs` lentelėje yra `ORG_ACTIVATED` įrašas

**Patikrinimas DB**:
```sql
SELECT 
  status,
  metadata->'fact'->>'pre_org' as pre_org,
  metadata->'governance' as governance
FROM orgs
WHERE id = '<org-id>';
```

### 4.2. Rejection Testas

**Testavimo žingsniai**:
1. Iškvieskite `rejectOrganizationV2(orgId)`

**Tikėtini rezultatai**:
- ✅ `orgs.status` atnaujinamas į `'DECLINED'`
- ✅ `community_applications.status` atnaujinamas į `'REJECTED'`
- ✅ `audit_logs` lentelėje yra `ORG_REJECTED` įrašas

### 4.3. Preconditions Testas

**Testavimo žingsniai**:
1. Pabandykite aktyvuoti org su netinkamu statusu
2. Pabandykite aktyvuoti be resolution

**Tikėtini rezultatai**:
- ✅ Grąžinama klaida su aiškiu pranešimu
- ✅ Jokių pakeitimų DB

---

## 5. Member Registration

### 5.1. Bazinis Testas (Auto Approval)

**Testavimo žingsniai**:
1. Nustatykite `orgs.metadata.governance.new_member_approval = 'auto'`
2. Registruokite narį per `/c/{slug}` puslapį

**Tikėtini rezultatai**:
- ✅ Sukuriamas `memberships` įrašas su `member_status = 'ACTIVE'`
- ✅ `audit_logs` lentelėje yra `MEMBER_APPROVED_AUTO` įrašas

### 5.2. Chairman Approval Testas

**Testavimo žingsniai**:
1. Nustatykite `new_member_approval = 'chairman'`
2. Registruokite narį

**Tikėtini rezultatai**:
- ✅ Sukuriamas `memberships` įrašas su `member_status = 'PENDING'`
- ✅ OWNER gauna pranešimą
- ✅ `audit_logs` lentelėje yra `MEMBER_PENDING_APPROVAL` įrašas

### 5.3. Consent-Based Testas

**Testavimo žingsniai**:
1. Nustatykite `new_member_approval = 'consent-based'`
2. Registruokite narį

**Tikėtini rezultatai**:
- ✅ Sukuriamas `memberships` įrašas su `member_status = 'PENDING'`
- ✅ `metadata.fact.consent_window_started_at` nustatytas
- ✅ `metadata.fact.consent_window_ends_at` nustatytas (7 dienos)
- ✅ Organizacijos nariai gauna pranešimą
- ✅ `audit_logs` lentelėje yra `MEMBER_CONSENT_WINDOW_STARTED` įrašas

**Patikrinimas DB**:
```sql
SELECT 
  member_status,
  metadata->'fact'->>'consent_window_started_at' as window_start,
  metadata->'fact'->>'consent_window_ends_at' as window_end
FROM memberships
WHERE id = '<membership-id>';
```

### 5.4. PRE_ORG Blocking Testas

**Testavimo žingsniai**:
1. Pabandykite registruoti narį į PRE_ORG organizaciją

**Tikėtini rezultatai**:
- ✅ Grąžinama klaida: "Bendruomenė dar neaktyvi"
- ✅ `audit_logs` lentelėje yra `PRE_ORG_ACCESS_BLOCKED` įrašas
- ✅ Narystė NĖRA sukuriama

---

## 6. Member Decision Flow

### 6.1. Manual Approval Testas

**Testavimo žingsniai**:
1. Turėkite PENDING narį
2. Iškvieskite `approveMemberV2({ membershipId, approvalNote })` kaip autorizuotas vartotojas

**Tikėtini rezultatai**:
- ✅ `member_status` atnaujinamas į `'ACTIVE'`
- ✅ `metadata.fact.approved_at` nustatytas
- ✅ `metadata.fact.approved_by` nustatytas
- ✅ Consent window metadata pašalintas (jei buvo)
- ✅ `audit_logs` lentelėje yra `MEMBER_APPROVED_MANUAL` įrašas
- ✅ Narys gauna patvirtinimo el. laišką

### 6.2. Objection Testas

**Testavimo žingsniai**:
1. Iškvieskite `raiseMemberObjection({ membershipId, objectionReason })`

**Tikėtini rezultatai**:
- ✅ `member_status` lieka `'PENDING'` (NĖRA auto-rejection)
- ✅ `metadata.fact.objections` masyvas sukuriamas/atnaujinamas
- ✅ `audit_logs` lentelėje yra `MEMBER_OBJECTION_RAISED` įrašas

### 6.3. Consent Window End Testas

**Testavimo žingsniai**:
1. Sukurkite membership su `consent_window_ends_at` praėjusiu laiku
2. Palaukite (arba rankiniu būdu nustatykite praėjusį laiką)

**Tikėtini rezultatai**:
- ✅ `member_status` lieka `'PENDING'` (NĖRA auto-approval)
- ✅ Reikia rankinio patvirtinimo

---

## 7. UI Hints Testas

### 7.1. Status Hints Testas

**Testavimo žingsniai**:
1. Patikrinkite narių sąrašą (`/dashboard/{slug}/members`)
2. Patikrinkite member dashboard

**Tikėtini rezultatai**:
- ✅ PENDING nariai rodo "Laukiama patvirtinimo"
- ✅ PENDING su consent window rodo "Prieštaravimo terminas aktyvus (X d.)"
- ✅ ACTIVE su `approved_at` rodo "Patvirtinta"
- ✅ ACTIVE be `approved_at` rodo "Aktyvus"

---

## Testavimo Checklist

### Community Registration
- [ ] Bazinis registracijos testas
- [ ] Rate limiting testas
- [ ] Esamos paraiškos testas
- [ ] AI analysis testas (optional)

### Onboarding
- [ ] Bazinis onboarding start testas
- [ ] Netinkamo token testas

### Pre-Onboarding
- [ ] Prieigos testas
- [ ] Governance step testas
- [ ] Consents step testas
- [ ] Readiness step testas

### Activation
- [ ] Bazinis activation testas
- [ ] Rejection testas
- [ ] Preconditions testas

### Member Registration
- [ ] Auto approval testas
- [ ] Chairman approval testas
- [ ] Consent-based testas
- [ ] PRE_ORG blocking testas

### Member Decision
- [ ] Manual approval testas
- [ ] Objection testas
- [ ] Consent window end testas

### UI
- [ ] Status hints testas

---

## Troubleshooting

### Problema: Token neveikia
**Sprendimas**: Patikrinkite, ar token nėra expyrintas ir ar `community_applications.status` yra `'PENDING'` arba `'IN_PROGRESS'`

### Problema: PRE_ORG neblokuojamas
**Sprendimas**: Patikrinkite, ar `orgs.status = 'ONBOARDING'` ir `metadata.fact.pre_org = true`

### Problema: Consent window auto-approve
**Sprendimas**: Tai neturėtų vykti. Patikrinkite, ar nėra scheduled jobs ar triggerių, kurie tikrina `consent_window_ends_at`

### Problema: Metadata neperkeliamas per activation
**Sprendimas**: Patikrinkite, ar `governance.proposed` egzistuoja ir ar `activateOrganizationV2` funkcija teisingai perkelia metadata

---

## Testavimo Duomenys

### Test Email Accounts
- `test-v2-owner@example.com` - OWNER
- `test-v2-member@example.com` - Member
- `test-v2-admin@example.com` - Admin

### Test Organizations
- `test-bendruomene-v2` - Test organizacija
- `test-pilot-v2` - Pilot organizacija

---

## Sekantis Žingsnis

Po visų testų:
1. Dokumentuokite rastas problemas
2. Patikrinkite audit logs
3. Patikrinkite DB būseną
4. Atlikite cleanup (ištrinkite test duomenis)
