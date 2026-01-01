# Manual Deployment - Vercel

## Problema

Negalite re-deploy'inti, nes prebuilt deployment'ai nenaudoja naujų environment variables.

## Sprendimas: Rankinis Deployment

### Opcija 1: Vercel Dashboard (Greitai)

1. **Eikite į Vercel Dashboard:**
   - `https://vercel.com/dashboard`
   - Pasirinkite projektą **"asociacija"**

2. **Eikite į Deployments:**
   - Spauskite **"Deployments"** tab'ą
   - Spauskite **"..."** ant bet kurio deployment'o
   - Spauskite **"Redeploy"**

3. **SVARBU - Pasirinkite teisingai:**
   - **"Use existing Build Cache"** = **OFF** (išjunkite!)
   - Spauskite **"Redeploy"**

4. **Laukite:**
   - Build užtruks ~2-3 minutes
   - Po build'o deployment bus ready

### Opcija 2: Vercel CLI (Jei turite)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Link project:**
   ```bash
   vercel link
   ```

4. **Deploy:**
   ```bash
   vercel --prod
   ```

### Opcija 3: GitHub Actions Manual Trigger

1. **Eikite į GitHub:**
   - `https://github.com/Tiko-Tiks/asociacija/actions`

2. **Pasirinkite workflow:**
   - Spauskite **"Deploy to Vercel"** workflow

3. **Manual trigger:**
   - Spauskite **"Run workflow"** (dešinėje pusėje)
   - Pasirinkite **"master"** branch
   - Spauskite **"Run workflow"**

4. **Laukite:**
   - Workflow paleis naują build'ą
   - Deployment bus automatiškai sukurtas

### Opcija 4: Padaryti naują commit'ą

1. **Padarykite bet kokį pakeitimą:**
   ```bash
   # Pakeiskite bet kurį failą (pvz., README.md)
   echo "# Updated" >> README.md
   git add README.md
   git commit -m "Trigger new deployment"
   git push origin master
   ```

2. **GitHub Actions automatiškai trigger'ins:**
   - Naujas deployment naudos naujus environment variables

## Patikrinimas

Po deployment'o:

1. **Patikrinkite Vercel Deployments:**
   - Turėtumėte matyti naują deployment'ą
   - Status turėtų būti "Ready"

2. **Testuokite Admin Puslapį:**
   - Eikite į: `https://asociacija.net/admin`
   - Turėtumėte matyti admin dashboard

3. **Patikrinkite Environment Variables:**
   - Eikite į **Settings** → **Environment Variables**
   - Turėtumėte matyti:
     - ✅ `NEXT_PUBLIC_SUPER_ADMINS`
     - ✅ `SUPABASE_SERVICE_ROLE_KEY`

## Troubleshooting

### Problema: "Redeploy" mygtukas neveikia

**Sprendimas:**
- Naudokite **Opcija 3** (GitHub Actions Manual Trigger)
- Arba **Opcija 4** (naujas commit)

### Problema: Build fails

**Patikrinkite:**
1. Ar environment variables yra pridėti teisingai?
2. Patikrinkite Build Logs dėl klaidų
3. Patikrinkite, ar nėra sintaksės klaidų

**Sprendimas:**
- Patikrinkite Build Logs Vercel'e
- Patikrinkite environment variables formatą

### Problema: Vis dar naudoja senus variables

**Patikrinkite:**
1. Ar padarėte naują deployment'ą (ne re-deploy)?
2. Ar "Use existing Build Cache" buvo išjungtas?
3. Ar environment variables yra pridėti teisingai?

**Sprendimas:**
- Padarykite naują deployment'ą su cache OFF
- Arba trigger'inkite per GitHub Actions

## Rekomendacija

**Greitai:** Naudokite **Opcija 1** (Vercel Dashboard Redeploy su cache OFF)
**Automatiškai:** Naudokite **Opcija 3** (GitHub Actions Manual Trigger)

