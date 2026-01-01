# Registracijos ir Onboarding Integracija

## Ką padaryta

### 1. Automatinis paskyros sukūrimas po registracijos

**Failas:** `src/app/api/register-community/route.ts`

**Funkcionalumas:**
- Po registracijos formos pateikimo automatiškai sukuriama:
  - Vartotojo paskyra (Supabase Auth)
  - Profilis (`profiles` lentelėje)
  - Organizacija su `PENDING` statusu
  - Narystė su `OWNER` role
- Generuojamas unikalus slug iš organizacijos pavadinimo
- Generuojamas atsitiktinis slaptažodis
- Išsaugoma į `community_applications` lentelę su `IN_PROGRESS` statusu

**Email'ai:**
- Admin'ui siunčiamas pranešimas apie naują registraciją
- Vartotojui siunčiamas email'as su:
  - Prisijungimo duomenimis (email + slaptažodis)
  - Onboarding nuoroda

### 2. "Išsaugoti juodraštį" funkcionalumas

**Failai:**
- `src/app/actions/governance-draft.ts` - server action
- `src/components/onboarding/governance-step.tsx` - UI komponentas

**Funkcionalumas:**
- Vartotojas gali išsaugoti onboarding duomenis be validacijos
- Duomenys išsaugomi į `governance_configs` lentelę
- Siunčiamas email'as su nuoroda grįžti ir tęsti
- Vartotojas gali grįžti bet kada ir tęsti užpildymą

**UI:**
- Pridėtas "Išsaugoti juodraštį" mygtukas onboarding'e
- Rodo loading būseną išsaugojimo metu
- Rodo toast pranešimą apie sėkmę/klaidą

### 3. Email šablonai

**Failas:** `src/lib/email-templates.ts`

**Nauji šablonai:**
- `getRegistrationConfirmationEmail` - atnaujintas su slaptažodžiu ir onboarding nuoroda
- `getOnboardingDraftSavedEmail` - naujas šablonas juodraščio išsaugojimui

## Dabartinis Flow

1. **Registracija** (`/register-community`)
   - Vartotojas užpildo formą
   - Sistema automatiškai sukuria paskyrą ir organizaciją
   - Vartotojas gauna email'ą su slaptažodžiu ir onboarding nuoroda

2. **Onboarding** (`/dashboard/[slug]/onboarding`)
   - Vartotojas užpildo governance klausimyną
   - Gali išsaugoti juodraštį ir grįžti vėliau
   - Gali pateikti visus duomenis

3. **Admin validacija** (dar neimplementuota)
   - Admin peržiūri visą paketą
   - Patvirtina/atmeta organizaciją

## Ką dar reikia padaryti (vėlesniam etapui)

1. **Dokumentų upload funkcionalumas:**
   - Status (statutas)
   - Registrų centro išraša
   - Rinkimų protokolas
   - Supabase Storage integracija

2. **Admin validacijos procesas:**
   - Peržiūrėti visą paketą (duomenys + dokumentai)
   - Patvirtinti/atmeti organizaciją
   - Siųsti pranešimą vartotojui

## Svarbūs pastabos

- Organizacija sukuriama su `PENDING` statusu
- Vartotojas automatiškai gauna `OWNER` role
- Slaptažodis generuojamas automatiškai ir siunčiamas email'u
- Onboarding duomenys gali būti išsaugomi kaip juodraštis
- Email'ai siunčiami per Supabase Edge Functions (Resend API)

## Testavimas

1. **Registracija:**
   - Eiti į `/register-community`
   - Užpildyti formą
   - Patikrinti, ar gaunamas email'as su slaptažodžiu

2. **Onboarding:**
   - Prisijungti su gautais duomenimis
   - Eiti į `/dashboard/[slug]/onboarding`
   - Užpildyti governance klausimyną
   - Išbandyti "Išsaugoti juodraštį" funkcionalumą
   - Patikrinti, ar gaunamas email'as su nuoroda grįžti

3. **Admin peržiūra:**
   - Eiti į `/admin`
   - Patikrinti, ar matoma registracija "Registracijos" tab'e

