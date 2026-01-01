# Email Siuntimo Konfigūracija

## 1. Supabase Edge Functions (Rekomenduojama)

### A) Įdiekite Supabase CLI

**Windows: Naudokite vieną iš šių metodų:**

#### Metodas 1: Scoop (Rekomenduojama Windows)

**Vykdykite PowerShell terminale (kaip Administrator):**

```powershell
# Įdiekite Scoop (jei dar neturite)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Įdiekite Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

#### Metodas 2: Chocolatey (Jei turite Chocolatey)

**Vykdykite PowerShell terminale (kaip Administrator):**

```powershell
choco install supabase
```

#### Metodas 3: Standalone Binary (Paprasčiausias)

1. Atsisiųskite iš: https://github.com/supabase/cli/releases
2. Išpakuokite `supabase.exe` į katalogą, kuris yra PATH (pvz., `C:\Windows\System32`)
3. Arba pridėkite katalogą su `supabase.exe` į PATH

#### Metodas 4: npx (Nereikia globalaus įdiegimo)

**Vykdykite PowerShell/CMD terminale (projekto root kataloge):**

```powershell
# Naudokite npx be globalaus įdiegimo
npx supabase --version
```

**Pastaba:** Su npx kiekvieną kartą reikės rašyti `npx supabase` vietoj `supabase`.

### B) Prisijunkite prie Supabase

**Vykdykite PowerShell/CMD terminale:**

```powershell
supabase login
```

Tai atidarys naršyklę, kurioje prisijungsite prie Supabase paskyros.

### C) Susiekite projektą su Supabase

**Vykdykite PowerShell/CMD terminale (projekto root kataloge `C:\Users\Administrator\Branduolys`):**

```powershell
# Jei naudojate npx:
npx supabase link --project-ref YOUR_PROJECT_REF

# Jei įdiegėte per Scoop/Chocolatey/Standalone:
supabase link --project-ref YOUR_PROJECT_REF
```

**Pastaba:** Pakeiskite `YOUR_PROJECT_REF` į jūsų Supabase projekto ID.
Projektą ID rasite: **Supabase Dashboard -> Settings -> General -> Reference ID**

### D) Gauti Resend API Key

**1. Užsiregistruokite Resend:**

- Eikite į: https://resend.com
- Spauskite "Sign Up" (užsiregistruokite)
- Užpildykite registracijos formą (el. paštas, slaptažodis)

**2. Patvirtinkite el. paštą:**

- Patikrinkite el. paštą ir spauskite patvirtinimo nuorodą

**3. Sukurkite API Key:**

- Prisijunkite į Resend Dashboard: https://resend.com/api-keys
- Spauskite "Create API Key"
- Įveskite pavadinimą (pvz., "Branduolys Production")
- Pasirinkite permissions: "Sending access" (Full access)
- Spauskite "Add"
- **SVARBU:** Nukopijuokite API key dabar (jis bus rodomas tik vieną kartą!)
- API key formatas: `re_xxxxxxxxxxxxx` (prasideda su `re_`)

**4. Patvirtinkite domeną (neprivaloma, bet rekomenduojama):**

- Eikite į: https://resend.com/domains
- Spauskite "Add Domain"
- Įveskite savo domeną (pvz., `branduolys.lt`)
- Pridėkite DNS įrašus, kuriuos pateiks Resend (SPF, DKIM, DMARC)
- Palaukite patvirtinimo (gali užtrukti iki 24 val.)

**Pastaba:** Jei neturite domeno, galite naudoti Resend default domain `onboarding.resend.dev` testavimui.

### E) Nustatykite Secrets

**Vykdykite PowerShell/CMD terminale:**

```powershell
# Jei naudojate npx:
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
npx supabase secrets set EMAIL_FROM=noreply@branduolys.lt

# Jei įdiegėte per Scoop/Chocolatey/Standalone:
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
supabase secrets set EMAIL_FROM=noreply@branduolys.lt
```

**Pastaba:** 
- Pakeiskite `re_xxxxxxxxxxxxx` į jūsų tikrą Resend API key
- Jei neturite domeno, naudokite: `EMAIL_FROM=onboarding@resend.dev`
- Jei neturite Resend, galite praleisti šį žingsnį ir naudoti tiesioginį Resend integravimą (žr. 2 skyrių)

### E) Įdiekite Edge Function

**Vykdykite PowerShell/CMD terminale (projekto root kataloge):**

```powershell
# Jei naudojate npx:
npx supabase functions deploy send-email

# Jei įdiegėte per Scoop/Chocolatey/Standalone:
supabase functions deploy send-email
```

### G) Įjunkite Edge Function naudojimą

**Redaguokite `.env.local` failą (projekto root kataloge):**

```env
# Įjunkite Supabase Edge Function naudojimą
USE_SUPABASE_EDGE_FUNCTION=true

# Email konfigūracija
EMAIL_ENABLED=true
EMAIL_FROM=noreply@branduolys.lt
CORE_ADMIN_EMAIL=admin@branduolys.lt
```

---

## 2. Alternatyva: Tiesioginis Resend Integravimas (be Edge Functions)

Jei nenorite naudoti Edge Functions, galite integruoti Resend tiesiogiai.

### A) Įdiekite Resend paketą

**Vykdykite PowerShell/CMD terminale (projekto root kataloge):**

```powershell
npm install resend
```

### B) Nustatykite Environment Kintamuosius

**Redaguokite `.env.local` failą:**

```env
# Resend API Key
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Email konfigūracija
EMAIL_ENABLED=true
EMAIL_FROM=noreply@branduolys.lt
CORE_ADMIN_EMAIL=admin@branduolys.lt

# Nenaudokite Edge Functions
USE_SUPABASE_EDGE_FUNCTION=false
```

### C) Atnaujinkite `src/lib/email.ts`

Pridėkite Resend integraciją į `sendEmail` funkciją (jau yra komentaruose pavyzdys).

---

## 3. Failų Vietos

### Projekto struktūra:

```
C:\Users\Administrator\Branduolys\
├── .env.local                    # ← Čia rašykite environment kintamuosius
├── package.json                  # ← Čia bus resend dependency (jei naudojate)
├── supabase/
│   └── functions/
│       └── send-email/
│           ├── index.ts          # ← Edge Function kodas (jau sukurtas)
│           └── README.md
└── src/
    └── lib/
        └── email.ts              # ← Email siuntimo funkcija
```

---

## 4. Patikrinimas

### Patikrinkite, ar viskas veikia:

**Vykdykite PowerShell/CMD terminale:**

```powershell
# Jei naudojate npx:
npx supabase --version
npx supabase status
npx supabase functions list

# Jei įdiegėte per Scoop/Chocolatey/Standalone:
supabase --version
supabase status
supabase functions list
```

### Testuokite email siuntimą:

1. Užpildykite registracijos formą
2. Patikrinkite serverio console log'us (terminale, kur veikia `npm run dev`)
3. Turėtumėte matyti: `EMAIL SENT via Supabase Edge Function` arba `EMAIL SENT (logged)`

---

## 5. Troubleshooting

### Problema: "supabase: command not found"
**Sprendimas:** Įdiekite Supabase CLI vienu iš metodų:
```powershell
# Metodas 1: Scoop
scoop install supabase

# Metodas 2: Chocolatey
choco install supabase

# Metodas 3: Naudokite npx (nereikia įdiegimo)
npx supabase --version
```

### Problema: "Project not linked"
**Sprendimas:** Susiekite projektą:
```powershell
# Jei naudojate npx:
npx supabase link --project-ref YOUR_PROJECT_REF

# Jei įdiegėte per Scoop/Chocolatey/Standalone:
supabase link --project-ref YOUR_PROJECT_REF
```

### Problema: "Function not found"
**Sprendimas:** Įdiekite Edge Function:
```powershell
# Jei naudojate npx:
npx supabase functions deploy send-email

# Jei įdiegėte per Scoop/Chocolatey/Standalone:
supabase functions deploy send-email
```

### Problema: Email'ai nesiunčiami
**Sprendimas:** 
1. Patikrinkite, ar `USE_SUPABASE_EDGE_FUNCTION=true` `.env.local` faile
2. Patikrinkite, ar `RESEND_API_KEY` nustatytas: `supabase secrets list`
3. Patikrinkite serverio console log'us

---

## 6. Greitas Startas (Minimalus Setup)

Jei norite greitai pradėti be Edge Functions:

1. **Įdiekite Resend:**
   ```powershell
   npm install resend
   ```

2. **Pridėkite į `.env.local`:**
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   EMAIL_ENABLED=true
   USE_SUPABASE_EDGE_FUNCTION=false
   ```

3. **Atnaujinkite `src/lib/email.ts`** - pridėkite Resend kodą (jau yra komentaruose pavyzdys)

Tai viskas! Email'ai turėtų veikti.

