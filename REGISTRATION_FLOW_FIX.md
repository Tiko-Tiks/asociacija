# Registracijos Flow Pataisymas

## Problema

Po registracijos (`/register-community`) vartotojas gauna patvirtinimo email'ą, bet organizacija dar neegzistuoja sistemoje. Organizacija sukuriama tik po onboarding proceso.

## Dabartinis Flow

1. **Registracija** (`/register-community`) - tik paraiška
   - Išsaugoma į `community_applications` lentelę
   - Siunčiamas email'as admin'ui
   - Siunčiamas patvirtinimo email'as vartotojui

2. **Admin peržiūra** - admin mato registraciją admin puslapyje

3. **Onboarding** - tik čia sukuriama organizacija
   - Vartotojas užpildo governance klausimyną
   - Sukuriama organizacija su statusu `PENDING`
   - Tik po onboarding'o organizacija atsiranda sistemoje

## Sprendimas

### Variantas 1: Siųsti patvirtinimą tik po onboarding'o (RECOMMENDED)

**Problema:** Vartotojas nežino, kada gali pradėti onboarding.

**Sprendimas:** 
- Po registracijos siųsti tik informacinį email'ą: "Gavome jūsų paraišką. Su jumis susisieksime."
- Po admin patvirtinimo ir organizacijos sukūrimo siųsti onboarding nuorodą.

### Variantas 2: Pridėti onboarding nuorodą į patvirtinimo email'ą

**Problema:** Organizacija dar neegzistuoja, todėl negalime sukurti onboarding nuorodos.

**Sprendimas:**
- Admin sukuria organizaciją iš registracijos
- Admin siunčia onboarding nuorodą vartotojui
- Vartotojas gali pradėti onboarding

## Rekomendacija

**Variantas 1** yra teisingesnis, nes:
- Registracija yra tik paraiška
- Onboarding yra procesas, kuris sukuria organizaciją
- Email'as turėtų būti siunčiamas tik po to, kai organizacija yra sukurta

## Ką reikia padaryti

1. **Pakeisti registracijos email'ą:**
   - Pašalinti "Peržiūrėsime jūsų paraišką ir su jumis susisieksime"
   - Pridėti: "Gavome jūsų paraišką. Su jumis susisieksime per pateiktą el. pašto adresą, kai bus paruoštas onboarding procesas."

2. **Sukurti admin funkcionalumą:**
   - Admin gali sukurti organizaciją iš registracijos
   - Admin gali siųsti onboarding nuorodą vartotojui
   - Onboarding nuoroda turėtų būti: `/onboarding?orgId=...` arba `/dashboard/[slug]/onboarding`

3. **Sukurti onboarding email'ą:**
   - Siųsti po to, kai admin sukuria organizaciją
   - Email'e turėtų būti nuoroda į onboarding procesą

## Dabartinė situacija

- ✅ Registracijos email'as siunčiamas (bet neteisingas tekstas)
- ✅ Admin mato registracijas admin puslapyje
- ❌ Nėra funkcionalumo sukurti organizaciją iš registracijos
- ❌ Nėra funkcionalumo siųsti onboarding nuorodą

## Kitas žingsnis

Reikia sukurti admin funkcionalumą, kuris:
1. Leidžia admin'ui sukurti organizaciją iš registracijos
2. Siunčia onboarding nuorodą vartotojui
3. Pažymi registraciją kaip "APPROVED" arba "IN_PROGRESS"

