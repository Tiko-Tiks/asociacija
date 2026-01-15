# Member Dashboard - galutinis aprašymas

## Apžvalga

**URL:** `/dashboard/[slug]`  
**Prieiga:** MEMBER (ne OWNER)

Member dashboard yra orientuotas į veiksmus: balsavimus, sąskaitas ir profilį.

---

## 1. Prieigos kontrol?

**Failas:** `src/app/(dashboard)/dashboard/[slug]/page.tsx`

Jei rolė nėra OWNER:
- užkraunamas `MemberDashboard`
- užkraunami `getMemberDashboardData` ir `getMemberRequirements`

---

## 2. Layout

**Failas:** `src/components/dashboard/dashboard-layout-client.tsx`

Member režime:
- nėra sidebar
- nėra org switcher
- paliekamas tik header ir pagrindinis turinys

**Kodas:** `src/components/dashboard/dashboard-layout-client.tsx`

**Logika:**
- Jei vartotojas nėra OWNER → sidebar ir org switcher paslėpti
- MEMBER mato tik header su organizacijos logotipu ir pagrindinį turinį
- Tai supaprastina MEMBER sąsają ir sutelkia dėmesį į veiksmus

---

## 3. Pagrindin?s dalys

### 3.1 Requirements Alert

**Komponentas:** `src/components/member/requirements-alert.tsx`

Rodo privalomus veiksmus: profilis, sąskaitos, sutikimai, statusas.

### 3.2 Active Votes Alert

**Komponentas:** `src/components/member/active-votes-alert.tsx`

Rodo įspėjimą, jei yra aktyvių balsavimų, kuriuose narys dar nebalsavo.  
Mygtukas veda į `/dashboard/[slug]/voting`.

### 3.3 Hero blokas

- Nario statusas
- Pareigos (jei yra)
- Nuoroda į profilį

### 3.4 Veiksmų blokas

"Svarbu dabar" rodo:
- profilio duomenis
- sutikimus
- neapmokėtas sąskaitas
- artimiausius renginius

### 3.5 Dešinė juosta

- **Balsavimai** -> `/dashboard/[slug]/voting`
- **Sąskaitos** -> `/dashboard/[slug]/invoices`
- **Nutarimai** (patvirtinti)

### 3.6 Engagement Stats

**Komponentas:** `src/components/member/engagement-stats.tsx`

Rodo nario indėlį trim kategorijomis:

1. **Finansai** (`financial`):
   - Skaičiuojama: PAID sąskaitų skaičius
   - Jei yra neapmokėtų sąskaitų → rodo "Laukia apmokėjimas" (raudonas badge)
   - Jei nėra neapmokėtų → rodo "Pareigos vykdytos" (žalias badge)

2. **Talkos** (`labor`):
   - Skaičiuojama: PRESENT dalyvavimas WORK tipo renginiuose
   - Rodo dalyvavimų skaičių

3. **Balsai** (`democracy`):
   - Skaičiuojama: PRESENT dalyvavimas MEETING tipo renginiuose
   - Rodo posėdžių skaičių

**Duomenys:** Gaunami iš `getMemberDashboardData()` (`src/app/actions/member-dashboard.ts`)

**Skaičiavimas:**
- `financial`: `invoices` su `status = PAID`
- `labor`: `attendance` su `present = true` ir `event_type = WORK`
- `democracy`: `attendance` su `present = true` ir `event_type = MEETING`

---

## 4. Balsavimo puslapis nariams

**URL:** `/dashboard/[slug]/voting`

Rodo aktyvius balsavimus ir leidžia balsuoti.  
Tai pagrindinis narių kelias į balsavimą.

---

## 5. Testavimo scenarijai

1. Prisijungti kaip MEMBER
2. Atidaryti `/dashboard/[slug]`
3. Patikrinti "Balsavimai" kortelę ir Active Votes Alert
4. Eiti į `/dashboard/[slug]/voting`
5. Pabandyti balsuoti
