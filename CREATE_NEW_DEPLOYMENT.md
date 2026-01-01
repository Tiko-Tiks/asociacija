# Kaip Sukurti Naują Deployment (Ne Re-deploy)

## Problema

Vercel sako: "Prebuilt deployments cannot be redeployed"

Tai reiškia, kad negalite re-deploy'inti esamo prebuilt deployment'o. Reikia **sukurti naują deployment'ą**.

## Sprendimas: Sukurti Naują Deployment

### Opcija 1: Laukite GitHub Actions (Automatiškai)

Po commit'ų push'inimo į master, GitHub Actions automatiškai sukurs naują deployment'ą.

**Patikrinkite:**
1. Eikite į: `https://github.com/Tiko-Tiks/asociacija/actions`
2. Ar matote naują "Deploy to Vercel" workflow run'ą?
3. Jei taip, laukite, kol jis baigsis (~2-3 min)
4. Po to eikite į Vercel Dashboard → Deployments
5. Turėtumėte matyti naują deployment'ą

### Opcija 2: Manual Trigger per GitHub Actions

1. **Eikite į GitHub:**
   - `https://github.com/Tiko-Tiks/asociacija/actions`

2. **Pasirinkite workflow:**
   - Spauskite **"Deploy to Vercel"** workflow (kairėje pusėje)

3. **Manual trigger:**
   - Spauskite **"Run workflow"** (dešinėje pusėje, viršuje)
   - Pasirinkite **"master"** branch
   - Spauskite žalią **"Run workflow"** mygtuką

4. **Laukite:**
   - Workflow paleis naują build'ą
   - Po ~2-3 min sukurs naują deployment'ą Vercel'e

### Opcija 3: Vercel CLI (Jei turite CLI)

```bash
# Install Vercel CLI (jei neturite)
npm install -g vercel

# Login
vercel login

# Link project (jei dar nepadaryta)
vercel link

# Deploy naują build'ą
vercel --prod
```

### Opcija 4: Vercel Dashboard - Cancel ir Sukurti Naują

1. **Eikite į Vercel Dashboard:**
   - `https://vercel.com/dashboard`
   - Pasirinkite projektą

2. **Eikite į Deployments:**
   - Spauskite **"Deployments"** tab'ą

3. **Sukurkite naują deployment'ą:**
   - Spauskite **"..."** ant bet kurio deployment'o
   - Spauskite **"Promote to Production"** (jei yra)
   - Arba spauskite **"Redeploy"** BET **išjunkite "Use existing Build Cache"**

4. **SVARBU:**
   - Jei matote "Redeploy" su cache, **išjunkite cache**
   - Arba naudokite GitHub Actions manual trigger

## Ką Daryti Dabar

### 1. Patikrinkite GitHub Actions

1. Eikite į: `https://github.com/Tiko-Tiks/asociacija/actions`
2. Ar matote naują workflow run'ą po paskutinio commit'o?
3. Jei taip:
   - Laukite, kol jis baigsis
   - Po to patikrinkite Vercel Deployments
4. Jei ne:
   - Naudokite **Opcija 2** (Manual Trigger)

### 2. Manual Trigger (Jei GitHub Actions neveikia)

1. Eikite į: `https://github.com/Tiko-Tiks/asociacija/actions`
2. Spauskite **"Deploy to Vercel"** workflow
3. Spauskite **"Run workflow"** → **"master"** → **"Run workflow"**
4. Laukite ~2-3 min
5. Patikrinkite Vercel Deployments

## Patikrinimas

Po naujo deployment'o:

1. **Vercel Dashboard → Deployments:**
   - Turėtumėte matyti naują deployment'ą
   - Status: "Ready" (žalias)

2. **Testuokite Admin Puslapį:**
   - Eikite į: `https://asociacija.net/admin`
   - Turėtumėte matyti admin dashboard

3. **Patikrinkite Environment Variables:**
   - Eikite į **Settings** → **Environment Variables**
   - Turėtumėte matyti:
     - ✅ `NEXT_PUBLIC_SUPER_ADMINS`
     - ✅ `SUPABASE_SERVICE_ROLE_KEY`

## Svarbu

- ⚠️ **Prebuilt deployment'ai NEGALI būti re-deploy'inti**
- ✅ **Reikia sukurti NAUJĄ deployment'ą**
- ✅ **GitHub Actions automatiškai sukurs naują deployment'ą**
- ✅ **Manual trigger taip pat sukurs naują deployment'ą**

## Troubleshooting

### Problema: GitHub Actions neveikia

**Patikrinkite:**
1. Ar workflow failas yra `.github/workflows/deploy.yml`?
2. Ar yra `workflow_dispatch` trigger'is?
3. Patikrinkite GitHub Actions settings

**Sprendimas:**
- Naudokite manual trigger per GitHub Actions
- Arba naudokite Vercel CLI

### Problema: Vis dar naudoja senus variables

**Patikrinkite:**
1. Ar sukūrėte naują deployment'ą (ne re-deploy)?
2. Ar environment variables yra pridėti teisingai?
3. Ar build cache buvo išjungtas?

**Sprendimas:**
- Sukurkite naują deployment'ą per GitHub Actions
- Arba naudokite Vercel CLI su `--prod`

