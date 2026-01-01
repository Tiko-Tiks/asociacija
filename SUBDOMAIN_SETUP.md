# Subdomenų Konfigūracija

## Apžvalga

Sistema naudoja subdomenus kaip organizacijų identifikatorius. Kiekviena organizacija turi unikalų `slug`, kuris naudojamas URL'e kaip `/c/[slug]`.

## Dabartinė Konfigūracija

### 1. Route Struktūra

- **Public Community Page:** `/c/[slug]` → `src/app/c/[slug]/page.tsx`
- **Dashboard:** `/dashboard/[slug]` → `src/app/(dashboard)/dashboard/[slug]/page.tsx`

### 2. Kaip Veikia

1. Organizacija turi `slug` lauką `orgs` lentelėje
2. Public puslapis: `/c/[slug]` - viešas puslapis be autentifikacijos
3. Dashboard: `/dashboard/[slug]` - reikalauja autentifikacijos ir narystės

### 3. RLS Policies

**✅ PATIKRINTA:** RLS policy `anon_select_orgs_public` jau egzistuoja `orgs` lentelėje.

Patikrinkite:
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'orgs' 
AND policyname = 'anon_select_orgs_public';
```

Jei policy neegzistuoja (nors turėtų), sukurkite:
```sql
-- Allow anonymous users to read public org data
CREATE POLICY anon_select_orgs_public ON orgs
  FOR SELECT
  TO anon
  USING (true); -- Or add visibility check if needed
```

**PASTABA:** Jei gaunate klaidą "policy already exists", tai reiškia, kad policy jau yra ir viskas gerai.

## Patikrinimas

### 1. Patikrinkite, ar RLS policy egzistuoja

```sql
-- Patikrinkite policies
SELECT * FROM pg_policies 
WHERE tablename = 'orgs' 
AND policyname LIKE '%anon%';
```

### 2. Testuokite Public Puslapį

1. Eikite į: `https://your-domain.vercel.app/c/[slug]`
2. Turėtumėte matyti organizacijos public puslapį
3. Jei matote klaidą, patikrinkite console log'us

### 3. Patikrinkite Slug Unikalumą

```sql
-- Patikrinkite, ar visi slug'ai yra unikalūs
SELECT slug, COUNT(*) 
FROM orgs 
GROUP BY slug 
HAVING COUNT(*) > 1;
```

## Problemos ir Sprendimai

### Problema: "RLS_BLOCKED: Public access to orgs table is blocked"

**Sprendimas:**
1. Sukurkite RLS policy (žr. aukščiau)
2. Patikrinkite, ar `orgs` lentelė turi RLS įjungtą:
   ```sql
   ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
   ```

### Problema: "Bendruomenė nerasta"

**Patikrinkite:**
1. Ar organizacija egzistuoja su tuo slug'u
2. Ar slug yra teisingas (case-sensitive)
3. Ar RLS policy leidžia skaityti duomenis

### Problema: Slug Validacija

**Rekomendacija:**
- Slug turėtų būti lowercase
- Tik raidės, skaičiai ir brūkšneliai
- Min 3 simboliai, max 50 simbolių
- Unikalus

## Vercel Konfigūracija

### Custom Domain Subdomenai (Ateityje)

Jei norite naudoti tikrus subdomenus (pvz., `org.branduolys.lt` vietoj `/c/org`):

1. **Vercel DNS:**
   - Pridėkite wildcard DNS record: `*.branduolys.lt` → Vercel
   
2. **Next.js Middleware:**
   ```typescript
   // middleware.ts
   export function middleware(request: NextRequest) {
     const hostname = request.headers.get('host')
     const subdomain = hostname?.split('.')[0]
     
     if (subdomain && subdomain !== 'www' && subdomain !== 'branduolys') {
       return NextResponse.rewrite(new URL(`/c/${subdomain}`, request.url))
     }
   }
   ```

3. **Vercel Project Settings:**
   - Pridėkite custom domain: `*.branduolys.lt`

**DABAR:** Naudojame path-based routing (`/c/[slug]`), kuris veikia be papildomų konfigūracijų.

## Rekomendacijos

1. **Slug Validacija:**
   - Validuokite slug'us registracijos metu
   - Patikrinkite unikalumą
   - Normalizuokite (lowercase, trim)

2. **SEO:**
   - Naudokite `generateMetadata` funkciją (jau implementuota)
   - Pridėkite OpenGraph tags (jau implementuota)

3. **Caching:**
   - Public puslapiai gali būti cached
   - Naudokite `revalidate` Next.js funkciją

## Testavimas

### Testuokite Public Puslapį

```bash
# Local
curl http://localhost:3000/c/[slug]

# Production
curl https://your-domain.vercel.app/c/[slug]
```

### Testuokite RLS

```sql
-- Testuokite anoniminę užklausą
SET ROLE anon;
SELECT * FROM orgs WHERE slug = 'test-slug';
RESET ROLE;
```

## Kitas Žingsnis

Jei reikia tikrų subdomenų (pvz., `org.branduolys.lt`), reikės:
1. DNS konfigūracijos
2. Next.js middleware
3. Vercel custom domain setup

**DABAR:** Path-based routing (`/c/[slug]`) yra pakankamas ir veikia be papildomų konfigūracijų.

