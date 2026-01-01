# Greitas Maintenance Mode Įjungimas

## Problema: Puslapis vis dar rodomas

Jei maintenance mode neveikia, patikrinkite:

## 1. Local Development

### Sukurkite `.env.local` failą (jei jo nėra):

```env
NEXT_PUBLIC_MAINTENANCE_MODE=true
MAINTENANCE_BYPASS_KEY=bypass-maintenance-2024
```

### Perkraukite serverį:

```bash
# Sustabdyti serverį (Ctrl+C)
npm run dev
```

## 2. Production (Vercel)

### Įjunkite maintenance mode:

1. **Eikite į Vercel Dashboard:**
   - https://vercel.com/dashboard
   - Pasirinkite projektą

2. **Settings → Environment Variables:**
   - Pridėkite: `NEXT_PUBLIC_MAINTENANCE_MODE` = `true`
   - Pridėkite: `MAINTENANCE_BYPASS_KEY` = `your-secret-key` (optional)

3. **Redeploy:**
   - Eikite į **Deployments**
   - Spauskite **"..."** prie paskutinio deployment
   - Spauskite **"Redeploy"**
   - Arba tiesiog padarykite tuščią commit:
     ```bash
     git commit --allow-empty -m "Enable maintenance mode"
     git push origin master
     ```

## 3. Patikrinkite, ar veikia

1. **Eikite į:** `https://asociacija.net`
2. **Turėtumėte matyti:** Maintenance puslapį su "Sistema laikinai nepasiekiama"

## 4. Admin Bypass

Jei reikia patekti į puslapį maintenance mode metu:

```
https://asociacija.net?bypass=bypass-maintenance-2024
https://asociacija.net/admin?bypass=bypass-maintenance-2024
```

## Troubleshooting

### Maintenance mode vis dar neveikia

1. **Patikrinkite environment variable:**
   - Turi būti `NEXT_PUBLIC_MAINTENANCE_MODE=true` (string "true", ne boolean)
   - Patikrinkite, ar nėra tarpų ar specialių simbolių

2. **Perkraukite serverį/deployment:**
   - Local: Sustabdyti ir paleisti `npm run dev`
   - Production: Redeploy Vercel'e

3. **Patikrinkite browser cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows) arba `Cmd+Shift+R` (Mac)
   - Arba atidarykite Incognito/Private mode

4. **Patikrinkite console:**
   - Development mode: Patikrinkite terminal output
   - Production: Patikrinkite Vercel logs

### Išjungti maintenance mode

1. **Pakeiskite environment variable:**
   - `NEXT_PUBLIC_MAINTENANCE_MODE=false` arba pašalinkite
2. **Redeploy**

