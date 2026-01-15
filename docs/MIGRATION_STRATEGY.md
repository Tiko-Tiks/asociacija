# Migracijos Strategija: Veikiančios Infrastruktūros Perkėlimas

## Tikslas
Perkelti veikiančią infrastruktūrą į naują, švarią platformą su aiškia struktūra, išlaikant visą funkcionalumą ir duomenis.

## Principai (pagal REPO RULES)

1. **KONSTITUCIJA PIRMIAUSIA** - Joks techninis sprendimas negali apeiti teisinių apribojimų
2. **AUDITAS PRIVALOMAS** - Visi veiksmai turi būti registruojami
3. **IMMUTABILITY** - Patvirtinti nutarimai negali būti keičiami
4. **SERVER ACTIONS ONLY** - Visi duomenų keitimai tik per server actions

## Migracijos Fazių Planas

### FAZĖ 1: Analizė ir Dokumentacija (1-2 dienos)

#### 1.1 Veikiančių Komponentų Inventorizacija
- [ ] Identifikuoti visus veikiančius server actions
- [ ] Identifikuoti visus veikiančius komponentus
- [ ] Identifikuoti visas veikiančias RPC funkcijas
- [ ] Identifikuoti visas veikiančias RLS policies
- [ ] Sukurti priklausomybių diagramą

#### 1.2 Duomenų Bazės Analizė
- [ ] Identifikuoti visas veikiančias lenteles
- [ ] Identifikuoti visas veikiančias funkcijas
- [ ] Identifikuoti visas veikiančias views
- [ ] Identifikuoti visas veikiančias policies
- [ ] Sukurti ER diagramą

#### 1.3 Funkcinių Reikalavimų Dokumentacija
- [ ] Susirinkimų valdymas
- [ ] Balsavimo sistema
- [ ] Nutarimų valdymas
- [ ] Narių valdymas
- [ ] Governance konfigūracija

### FAZĖ 2: Naujos Struktūros Dizainas (2-3 dienos)

#### 2.1 Katalogų Struktūra
```
src/
├── core/                    # Pagrindinė verslo logika
│   ├── governance/          # Governance taisyklės
│   ├── meetings/            # Susirinkimų logika
│   ├── voting/              # Balsavimo logika
│   ├── resolutions/         # Nutarimų logika
│   └── members/             # Narių valdymas
├── infrastructure/          # Infrastruktūra
│   ├── database/            # DB schemos, migracijos
│   ├── rpc/                 # RPC funkcijos
│   ├── rls/                 # RLS policies
│   └── audit/               # Audit logika
├── api/                     # Server actions
│   ├── governance/
│   ├── meetings/
│   ├── voting/
│   ├── resolutions/
│   └── members/
└── ui/                      # UI komponentai
    ├── governance/
    ├── meetings/
    ├── voting/
    ├── resolutions/
    └── members/
```

#### 2.2 Duomenų Bazės Struktūra
```
sql/
├── core/                    # Pagrindinės schemos
│   ├── enums.sql
│   ├── tables.sql
│   ├── indexes.sql
│   └── constraints.sql
├── functions/                # RPC funkcijos
│   ├── governance/
│   ├── meetings/
│   ├── voting/
│   └── resolutions/
├── policies/                 # RLS policies
│   ├── governance/
│   ├── meetings/
│   ├── voting/
│   └── resolutions/
└── migrations/              # Migracijos
    └── 001_initial_schema.sql
```

### FAZĖ 3: Migracijos Scriptų Kūrimas (3-5 dienų)

#### 3.1 Duomenų Bazės Migracija
- [ ] Sukurti `sql/migrations/001_initial_schema.sql` iš `consolidated_all.sql`
- [ ] Išvalyti neteisingas sintaksės klaidas
- [ ] Organizuoti pagal modulius
- [ ] Pridėti komentarus ir dokumentaciją

#### 3.2 Server Actions Migracija
- [ ] Perkelti veikiančius server actions į naują struktūrą
- [ ] Išvalyti nenaudojamus actions
- [ ] Standartizuoti klaidų apdorojimą
- [ ] Pridėti audit logging

#### 3.3 Komponentų Migracija
- [ ] Perkelti veikiančius komponentus į naują struktūrą
- [ ] Išvalyti nenaudojamus komponentus
- [ ] Standartizuoti props ir state management

### FAZĖ 4: Testavimas ir Validacija (2-3 dienos)

#### 4.1 Funkcinis Testavimas
- [ ] Testuoti visus veikiančius scenarijus
- [ ] Patikrinti, ar visi duomenys teisingai migruoti
- [ ] Patikrinti, ar visos funkcijos veikia

#### 4.2 Audito Validacija
- [ ] Patikrinti, ar visi veiksmai registruojami
- [ ] Patikrinti, ar audit logs teisingi

#### 4.3 RLS Validacija
- [ ] Patikrinti, ar visos policies veikia
- [ ] Patikrinti, ar nėra saugumo spragų

### FAZĖ 5: Perjungimas (1 diena)

#### 5.1 Duomenų Backup
- [ ] Sukurti pilną duomenų bazės backup
- [ ] Sukurti failų sistemos backup

#### 5.2 Perjungimas
- [ ] Perjungti į naują struktūrą
- [ ] Patikrinti, ar viskas veikia
- [ ] Monitoriuoti klaidas

#### 5.3 Rollback Planas
- [ ] Paruošti rollback scenarijų
- [ ] Patikrinti, ar backup veikia

## Migracijos Prioritetai

### PRIORITETAS 1 (Kritiniai)
- Susirinkimų valdymas
- Balsavimo sistema
- Nutarimų valdymas
- Narių valdymas

### PRIORITETAS 2 (Svarbūs)
- Governance konfigūracija
- Audit logging
- RLS policies

### PRIORITETAS 3 (Papildomi)
- Projekto valdymas
- Sąskaitų valdymas
- Idejų valdymas

## Rizikos Valdymas

### Rizikos
1. **Duomenų praradimas** - Mitigacija: pilnas backup prieš migraciją
2. **Funkcionalumo praradimas** - Mitigacija: išsamus testavimas
3. **Saugumo spragos** - Mitigacija: RLS policies validacija
4. **Audito praradimas** - Mitigacija: audit logging validacija

### Rollback Planas
1. Atkurti duomenų bazę iš backup
2. Perjungti atgal į seną struktūrą
3. Patikrinti, ar viskas veikia

## Sekimo Metodai

### Checklist
- Naudoti šį dokumentą kaip checklist
- Pažymėti kiekvieną užduotį kaip atliktą

### Versijų Valdymas
- Kiekvienas fazis turėtų būti commit'as
- Naudoti feature branch'us
- Code review prieš merge

## Laiko Įvertinimas

- **FAZĖ 1**: 1-2 dienos
- **FAZĖ 2**: 2-3 dienos
- **FAZĖ 3**: 3-5 dienų
- **FAZĖ 4**: 2-3 dienos
- **FAZĖ 5**: 1 diena

**IŠ VISO**: ~10-15 darbo dienų

## Kitas Žingsnis

Pradėti nuo **FAZĖS 1.1** - Veikiančių Komponentų Inventorizacijos.

