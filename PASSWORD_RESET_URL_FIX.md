# Password Reset URL Fix - Detalės

## Problema

Password reset linkas vis dar nukreipia į `localhost:3000` vietoj production URL.

## Sprendimas

### 1. Patikrinkite Vercel Environment Variables

1. Eikite į **Vercel Dashboard** → **Project Settings** → **Environment Variables**
2. Patikrinkite, ar yra `NEXT_PUBLIC_APP_URL`:
   - **Name:** `NEXT_PUBLIC_APP_URL`
   - **Value:** `https://asociacija.net` (arba jūsų production URL)
   - **Environment:** Production, Preview, Development (visi)

3. Jei nėra, pridėkite:
   - Spauskite **Add New**
   - Įveskite `NEXT_PUBLIC_APP_URL` ir jūsų production URL
   - Pasirinkite visus environment'us
   - Spauskite **Save**

### 2. Patikrinkite Supabase Auth Settings

1. Eikite į **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Patikrinkite **Site URL:**
   - Turėtų būti: `https://asociacija.net` (arba jūsų production URL)
   - **NE** `http://localhost:3000`

3. Patikrinkite **Redirect URLs:**
   - Pridėkite: `https://asociacija.net/reset-password`
   - Pridėkite: `https://asociacija.net/**` (wildcard)
   - Jei naudojate Vercel preview URL'us, pridėkite ir juos

### 3. Code Changes

Kodas dabar naudoja prioritetą:
1. `NEXT_PUBLIC_APP_URL` (jei nustatytas) - **REKOMENDUOJAMA**
2. `VERCEL_URL` (jei yra) - automatiškai nustatomas Vercel
3. `http://localhost:3000` (fallback development)

### 4. Testavimas

1. **Patikrinkite Environment Variables:**
   ```bash
   # Vercel Dashboard → Settings → Environment Variables
   # Turėtumėte matyti NEXT_PUBLIC_APP_URL
   ```

2. **Testuokite Password Reset:**
   - Eikite į production URL
   - Spauskite "Pamiršau slaptažodį"
   - Įveskite el. paštą
   - Patikrinkite email'ą - linkas turėtų būti `https://asociacija.net/reset-password?...`

3. **Patikrinkite Console Logs:**
   - Server logs turėtų rodyti: `Password reset redirect URL: https://asociacija.net/reset-password`

## Troubleshooting

### Problema: Vis dar localhost

**Patikrinkite:**
1. Ar `NEXT_PUBLIC_APP_URL` yra nustatytas Vercel'e?
2. Ar re-deploy'inote po environment variable pridėjimo?
3. Ar Supabase Site URL yra teisingas?

**Sprendimas:**
- Pridėkite `NEXT_PUBLIC_APP_URL` į Vercel
- Re-deploy'inkite projektą
- Patikrinkite Supabase Auth settings

### Problema: Supabase neleidžia redirect

**Patikrinkite:**
1. Ar redirect URL yra Supabase whitelist'e?
2. Ar Site URL yra teisingas?

**Sprendimas:**
- Pridėkite redirect URL į Supabase whitelist
- Patikrinkite, ar URL formatas teisingas (https://, ne http://)

## Svarbu

- **Environment Variables** reikia nustatyti Vercel'e
- Po environment variable pridėjimo reikia **re-deploy**
- **Supabase Auth** turi whitelist'ą - URL turi būti ten pridėtas
- **Site URL** Supabase'e turi atitikti production URL

## Greitas Patikrinimas

1. ✅ Ar `NEXT_PUBLIC_APP_URL` yra Vercel environment variables?
2. ✅ Ar Supabase Site URL = production URL?
3. ✅ Ar redirect URL yra Supabase whitelist'e?
4. ✅ Ar re-deploy'inote po pakeitimų?

Jei visi atsakymai "Taip", password reset turėtų veikti teisingai.

