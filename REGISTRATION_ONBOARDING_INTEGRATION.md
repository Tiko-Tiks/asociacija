# Registracijos ir Onboarding Integracija (V2)

## Kas padaryta

### 1. Dviej? ?ingsni? registracijos srautas

**Failai:**
- `src/app/register-community/page.tsx`
- `src/app/api/register-community/route.ts`
- `src/app/onboarding/continue/page.tsx`
- `src/components/onboarding/onboarding-continue-client.tsx`

**Funkcionalumas:**
- Registracijos forma i?saugo parai?k? `community_applications` lentel?je
- Sukuriamas unikalus token su galiojimu
- Vartotojas gauna el. lai?k? su nuoroda t?sti registracij?

### 2. Onboarding prad?ia pagal token

**Failai:**
- `src/app/api/onboarding/application/route.ts`
- `src/app/api/onboarding/start/route.ts`

**Funkcionalumas:**
- Token leid?ia vie?ai pasiekti parai?k?
- `onboarding/start` sukuria paskyr?, organizacij? ir naryst?
- Po starto vartotojas perkeliamas ? `/dashboard/[slug]/onboarding`

### 3. Onboarding vedlys

**Failai:**
- `src/app/onboarding/page.tsx`
- `src/components/onboarding/onboarding-wizard.tsx`

**?ingsniai:**
1. Valdymo klausimai
2. Privalomi sutikimai
3. Laukimas patvirtinimo

## Dabartinis flow

1. **Registracija** (`/register-community`)
   - Vartotojas u?pildo form?
   - Parai?ka ?ra?oma ? `community_applications`
   - I?siun?iamas el. lai?kas su tokeno nuoroda

2. **T?sti registracij?** (`/onboarding/continue?token=...`)
   - Tikrinamas token galiojimas
   - Vartotojas inicijuoja onboarding start

3. **Onboarding** (`/dashboard/[slug]/onboarding`)
   - U?pildomi governance klausimai
   - Priimami sutikimai
   - Laukiama admin patvirtinimo

4. **Admin validacija** (dar ne pilnai implementuota)
   - Admin per?i?ri paketo informacij?
   - Patvirtina arba atmeta organizacij?

## Svarbios pastabos

- Parai?ka saugoma prie? paskyros suk?rim?
- Token galioja ribot? laik? (numatytas 7 dienos)
- Onboarding blokuoja dashboard prieig?, kol nebaigtas

## Testavimas

1. **Registracija:**
   - Atidaryti `/register-community`
   - U?pildyti form?
   - Patikrinti el. pa?t? d?l nuorodos

2. **Onboarding start:**
   - Atidaryti gaut? nuorod? `/onboarding/continue?token=...`
   - Paspausti ?Prad?ti onboarding?
   - Patikrinti, ar perkelia ? `/dashboard/[slug]/onboarding`

3. **Onboarding vedlys:**
   - U?pildyti valdymo klausimus
   - Priimti sutikimus
   - Patikrinti laukimo ?ingsn?
