# Owner Dashboard - galutinis aprašymas

## Apžvalga

**URL:** `/dashboard/[slug]`  
**Prieiga:** OWNER

OWNER mato Command Center (valdymo centrą) su:
- sistemos apžvalga
- moduliais
- greitais veiksmais
- veiksmų istorija

---

## 1. Prieigos kontrol?

**Failas:** `src/app/(dashboard)/dashboard/[slug]/page.tsx`

Tikrinama:
1. vartotojas priklauso organizacijai
2. rolė yra OWNER
3. organizacija yra ACTIVE ir turi aktyvų ruleset  
   (per `checkOrgActive` ir `org_activation_state`)

Jei organizacija neaktyvi -> nukreipiama į onboarding.

**Redirect logika:**
- Jei `checkOrgActive` grąžina `false` → redirect į `/onboarding`
- Redirect vyksta net jei vartotojas yra OWNER
- Tai užtikrina, kad OWNER užbaigia onboarding prieš naudojant sistemą

**Kodas:** `src/app/(dashboard)/dashboard/[slug]/page.tsx` (lines 87-107)

---

## 2. Layout strukt?ra

**Komponentas:** `src/components/command-center/command-center-content.tsx`

Rodoma:
- System News (jei yra)
- Modern Dashboard (`src/components/command-center/modern-dashboard.tsx`)

### System News integracija

**Server action:** `getSystemNews()` (`src/app/actions/system-news.ts`)

System News gaunami iš "Branduolys" organizacijos ir rodomi Owner Dashboard viršuje:
- System News widget rodomas tik jei yra naujienų
- System News turi auksinį rėmelį (distinctive styling)
- System News rodo oficialius platformos pranešimus

**Kodas:** `src/app/(dashboard)/dashboard/[slug]/page.tsx` (line 119)

**Komponentas:** `src/components/dashboard/system-news-widget.tsx`

---

## 3. Pagrindiniai entry points

### Rezoliucijos ir balsavimai
- **Rezoliucijos (valdymas):** `/dashboard/[slug]/resolutions`
- **Aktyvūs balsavimai (sąrašas):** `/dashboard/[slug]/voting`
- **Legacy:** `/dashboard/voting` -> redirect į `/dashboard/[slug]/voting`

### Susirinkimai
- **Susirinkimų valdymas:** `/dashboard/[slug]/governance`
- **Naujas susirinkimas:** `/dashboard/[slug]/governance/new`

### Finansai
- **Sąskaitos:** `/dashboard/[slug]/invoices`

---

## 4. Greitieji veiksmai (canPublish)

Greitieji veiksmai rodomi tik jei `canPublish === true`:
- "Sukurti nutarimą" -> `/dashboard/[slug]/resolutions?new=true`
- "Organizuoti susirinkimą" -> `/dashboard/[slug]/governance?new=true`

**Guard:** `checkCanPublish` (`src/app/domain/guards/canPublish.ts`)

---

## 5. Balsavimo valdymas OWNER role

OWNER gali:
- kurti rezoliucijas
- sukurti OPINION balsavimą (jei jo nėra)
- uždaryti balsavimus
- taikyti rezultatus rezoliucijoms

Po patvirtinimo rezoliucijos tampa nekintamos (B4).

---

## 6. Testavimo scenarijai

1. Prisijungti kaip OWNER ir atidaryti `/dashboard/[slug]`
2. Patikrinti, ar matomi moduliai: "Nutarimai", "Susirinkimai", "Balsavimai", "Finansai"
3. Sukurti rezoliuciją -> pateikti patvirtinimui
4. Sukurti OPINION balsavimą ir patikrinti narį `/dashboard/[slug]/voting`
5. Sukurti susirinkimą, publikuoti, patikrinti GA balsavimą
