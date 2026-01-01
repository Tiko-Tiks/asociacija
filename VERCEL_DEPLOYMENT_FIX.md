# Vercel Deployment Fix - Environment Variables

## Problema

Po environment variables pridėjimo, kai bandote re-deploy'inti, gaunate klaidą:
```
Prebuilt deployments cannot be redeployed because they will not use the latest environment variables and project settings.
```

## Sprendimas

Vercel prebuilt deployment'ai nenaudoja naujų environment variables. Reikia sukurti **naują deployment'ą**.

### Opcija 1: Trigger'inti naują build'ą per Git (Rekomenduojama)

1. **Padarykite tuščią commit'ą:**
   ```bash
   git commit --allow-empty -m "Trigger new deployment for environment variables"
   git push origin master
   ```

2. **Arba padarykite bet kokį pakeitimą:**
   - Pakeiskite bet kurį failą (pvz., README.md)
   - Commit'inkite ir push'inkite

3. **GitHub Actions automatiškai trigger'ins naują build'ą:**
   - Naujas deployment naudos naujus environment variables
   - Patikrinkite **Deployments** tab'ą Vercel'e

### Opcija 2: Trigger'inti per Vercel Dashboard

1. Eikite į **Vercel Dashboard** → **Deployments**
2. Spauskite **"..."** ant bet kurio deployment'o
3. Spauskite **"Redeploy"**
4. **SVARBU:** Pasirinkite **"Use existing Build Cache"** = **OFF**
5. Spauskite **"Redeploy"**

### Opcija 3: Trigger'inti per GitHub

1. Eikite į **GitHub Repository**
2. Padarykite bet kokį pakeitimą (pvz., README.md)
3. Commit'inkite ir push'inkite
4. GitHub Actions automatiškai trigger'ins naują build'ą

## Patikrinimas

Po naujo deployment'o:

1. **Patikrinkite Deployment Logs:**
   - Eikite į **Vercel Dashboard** → **Deployments**
   - Spauskite ant naujo deployment'o
   - Patikrinkite **Build Logs**

2. **Patikrinkite Environment Variables:**
   - Eikite į **Settings** → **Environment Variables**
   - Turėtumėte matyti naujus variables

3. **Testuokite Admin Puslapį:**
   - Eikite į: `https://asociacija.net/admin`
   - Turėtumėte matyti admin dashboard

## Svarbu

- ⚠️ **Prebuilt deployment'ai nenaudoja naujų environment variables**
- ✅ **Nauji deployment'ai naudoja naujausius environment variables**
- ✅ **GitHub Actions automatiškai trigger'ins naują build'ą po push**

## Troubleshooting

### Problema: Vis dar naudoja senus environment variables

**Patikrinkite:**
1. Ar padarėte naują deployment'ą (ne re-deploy)?
2. Ar environment variables yra pridėti teisingai?
3. Ar build logs rodo naujus variables?

**Sprendimas:**
- Padarykite naują commit'ą ir push'inkite
- Arba trigger'inkite naują build'ą per Vercel Dashboard (be cache)

### Problema: Build fails

**Patikrinkite:**
1. Ar environment variables formatas teisingas?
2. Ar nėra tarpų ar specialių simbolių?
3. Patikrinkite Build Logs

**Sprendimas:**
- Patikrinkite environment variables formatą
- Patikrinkite Build Logs dėl detalių klaidų

