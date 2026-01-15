# SQL Migracija - logo_url stulpelis

## Problema
Gaunate klaidą: `Could not find the 'logo_url' column of 'orgs' in the schema cache`

Tai reiškia, kad `logo_url` stulpelis dar nebuvo pridėtas į `orgs` lentelę.

## Sprendimas

### 1. Eikite į Supabase Dashboard
- Atidarykite [Supabase Dashboard](https://app.supabase.com)
- Pasirinkite savo projektą

### 2. Paleiskite SQL migraciją

**Būdas 1: Per SQL Editor (Rekomenduojama)**
1. Eikite į **SQL Editor** (kairėje meniu)
2. Spauskite **"New query"**
3. Atidarykite failą `sql/add_logo_url_to_orgs.sql`
4. Nukopijuokite visą turinį ir įklijuokite į SQL Editor
5. Spauskite **"Run"** arba **Ctrl+Enter**
6. Turėtumėte matyti:
   - Pranešimą: "Success. No rows returned"
   - Patikrinimo rezultatą su `logo_url` stulpelio informacija

**Arba tiesiogiai:**
1. Atidarykite `sql/add_logo_url_to_orgs.sql` failą
2. Nukopijuokite visą SQL kodą
3. Įklijuokite į Supabase SQL Editor
4. Paleiskite

**Būdas 2: Per failą**
1. Atidarykite `sql/add_logo_to_orgs.sql` failą
2. Nukopijuokite visą turinį
3. Eikite į Supabase Dashboard → SQL Editor
4. Įklijuokite ir paleiskite

### 3. Patikrinimas

Patikrinkite, ar stulpelis sukurtas:

```sql
-- Patikrinkite, ar logo_url stulpelis egzistuoja
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'orgs' 
  AND column_name = 'logo_url';
```

Turėtumėte matyti rezultatą su `logo_url` stulpeliu.

### 4. Po migracijos

Po to, kai paleisite migraciją:
1. Bandykite vėl įkelti logotipą
2. Turėtų veikti be klaidų

## Pastaba

Jei vis dar gaunate klaidą po migracijos:
1. Patikrinkite, ar migracija buvo sėkmingai paleista
2. Patikrinkite, ar naudojate teisingą Supabase projektą
3. Bandykite atnaujinti puslapį (hard refresh: Ctrl+F5)
4. Patikrinkite Supabase schema cache - kartais reikia palaukti kelias sekundes

