# 🚀 Kaip Paleisti Aplikaciją Internete (Vercel)

## Greitas Gidas

### 1️⃣ Paruoškite Kodą

```powershell
# 1. Patikrinkite, ar visi pakeitimai yra commit'inti
git status

# 2. Pridėkite visus failus
git add .

# 3. Commit'inkite pakeitimus
git commit -m "Ready for production deployment"

# 4. Push'inkite į GitHub/GitLab
git push origin feature/step-37
# ARBA jei norite į main:
git checkout main
git merge feature/step-37
git push origin main
```

### 2️⃣ Vercel Environment Variables

**Eikite į:** https://vercel.com/dashboard

1. Pasirinkite savo projektą
2. Eikite į **Settings** → **Environment Variables**
3. Įsitikinkite, kad yra šie kintamieji:

#### BŪTINI (Privalomi):

| Kintamasis | Reikšmė | Iš kur gauti |
|------------|---------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ojqeramrgafryldehnlm.supabase.co` | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...` | Supabase Dashboard → Settings → API → anon public key |

#### EMAIL KONFIGŪRACIJA:

| Kintamasis | Reikšmė | Pastaba |
|------------|---------|---------|
| `USE_SUPABASE_EDGE_FUNCTION` | `true` | Naudoti Supabase Edge Function email siuntimui |
| `RESEND_API_KEY` | `re_xxxxxxxxxxxxx` | Resend API raktas (jei naudojate Supabase Edge Function) |
| `EMAIL_FROM` | `noreply@branduolys.lt` | Siuntėjo el. pašto adresas |
| `CORE_ADMIN_EMAIL` | `admin@branduolys.lt` | Administratoriaus el. paštas |

#### PAPILDOMI (Neprivalomi):

| Kintamasis | Reikšmė | Pastaba |
|------------|---------|---------|
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Aplikacijos URL (naudojamas email'uose) |

**SVARBU:**
- Pasirinkite **Production**, **Preview**, ir **Development** aplinkoms
- Po pakeitimų **Redeploy** projektą!

### 3️⃣ Supabase Secrets (Email)

Jei naudojate Supabase Edge Function email siuntimui:

```powershell
# Prisijunkite prie Supabase
npx supabase link --project-ref ojqeramrgafryldehnlm

# Nustatykite secrets
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
npx supabase secrets set EMAIL_FROM=noreply@branduolys.lt
```

**Iš kur gauti RESEND_API_KEY:**
1. Eikite į: https://resend.com/api-keys
2. Prisijunkite arba sukurkite paskyrą
3. Sukurkite naują API Key
4. Nukopijuokite raktą (prasideda su `re_`)

### 4️⃣ Deploy į Vercel

#### A) Automatinis Deploy (Rekomenduojama)

Jei Vercel yra sujungtas su GitHub/GitLab:

1. **Push'inkite kodą į main branch:**
   ```powershell
   git checkout main
   git merge feature/step-37
   git push origin main
   ```

2. **Vercel automatiškai deploy'ins** - eikite į Vercel dashboard ir stebėkite deployment

#### B) Manual Deploy per Vercel Dashboard

1. Eikite į: https://vercel.com/dashboard
2. Pasirinkite projektą
3. Spauskite **Deployments** → **Redeploy** (jei reikia)
4. Arba **Settings** → **Git** → **Redeploy**

#### C) Deploy per Vercel CLI

```powershell
# Įdiekite Vercel CLI
npm i -g vercel

# Prisijunkite
vercel login

# Deploy
vercel --prod
```

### 5️⃣ Patikrinkite Deployment

1. **Eikite į Vercel Dashboard:**
   - https://vercel.com/dashboard
   - Pasirinkite projektą
   - Spauskite ant deployment URL

2. **Patikrinkite, ar veikia:**
   - ✅ Puslapis kraunasi
   - ✅ Prisijungimas veikia
   - ✅ Duomenų bazė veikia
   - ✅ Email siuntimas veikia (testuokite registraciją)

3. **Testuokite Email:**
   ```powershell
   # Naudokite test script'ą
   .\test-vercel-production.ps1 -Url "https://your-app.vercel.app" -Email "your-email@example.com"
   ```

### 6️⃣ Troubleshooting

#### Build Fails

**Klaida: "Environment variable not found"**
- ✅ Patikrinkite, ar visi environment variables nustatyti Vercel'e
- ✅ Patikrinkite, ar pasirinktos visos aplinkos (Production, Preview, Development)

**Klaida: "ESLint must be installed"**
- ✅ Įsitikinkite, kad `package.json` turi `eslint` ir `eslint-config-next`
- ✅ Commit'inkite `package.json` ir push'inkite

**Klaida: "Module not found"**
- ✅ Patikrinkite, ar visi dependencies yra `package.json`
- ✅ Patikrinkite, ar `npm install` veikia lokaliai

#### Runtime Errors

**Klaida: "Supabase connection failed"**
- ✅ Patikrinkite `NEXT_PUBLIC_SUPABASE_URL` Vercel'e
- ✅ Patikrinkite, ar Supabase projektas aktyvus

**Klaida: "Email not sending"**
- ✅ Patikrinkite Supabase secrets (`RESEND_API_KEY`, `EMAIL_FROM`)
- ✅ Patikrinkite, ar Supabase Edge Function `send-email` deploy'intas
- ✅ Patikrinkite Vercel environment variables (`USE_SUPABASE_EDGE_FUNCTION=true`)

**Klaida: "401 Unauthorized"**
- ✅ Jei naudojate Vercel Preview Deployment Protection, reikia autentifikuotis
- ✅ Arba naudokite Production URL (kuris neturi password protection)

### 7️⃣ Production Checklist

Prieš paleidžiant produkcijoje:

- [ ] Visi environment variables nustatyti Vercel'e
- [ ] Supabase secrets nustatyti (jei naudojate Edge Functions)
- [ ] Supabase Edge Function `send-email` deploy'intas
- [ ] Kodas commit'intas ir push'intas
- [ ] Build veikia lokaliai (`npm run build`)
- [ ] Test'ai praeina (`npm test`)
- [ ] TypeScript klaidos nėra (`npx tsc --noEmit`)
- [ ] Database migrations pritaikytos Supabase'e
- [ ] RLS policies sukonfigūruotos
- [ ] Email siuntimas testuotas
- [ ] Authentication veikia
- [ ] Duomenų bazės operacijos veikia

### 8️⃣ Custom Domain (Optional)

Jei norite naudoti savo domeną:

1. Eikite į Vercel → Project → Settings → Domains
2. Įveskite domeną
3. Sekite DNS instrukcijas
4. Palaukite DNS propagacijos (iki 48 val.)

### 9️⃣ Monitoring

Po deployment:

- **Vercel Analytics:** Stebėkite performance
- **Vercel Logs:** Stebėkite errors ir warnings
- **Supabase Dashboard:** Stebėkite database usage
- **Email Logs:** Patikrinkite, ar email'ai siunčiami

---

## Greitas Startas (TL;DR)

```powershell
# 1. Commit ir push
git add .
git commit -m "Ready for production"
git push origin main

# 2. Patikrinkite Vercel Environment Variables
# Eikite į: https://vercel.com/dashboard → Project → Settings → Environment Variables

# 3. Patikrinkite Supabase Secrets (jei naudojate email)
npx supabase link --project-ref ojqeramrgafryldehnlm
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx

# 4. Vercel automatiškai deploy'ins po push į main
# ARBA manual: Vercel Dashboard → Redeploy

# 5. Testuokite
# Eikite į: https://your-app.vercel.app
```

---

**Klausimai?** Patikrinkite:
- [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) - Detalus Vercel gidas
- [EMAIL_SETUP.md](./EMAIL_SETUP.md) - Email konfigūracija
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Bendras deployment gidas

