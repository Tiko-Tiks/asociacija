# GitHub Actions Setup for Vercel Deployment

## Problem
Vercel webhook'as nėra sukonfigūruotas GitHub repository, todėl automatinis deploy neveikia.

## Solution
Naudojame GitHub Actions workflow automatiniam deploy'ui į Vercel.

## Setup Steps

### 1. Gauti Vercel Token

1. Eikite į [Vercel Dashboard](https://vercel.com/account/tokens)
2. Spauskite **"Create Token"**
3. Pavadinkite token'ą (pvz., "GitHub Actions Deploy")
4. Nukopijuokite token'ą (jis bus rodomas tik vieną kartą!)

### 2. Gauti Vercel Project ID ir Org ID

Jūsų projektas jau turi šiuos ID:
- **Project ID**: `prj_JVZNVRUjdBAZgHdTwAdVz6aBICeU`
- **Org ID**: `team_H4TaOJlI7IR1sKPMLie8OuNE`

(Šie ID yra `.vercel/project.json` faile)

### 3. Pridėti GitHub Secrets

1. Eikite į GitHub repository: `https://github.com/Tiko-Tiks/asociacija`
2. Spauskite **Settings** → **Secrets and variables** → **Actions**
3. Spauskite **"New repository secret"** ir pridėkite:

   **Secret 1:**
   - Name: `VERCEL_TOKEN`
   - Value: (jūsų Vercel token iš 1 žingsnio)

   **Secret 2:**
   - Name: `VERCEL_ORG_ID`
   - Value: `team_H4TaOJlI7IR1sKPMLie8OuNE`

   **Secret 3:**
   - Name: `VERCEL_PROJECT_ID`
   - Value: `prj_JVZNVRUjdBAZgHdTwAdVz6aBICeU`

   **Secret 4:**
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: (jūsų Supabase URL - turėtų būti jau Vercel environment variables)

   **Secret 5:**
   - Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Value: (jūsų Supabase anon key - turėtų būti jau Vercel environment variables)

### 4. Patikrinti, ar veikia

1. Padarykite bet kokį commit'ą ir push'ą į `master` branch
2. Eikite į GitHub repository → **Actions** tab
3. Turėtumėte matyti naują workflow run'ą
4. Jei viskas gerai, deployment bus automatiškai paleistas

## Alternative: Vercel Dashboard Setup

Jei norite naudoti Vercel webhook'ą vietoj GitHub Actions:

1. Eikite į [Vercel Dashboard](https://vercel.com/dashboard)
2. Pasirinkite projektą **"asociacija"**
3. Eikite į **Settings** → **Git**
4. Spauskite **"Connect Git Repository"**
5. Pasirinkite **GitHub** ir autorizuokite prieigą
6. Pasirinkite repository: `Tiko-Tiks/asociacija`
7. Vercel automatiškai sukurs webhook'ą

## Troubleshooting

### Workflow nepavyksta
- Patikrinkite, ar visi secrets yra pridėti teisingai
- Patikrinkite GitHub Actions logs, kur yra klaida

### Build nepavyksta
- Patikrinkite, ar `NEXT_PUBLIC_SUPABASE_URL` ir `NEXT_PUBLIC_SUPABASE_ANON_KEY` yra teisingi
- Patikrinkite, ar `package.json` turi visas priklausomybes

### Deployment nepavyksta
- Patikrinkite, ar `VERCEL_TOKEN` yra teisingas
- Patikrinkite, ar `VERCEL_ORG_ID` ir `VERCEL_PROJECT_ID` yra teisingi

