# Community Registration Setup

## Problema

Registracijos gauna email'ą, bet admin nemato registracijų admin puslapyje.

## Sprendimas

### 1. Sukurti `community_applications` Lentelę

Paleiskite SQL migraciją Supabase'e:

1. Eikite į **Supabase Dashboard** → **SQL Editor**
2. Nukopijuokite ir paleiskite: `sql/create_community_applications_table.sql`
3. Patikrinkite, ar lentelė sukurta:
   ```sql
   SELECT * FROM public.community_applications;
   ```

### 2. Patikrinti, ar Registracijos Išsaugomos

Po SQL migracijos:
- Naujos registracijos bus automatiškai išsaugomos į `community_applications` lentelę
- Admin galės matyti registracijas admin puslapyje

### 3. Peržiūrėti Registracijas Admin Puslapyje

1. Eikite į: `https://asociacija.net/admin`
2. Spauskite **"Registracijos"** tab'ą
3. Turėtumėte matyti visas registracijas

### 4. Jei Senos Registracijos Nėra Lentelėje

Jei registracija buvo pateikta prieš lentelės sukūrimą:
- Ji nebus lentelėje (buvo tik email'as)
- Reikia peržiūrėti email'us arba pakartoti registraciją

## SQL Migracija

Failas: `sql/create_community_applications_table.sql`

**Ką daro:**
- Sukuria `community_applications` lentelę
- Prideda RLS policies (admin gali matyti, bet kas gali insert'inti)
- Prideda indexes

**Svarbu:**
- Lentelė turi būti sukurta Supabase'e
- Po sukūrimo, naujos registracijos bus automatiškai išsaugomos

## Admin Funkcionalumas

### Registracijų Peržiūra

- **Tab:** "Registracijos" admin dashboard'e
- **Rodo:** Visas registracijas su statusais
- **Statusai:** PENDING, IN_PROGRESS, APPROVED, REJECTED

### Kitas Žingsnis

Po SQL migracijos:
1. Testuokite naują registraciją
2. Patikrinkite, ar ji atsiranda admin puslapyje
3. Patikrinkite, ar email'ai siunčiami

## Troubleshooting

### Problema: Registracijos vis dar nematomos

**Patikrinkite:**
1. Ar `community_applications` lentelė sukurta?
2. Ar SQL migracija buvo sėkmingai paleista?
3. Patikrinkite Supabase logs

**Sprendimas:**
- Paleiskite SQL migraciją dar kartą
- Patikrinkite, ar nėra sintaksės klaidų

### Problema: "Table doesn't exist"

**Sprendimas:**
- Paleiskite `sql/create_community_applications_table.sql` Supabase SQL Editor'e

### Problema: RLS Block

**Patikrinkite:**
1. Ar esate super admin?
2. Ar RLS policies yra teisingos?

**Sprendimas:**
- Patikrinkite, ar esate super admin (`NEXT_PUBLIC_SUPER_ADMINS`)
- Patikrinkite RLS policies SQL migracijoje

