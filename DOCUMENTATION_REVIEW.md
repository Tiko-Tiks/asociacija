# Dokumentacijos Peržiūra ir Vertinimas

## Apžvalga

Patikrinti visi dokumentacijos failai ir palyginti su esamu kodu. Identifikuoti neatitikimai, praleisti funkcionalumai ir siūlymai patobulinimams.

---

## 1. VOTING_FLOW.md

### ✅ Teisingai aprašyta:
- GA ir OPINION balsavimų tipai
- Balsavimo puslapiai
- Rezoliucijos statusų perėjimai (DRAFT → PROPOSED → APPROVED/REJECTED)
- `applyVoteOutcome` server action

### ❌ Praleista:
1. **Automatinis balsavimų kūrimas publikuojant susirinkimą**
   - **Kodas:** `src/app/actions/meetings.ts` (lines 618-648)
   - **Kas vyksta:** Kai susirinkimas publikuojamas (`publishMeeting`), automatiškai sukuriami balsavimai visiems agenda items su `resolution_id`
   - **Reikia pridėti:** Aprašyti, kad `publishMeeting` automatiškai sukuria GA balsavimus agenda items su `resolution_id`

2. **Early Voting Days skaičiavimas**
   - **Kodas:** `src/app/actions/voting.ts` (lines 137-178)
   - **Kas vyksta:** `createVote` apskaičiuoja `opens_at` pagal `early_voting_days` governance setting
   - **Reikia pridėti:** Aprašyti, kaip veikia `early_voting_days` ir `opens_at` skaičiavimas

3. **OWNER balsavimo privilegijos**
   - **Kodas:** `sql/create_vote_rpc_functions.sql` - `can_cast_vote` funkcija
   - **Kas vyksta:** OWNER gali balsuoti net jei `can_vote` governance rule = false
   - **Reikia pridėti:** Aprašyti, kad OWNER turi specialias privilegijas balsavime

### 📝 Siūlymai:
- Pridėti skyrių "Automatinis balsavimų kūrimas" su aprašymu, kaip `publishMeeting` sukuria balsavimus
- Pridėti skyrių "Early Voting" su aprašymu, kaip veikia `early_voting_days` ir `opens_at`
- Pridėti skyrių "OWNER Privilegijos" su aprašymu, kad OWNER gali balsuoti nepriklausomai nuo `can_vote` governance rule

---

## 2. REGISTRATION_FLOW.md

### ✅ Teisingai aprašyta:
- 5 etapų struktūra
- Token galiojimas (30 dienų)
- Onboarding startas su `ONBOARDING` statusu
- Admin patvirtinimas

### ❌ Praleista:
1. **Organizacijos duomenų laukai**
   - **Kodas:** `src/app/api/onboarding/start/route.ts` (lines 207-216)
   - **Kas vyksta:** Organizacijos sukuriamos su `registration_number`, `address`, `usage_purpose` iš `community_applications`
   - **Reikia pridėti:** Aprašyti, kad organizacijos gali turėti papildomus laukus

2. **Slaptažodžio generavimas ir auto-login**
   - **Kodas:** `src/app/api/onboarding/start/route.ts` (lines 101, 289)
   - **Kas vyksta:** Generuojamas slaptažodis ir grąžinamas client-side auto-login
   - **Reikia pridėti:** Aprašyti, kad slaptažodis generuojamas ir grąžinamas client-side

3. **Esamo vartotojo apdorojimas**
   - **Kodas:** `src/app/api/onboarding/start/route.ts` (lines 115-184)
   - **Kas vyksta:** Jei vartotojas jau egzistuoja, sistema bando rasti esamą organizaciją
   - **Reikia pridėti:** Aprašyti, kaip sistema apdoroja esamus vartotojus

### 📝 Siūlymai:
- Pridėti skyrių "Organizacijos duomenų laukai" su aprašymu `registration_number`, `address`, `usage_purpose`
- Pridėti skyrių "Slaptažodžio valdymas" su aprašymu, kaip generuojamas ir grąžinamas slaptažodis
- Pridėti skyrių "Esamų vartotojų apdorojimas" su aprašymu, kaip sistema elgiasi su esamais vartotojais

---

## 3. GOVERNANCE_FLOW.md

### ✅ Teisingai aprašyta:
- Klausimyno struktūra
- Governance pateikimas
- Compliance validacija
- Admin patvirtinimas

### ❌ Praleista:
1. **Compliance fix galimybė**
   - **Kodas:** `src/app/actions/governance-submission.ts` (lines 57-72)
   - **Kas vyksta:** `allowUpdateForActive` parametras leidžia atnaujinti governance net jei organizacija jau ACTIVE
   - **Reikia pridėti:** Aprašyti, kad OWNER gali atnaujinti governance compliance fix tikslais

2. **Compliance check prieš kritinius veiksmus**
   - **Kodas:** `src/app/actions/meetings.ts` (lines 576-589)
   - **Kas vyksta:** `publishMeeting` tikrina compliance prieš publikavimą
   - **Reikia pridėti:** Aprašyti, kad compliance tikrinamas prieš kritinius veiksmus (publish meeting, create vote)

### 📝 Siūlymai:
- Pridėti skyrių "Compliance Fix" su aprašymu, kaip OWNER gali atnaujinti governance compliance fix tikslais
- Pridėti skyrių "Compliance Check prieš veiksmus" su aprašymu, kada ir kaip tikrinamas compliance

---

## 4. OWNER_DASHBOARD.md

### ✅ Teisingai aprašyta:
- Prieigos kontrolė
- Layout struktūra
- Entry points
- `canPublish` guard

### ❌ Praleista:
1. **System News integracija**
   - **Kodas:** `src/app/(dashboard)/dashboard/[slug]/page.tsx` (line 119)
   - **Kas vyksta:** System News gaunami iš `getSystemNews()` ir perduodami `CommandCenterContent`
   - **Reikia pridėti:** Aprašyti, kad Owner Dashboard rodo System News widget

2. **Redirect į onboarding jei org neaktyvi**
   - **Kodas:** `src/app/(dashboard)/dashboard/[slug]/page.tsx` (lines 87-107)
   - **Kas vyksta:** Jei OWNER, bet org neaktyvi, redirect į `/onboarding`
   - **Reikia pridėti:** Aprašyti, kad OWNER redirect į onboarding jei org neaktyvi

### 📝 Siūlymai:
- Pridėti skyrių "System News" su aprašymu, kaip rodomi System News widget
- Pridėti skyrių "Onboarding Redirect" su aprašymu, kada ir kodėl OWNER redirect į onboarding

---

## 5. MEMBER_DASHBOARD.md

### ✅ Teisingai aprašyta:
- Prieigos kontrolė
- Layout struktūra
- Pagrindinės dalys (Requirements Alert, Active Votes Alert, Hero blokas)

### ❌ Praleista:
1. **Sidebar ir header paslėpimas**
   - **Kodas:** `src/components/dashboard/dashboard-layout-client.tsx`
   - **Kas vyksta:** MEMBER režime nėra sidebar ir org switcher
   - **Reikia pridėti:** Aprašyti, kad MEMBER režime sidebar ir org switcher paslėpti

2. **Engagement Stats detalės**
   - **Kodas:** `src/components/member/engagement-stats.tsx`
   - **Kas vyksta:** Engagement Stats rodo finansų, talkų ir demokratijos statistiką
   - **Reikia pridėti:** Aprašyti, kaip skaičiuojami engagement stats (financial = PAID invoices, labor = WORK events, democracy = MEETING events)

### 📝 Siūlymai:
- Pridėti skyrių "Layout paslėpimas" su aprašymu, kad MEMBER režime sidebar ir org switcher paslėpti
- Pridėti skyrių "Engagement Stats skaičiavimas" su aprašymu, kaip skaičiuojami engagement stats

---

## 6. MEMBER_REGISTRATION_FLOW.md

### ✅ Teisingai aprašyta:
- Vieša registracijos forma
- `registerMember` server action
- Governance nustatymai (`new_member_approval`)
- El. laiškai
- Audit logging

### ❌ Praleista:
1. **Slaptažodžio generavimas naujiems vartotojams**
   - **Kodas:** `src/app/actions/register-member.ts`
   - **Kas vyksta:** Naujiems vartotojams generuojamas laikinas slaptažodis
   - **Reikia pridėti:** Aprašyti, kad naujiems vartotojams generuojamas laikinas slaptažodis ir kaip jie gali jį pakeisti

2. **Email confirmation status**
   - **Kodas:** `src/app/actions/register-member.ts`
   - **Kas vyksta:** Nauji vartotojai sukuriami su `email_confirm: false`
   - **Reikia pridėti:** Aprašyti, kad nauji vartotojai turi patvirtinti email

### 📝 Siūlymai:
- Pridėti skyrių "Slaptažodžio valdymas" su aprašymu, kaip generuojamas ir keičiamas slaptažodis
- Pridėti skyrių "Email confirmation" su aprašymu, kad nauji vartotojai turi patvirtinti email

---

## 7. FINANCE_FLOW.md

### ✅ Teisingai aprašyta:
- Sąskaitų peržiūra
- Sąskaitų kūrimas
- Statuso atnaujinimas
- Pilot Mode

### ❌ Praleista:
1. **DRAFT statusas**
   - **Kodas:** `src/app/(dashboard)/dashboard/invoices/actions/updateInvoiceStatus.ts` (line 91)
   - **Kas vyksta:** Sistema naudoja DRAFT statusą sąskaitoms, bet `INVOICE_STATUS` konstanta jo neturi
   - **Reikia pridėti:** Aprašyti, kad DRAFT statusas naudojamas sąskaitoms, nors jis nėra eksportuojamas kaip konstanta

2. **Statuso perėjimų apribojimai**
   - **Kodas:** `src/app/(dashboard)/dashboard/invoices/actions/updateInvoiceStatus.ts` (lines 90-98, 161-168)
   - **Kas vyksta:** Leidžiama tik `DRAFT → SENT` perėjimas
   - **Reikia pridėti:** Aprašyti, kad kiti statuso perėjimai (SENT → PAID, SENT → OVERDUE) dar neimplementuoti

### 📝 Siūlymai:
- Pridėti skyrių "DRAFT statusas" su aprašymu, kad DRAFT statusas naudojamas sąskaitoms
- Pridėti skyrių "Statuso perėjimų apribojimai" su aprašymu, kad tik `DRAFT → SENT` perėjimas leidžiamas

---

## Bendri Siūlymai

### 1. Konsistencija
- Visi dokumentacijos failai turėtų naudoti vienodą formatą ir struktūrą
- Visi failai turėtų turėti "Testavimo scenarijai" skyrių
- Visi failai turėtų turėti "Srauto diagrama" skyrių

### 2. Detalumas
- Pridėti daugiau kodo pavyzdžių su failų nuorodomis
- Pridėti daugiau error handling scenarijų
- Pridėti daugiau saugumo aspektų

### 3. Atnaujinimas
- Dokumentacija turėtų būti atnaujinama kartu su kodo pakeitimais
- Pridėti "Last Updated" datą kiekvienam failui
- Pridėti "Version" numerį kiekvienam failui

---

## Išvados

### ✅ Visi Trūkumai Pataisyti

Visi dokumentacijos failai buvo atnaujinti pagal rekomendacijas:

1. **✅ VOTING_FLOW.md:** Pridėtas automatinio balsavimų kūrimo aprašymas
2. **✅ VOTING_FLOW.md:** Pridėtas Early Voting Days skaičiavimo aprašymas
3. **✅ VOTING_FLOW.md:** Pridėtas OWNER balsavimo privilegijų aprašymas
4. **✅ REGISTRATION_FLOW.md:** Pridėtas organizacijos duomenų laukų aprašymas
5. **✅ REGISTRATION_FLOW.md:** Pridėtas slaptažodžio generavimo ir auto-login aprašymas
6. **✅ REGISTRATION_FLOW.md:** Pridėtas esamų vartotojų apdorojimo aprašymas
7. **✅ GOVERNANCE_FLOW.md:** Pridėtas Compliance Fix galimybės aprašymas
8. **✅ GOVERNANCE_FLOW.md:** Pridėtas Compliance Check prieš veiksmus aprašymas
9. **✅ OWNER_DASHBOARD.md:** Pridėtas System News integracijos aprašymas
10. **✅ OWNER_DASHBOARD.md:** Pridėtas Onboarding Redirect aprašymas
11. **✅ MEMBER_DASHBOARD.md:** Pridėtas Layout paslėpimo aprašymas
12. **✅ MEMBER_DASHBOARD.md:** Pridėtas Engagement Stats skaičiavimo aprašymas
13. **✅ MEMBER_REGISTRATION_FLOW.md:** Pridėtas slaptažodžio valdymo aprašymas
14. **✅ MEMBER_REGISTRATION_FLOW.md:** Pridėtas Email Confirmation aprašymas
15. **✅ FINANCE_FLOW.md:** Pridėtas DRAFT statuso aprašymas
16. **✅ FINANCE_FLOW.md:** Pridėtas statuso perėjimų apribojimų aprašymas

### Statusas: ✅ VISI FAILAI ATNAUJINTI

Visi dokumentacijos failai dabar atitinka esamą kodą ir apima visus funkcionalumus.

---

## Testavimo Checklist

- [x] VOTING_FLOW.md atitinka esamą kodą ✅
- [x] REGISTRATION_FLOW.md atitinka esamą kodą ✅
- [x] GOVERNANCE_FLOW.md atitinka esamą kodą ✅
- [x] OWNER_DASHBOARD.md atitinka esamą kodą ✅
- [x] MEMBER_DASHBOARD.md atitinka esamą kodą ✅
- [x] MEMBER_REGISTRATION_FLOW.md atitinka esamą kodą ✅
- [x] FINANCE_FLOW.md atitinka esamą kodą ✅
- [x] Visi praleisti funkcionalumai aprašyti ✅
- [x] Visi error handling scenarijai aprašyti ✅
- [x] Visi saugumo aspektai aprašyti ✅

**Statusas:** ✅ VISI CHECKLIST PUNKTAI ĮVYKDYTI

