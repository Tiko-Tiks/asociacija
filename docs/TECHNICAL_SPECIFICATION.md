# Techninė Specifikacija - Branduolys v18.8

**Versija**: v18.8 – Privacy & Performance Enhanced Edition  
**Statusas**: Code Freeze – Production  
**Tipas**: SaaS / Community OS (Bendruomenių operacinė sistema)  
**Taikymo sritis**: Kaimo ir miestelių bendruomenės (Rural & Small Town Focus)

---

## FILOSOFINIAI PRINCIPAI

### 1. Physical Primacy
- Gyvas susirinkimas yra aukščiausia sprendimų forma
- Sistema nekuria legitimumo – ji jį registruoja, užrakina ir saugo
- Elektroninis balsavimas leidžiamas tik kaip aiškiai numatyta išimtis

### 2. External Guardian
- Branduolys veikia kaip procedūrinis saugiklis
- Sistema techniškai blokuoja veiksmus, prieštaraujančius:
  1. LR teisės aktams
  2. Branduolio Chartijai ir taisyklėms
  3. Mazgo įstatams
  4. Mazgo vidaus taisyklėms

### 3. Constitution First
- Technika paklūsta teisei, ne atvirkščiai
- Visi kritiniai veiksmai turi būti paaiškinami, peržiūrimi ir atsekami

---

## SISTEMOS APIBRĖŽIMAS IR STRUKTŪRA

### Branduolys (Central Hub)
Centrinė infrastruktūra, administruojama asociacijos "Lietuvos Bendruomenių Branduolys".

**Funkcijos**:
- Mazgų akreditavimas ir sertifikavimas
- Procedūrinių standartų kūrimas ir priežiūra
- Teisėtumo ir skaidrumo validacija
- Techninis užrakinimas (Constitution Lock)
- Bendrų kaštų ir resursų arbitražas

**Legitimumo principas**: Branduolio autoritetas kyla iš Mazgų dalyvavimo ir pasitikėjimo, o ne iš techninės galios.

### Mazgas (Community Node)
Autonomiška bendruomenės erdvė.

**Identitetas**:
- Unikalus subdomenas: `https://[slug].asociacija.net`

**Suverenumas**:
- Savarankiška ūkinė, kultūrinė ir organizacinė veikla

**Atsakomybė**:
- Privalomas Chartijos ir Platformos taisyklių laikymasis
- Procedūrinis atsekamumas

---

## VALDYMO SKALAVIMAS (Governance Scaling)

Sistema automatiškai adaptuoja valdymo modelį:

- **Iki 15 Mazgų**: Tiesioginė demokratija (1 Mazgas = 1 balsas)
- **Virš 15 Mazgų**: Atstovaujamoji Taryba

**Rinkimų algoritmas**:
- Hare kvota (proporcinis atstovavimas)
- Matematiškai deterministinis, integruotas į Branduolio logiką

**Rotacija**:
- Kas 1 metus
- Siekiant išvengti galios koncentracijos

**Našumo ribos**:
- Optimizuota iki 200 Mazgų
- Viršijus – duomenų šardinimas ir „caching"

---

## INSTITUCINIAI PRINCIPAI IR SAUGUMAS

### Normų hierarchija
Sistema techniškai blokuoja veiksmus, prieštaraujančius:
1. LR teisės aktams
2. Branduolio Chartijai ir taisyklėms
3. Mazgo įstatams
4. Mazgo vidaus taisyklėms

### Techninis užrakinimas (Technical Lock)
**Užrakinami parametrai**:
- Kvorumas
- Kadencijos
- Balsavimo tipai
- Įstatų ir konstitucinių taisyklių tekstai

**Procesas**:
1. Sprendimas Mazge
2. Protokolas
3. Procedūrinė patikra
4. Techninis įgyvendinimas
5. Pakartotinis užrakinimas

**Emergency Override**:
- Tik kritinėmis situacijomis
- MFA
- Visi veiksmai registruojami audit_logs

### Gyvo balsavimo viršenybė
- Gyvas susirinkimas = legitimumas
- Platforma = registras
- Elektroninis balsavimas leidžiamas tik kaip aiškiai numatyta išimtis

### Atsakomybės atskyrimas (Legal Firewall)
**Būsenos**:
- Warning State – rekomendacijos
- Hard Block State – teisinių pažeidimų blokavimas

Galutinį sprendimą visada priima žmogus.

---

## GYVAVIMO CIKLAS

### Onboarding
- Be įstatų – sistema neaktyvi
- DI atlieka pirminę analizę
- Galutinį sprendimą priima Taryba

### Periodinė reakreditacija
- Kas 2–3 metai
- Automatiniai priminimai
- 3 mėn. „Grace Period"
- Pasekmė: laikina suspensija

### Off-boarding
- Pilnas duomenų eksportas (CSV / JSON / PDF)
- „Right to be Forgotten"
- Audito logai išsaugomi

---

## DIRBTINIO INTELEKTO MODULIAI

### Vietinis asistentas
Veikia tik vieno Mazgo ribose.

**Funkcijos**:
- Dokumentų rengimas
- Procedūrų analizė
- Rizikų įžvalgos

**Ribojimai**:
- Jokios sprendimų galios
- Jokio balsų keitimo
- Jokio narių šalinimo

### Global Scout (Radaras)
- ES fondų integracijos
- Vieši duomenys
- Rankinis fallback

### Guardian (Auditorius)
- Analizuoja metaduomenis
- Nerenka turinio
- Zero Trust

---

## FUNKCIONALUMAS (REALIAI ĮGYVENDINTAS)

### Narystė ir drausmė (v17.0)
- Narystės statusai: PENDING / ACTIVE / SUSPENDED / LEFT
- Pareigos ir kadencijos (positions)
- Audituojami statusų keitimai

### Sprendimai (v17.0)
- Nutarimai (resolutions)
- Statusai: DRAFT → APPROVED / REJECTED
- Matomumas: BOARD / MEMBERS / PUBLIC
- Adopted_by / adopted_at

### Veikla ir įsitraukimas
- Renginiai (events)
- Dalyvavimas (event_attendance)
- Fizinio indėlio fiksavimas

### Finansai
- Faktų registras
- Invoice lifecycle
- Open Banking (read-only) – planuojama

---

## TECHNINĖ ARCHITEKTŪRA

### Stack
- **Frontend**: Next.js 14 (App Router), Tailwind CSS
- **Backend**: Supabase (PostgreSQL, RLS)
- **Auth**: Supabase Auth

### Saugumas
- RLS (Row Level Security)
- MFA administratoriams
- Audit logs
- Zero Trust principles

### Prieinamumas
- WCAG 2.2 compliance
- PWA / Offline-first

---

## MISIJA

Sukurti institucinę, o ne „programėlę", skaitmeninę infrastruktūrą bendruomenėms, kurioje:
- tvarka kyla iš standarto
- lyderystė apsaugota nuo piktnaudžiavimo
- technologija tarnauja gyvam bendruomeniškumui

---

## STATUSAS

**Code Freeze** – Production Ready

Dokumentas suderintas su:
- Governance Layer v17.0
- Platformos Chartija v1.1
- Naudojimo taisyklėmis v1.1

Paruoštas gamybai, auditui ir viešam pateikimui.

---

## SCHEMA REFERENCE

- See `docs/ACTUAL_SCHEMA_REFERENCE.md` for current deployed schema
- Current schema uses `meetings` table (not `events`)
- All tables, columns, and relationships documented

