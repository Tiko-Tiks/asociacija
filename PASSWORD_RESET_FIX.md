# Password Reset Link Fix

## Problem
Password reset email link nukreipia į `localhost:3000` vietoj production URL.

## Solution

### 1. Pridėti NEXT_PUBLIC_APP_URL į Vercel Environment Variables

1. Eikite į [Vercel Dashboard](https://vercel.com/dashboard)
2. Pasirinkite projektą **"asociacija"**
3. Eikite į **Settings** → **Environment Variables**
4. Pridėkite naują variable:
   - **Name:** `NEXT_PUBLIC_APP_URL`
   - **Value:** `https://asociacija-80e1hqpc3-mindaugas-projects-7daae8f6.vercel.app` (arba jūsų custom domain, jei turite)
   - **Environment:** Select all (Production, Preview, Development)
   - Spauskite **Save**

### 2. Patikrinti Supabase Auth Settings

1. Eikite į [Supabase Dashboard](https://supabase.com/dashboard)
2. Pasirinkite projektą
3. Eikite į **Authentication** → **URL Configuration**
4. Patikrinkite **Site URL:**
   - Turėtų būti: `https://asociacija-80e1hqpc3-mindaugas-projects-7daae8f6.vercel.app` (arba jūsų production URL)
5. Patikrinkite **Redirect URLs:**
   - Turėtų būti pridėtas: `https://asociacija-80e1hqpc3-mindaugas-projects-7daae8f6.vercel.app/reset-password`
   - Taip pat pridėkite: `https://asociacija-80e1hqpc3-mindaugas-projects-7daae8f6.vercel.app/**` (wildcard)
6. Spauskite **Save**

### 3. Testuoti

1. Eikite į production URL: `https://asociacija-80e1hqpc3-mindaugas-projects-7daae8f6.vercel.app`
2. Spauskite "Pamiršau slaptažodį"
3. Įveskite el. paštą
4. Patikrinkite email'ą - linkas turėtų nukreipti į production URL, ne localhost

## Code Changes

Kodas dabar naudoja:
1. `VERCEL_URL` (jei yra - automatiškai nustatomas Vercel)
2. `NEXT_PUBLIC_APP_URL` (jei nustatytas)
3. `http://localhost:3000` (fallback development)

## Important Notes

- Supabase Auth turi whitelist'ą leistinų redirect URL'ų
- Jei URL nėra whitelist'e, redirect neveiks
- Reikia pridėti visus galimus URL'us (production, preview, development)

