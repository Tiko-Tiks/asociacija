# Kaip atnaujinti consolidated_all.sql

Šis failas aprašo, kaip atnaujinti `consolidated_all.sql` su dabartine duomenų bazės struktūra.

## Greitas būdas (PowerShell)

Atidarykite PowerShell ir paleiskite:

```powershell
# 1. Eikite į projekto katalogą
cd C:\Users\Administrator\Branduolys

# 2. Paleiskite pg_dump (jūsų bus prašoma įvesti connection details)
pg_dump -h <your-supabase-host> -U postgres -d postgres --schema=public --no-owner --no-acl > sql/consolidated_all.sql
```

**Jūsų Supabase connection details:**
- Eikite į Supabase Dashboard > Project Settings > Database
- Ten rasite connection string su host, user, password

## Metodai

### Metodas 1: Naudojant Supabase CLI (Rekomenduojama)

Jei turite Supabase CLI įdiegtą:

```bash
# Įdiekite Supabase CLI (jei dar neturite)
npm install -g supabase

# Atnaujinkite schemą
supabase db dump --schema public > sql/consolidated_all.sql
```

### Metodas 2: Naudojant pg_dump

Jei turite PostgreSQL client tools:

```bash
pg_dump -h <your-supabase-host> \
        -U postgres \
        -d postgres \
        --schema=public \
        --no-owner \
        --no-acl \
        > sql/consolidated_all.sql
```

**Pavyzdys:**
```bash
pg_dump -h db.xxxxx.supabase.co \
        -U postgres \
        -d postgres \
        --schema=public \
        --no-owner \
        --no-acl \
        > sql/consolidated_all.sql
```

Jūsų Supabase connection string galite rasti:
- Supabase Dashboard > Project Settings > Database > Connection string

### Metodas 3: Naudojant Supabase Dashboard SQL Editor

1. Eikite į Supabase Dashboard > SQL Editor
2. Paleiskite šį SQL skriptą: `sql/dump_full_schema.sql`
3. Nukopijuokite rezultatus ir įrašykite į `sql/consolidated_all.sql`

**Pastaba:** Šis metodas gali būti ne toks tikslus kaip `pg_dump`, nes negeneruoja visų CREATE statements automatiškai.

## Kada atnaujinti?

Atnaujinkite `consolidated_all.sql` kai:
- Pridedate naują lentelę
- Pridedate naują funkciją (RPC)
- Pridedate naują RLS policy
- Pridedate naują view
- Pridedate naują enum type
- Keičiate esamų objektų struktūrą

## Patikrinimas

Po atnaujinimo patikrinkite:
1. Ar failas yra teisingai suformatuotas
2. Ar visos lentelės yra įtrauktos
3. Ar visos funkcijos yra įtrauktos
4. Ar visos RLS policies yra įtrauktos

## Pastabos

- `--no-owner` flagas pašalina OWNER komandas (reikalinga, kad būtų suderinama su skirtingomis duomenų bazėmis)
- `--no-acl` flagas pašalina ACL (Access Control List) komandas
- `--schema=public` nurodo, kad tik `public` schema bus eksportuojama

