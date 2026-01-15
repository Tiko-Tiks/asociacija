# SQL Duomenų Bazės Švarinimas ir Organizavimas

## Tikslas
Sutvarkyti SQL duomenų bazės failus, organizuoti pagal modulius ir pašalinti nenaudojamus failus.

## Dabartinė Situacija

### consolidated_all.sql
- **39 lentelių**
- **71 RPC funkcijų**
- **10 views**
- **92 RLS policies**
- **9 ENUM tipų**

### Kiti SQL Failai (75 failai)
- **create_**: 26 failai (moduliai, funkcijos, policies)
- **check_**: 13 failai (diagnostiniai/testavimo)
- **add_**: 9 failai (migracijos)
- **fix_**: 7 failai (pataisymai)
- **update_**: 3 failai (atnaujinimai)
- **validate_**: 2 failai (validacijos)
- **other**: 12 failai (export, generate, debug, test)

## Organizavimo Planas

### Rekomenduojama Struktūra

```
sql/
├── core/                    # Pagrindinės schemos
│   ├── enums.sql           # ENUM tipai
│   ├── tables.sql          # Lentelės
│   ├── indexes.sql         # Indeksai
│   └── constraints.sql     # Constraint'ai
├── modules/                # Moduliai
│   ├── governance/
│   │   ├── tables.sql
│   │   ├── functions.sql
│   │   └── policies.sql
│   ├── meetings/
│   │   ├── tables.sql
│   │   ├── functions.sql
│   │   └── policies.sql
│   ├── voting/
│   │   ├── tables.sql
│   │   ├── functions.sql
│   │   └── policies.sql
│   ├── resolutions/
│   │   ├── tables.sql
│   │   ├── functions.sql
│   │   └── policies.sql
│   └── projects/
│       ├── tables.sql
│       ├── functions.sql
│       └── policies.sql
├── migrations/             # Migracijos (chronologinės)
│   └── YYYYMMDD_description.sql
├── archive/                # Archyvuoti failai
│   ├── check_*.sql         # Diagnostiniai
│   ├── debug_*.sql         # Debug failai
│   ├── test_*.sql          # Test failai
│   └── old_*.sql           # Seni failai
└── consolidated_all.sql    # Pilna schema (backup/reference)

```

## Šalinimo Prioritetai

### PRIORITETAS 1 (Saugu šalinti)
- `check_*.sql` - Diagnostiniai failai (13 failų)
- `debug_*.sql` - Debug failai
- `enable_immediate_voting_*.sql` - Test failai (2 failai)
- `export_*.sql` - Eksporto failai (naudoti tik schema generavimui)
- `generate_*.sql` - Generavimo failai (naudoti tik schema generavimui)
- `get_full_schema.sql` - Schema generavimo failas
- `dump_full_schema.sql` - Schema generavimo failas

### PRIORITETAS 2 (Atsargiai)
- `add_*.sql` - Migracijos (gali būti naudojamos)
- `fix_*.sql` - Pataisymai (gali būti naudojamos)
- `update_*.sql` - Atnaujinimai (gali būti naudojamos)

### PRIORITETAS 3 (Palikti)
- `create_*.sql` - Moduliai (svarbūs)
- `migrate_*.sql` - Migracijos (svarbios)
- `validate_*.sql` - Validacijos (svarbios)
- `enforce_*.sql` - Enforce funkcijos (svarbios)
- `schedule_*.sql` - Schedule funkcijos (svarbios)

## Veiksmų Planas

### FAZĖ 1: Identifikavimas
- [ ] Identifikuoti nenaudojamus failus
- [ ] Identifikuoti diagnostinius failus
- [ ] Identifikuoti test failus

### FAZĖ 2: Archyvavimas
- [ ] Sukurti `sql/archive/` katalogą
- [ ] Perkelti nenaudojamus failus į archive
- [ ] Palikti tik veikiančius failus

### FAZĖ 3: Organizavimas (Ateityje)
- [ ] Sukurti modulių struktūrą
- [ ] Perkelti failus pagal modulius
- [ ] Atnaujinti dokumentaciją

## Atlikti Veiksmai

### ✅ FAZĖ 1: Identifikavimas - BAIGTA
- Identifikuoti nenaudojami failai: 22 failai
- Kategorijos:
  - `check_*.sql`: 12 failų (diagnostiniai)
  - `debug_*.sql`: 1 failas
  - `*test*.sql`: 2 failai
  - `export_*.sql`: 2 failai
  - `generate_*.sql`: 2 failai
  - `enable_immediate_voting*.sql`: 2 failai
  - `get_full_schema.sql`: 1 failas
  - `dump_full_schema.sql`: 1 failas
  - `quick_check_*.sql`: 1 failas

### ✅ FAZĖ 2: Archyvavimas - BAIGTA
- Sukurtas `sql/archive/` katalogas
- Perkelta 22 failai į archive
- Palikti tik veikiančius failus

## Rezultatai

- **Archyvuota**: 22 failai
- **Likę**: ~53 failai (veikiančios migracijos, moduliai, funkcijos)
- **Išvalyta**: Diagnostiniai, test, export, generate failai

## Kitas Žingsnis

Organizuoti likusius failus pagal modulius (FAZĖ 3 - Ateityje).

