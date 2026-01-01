# Maintenance Mode Setup

## Aprašymas

Maintenance mode sistema leidžia laikinai užrakinti visą platformą priežiūros darbų metu.

## Kaip įjungti

### 1. Environment Variables

Pridėkite į `.env.local` (development) arba Vercel Environment Variables (production):

```env
# Enable maintenance mode
NEXT_PUBLIC_MAINTENANCE_MODE=true

# Optional: Bypass key for admin access
MAINTENANCE_BYPASS_KEY=your-secret-bypass-key-here
```

### 2. Production (Vercel)

1. Eikite į **Vercel Dashboard** → **Settings** → **Environment Variables**
2. Pridėkite:
   - `NEXT_PUBLIC_MAINTENANCE_MODE` = `true`
   - `MAINTENANCE_BYPASS_KEY` = `your-secret-key` (optional)
3. **Redeploy** projektą

## Kaip išjungti

1. Pakeiskite `NEXT_PUBLIC_MAINTENANCE_MODE` į `false` arba pašalinkite environment variable
2. Redeploy projektą

## Admin Bypass

### Bypass per URL

Pridėkite `?bypass=your-secret-key` prie URL:

```
https://asociacija.net?bypass=your-secret-key
https://asociacija.net/admin?bypass=your-secret-key
```

### Bypass per Cookie

Po pirmo sėkmingo bypass, cookie bus nustatytas automatiškai ir galios 24 valandas.

## Kas veikia maintenance mode

- ✅ **Maintenance puslapis** - rodomas visiems vartotojams
- ✅ **API routes** - veikia normaliai (admin operacijoms)
- ✅ **Admin bypass** - leidžia admin'ams matyti puslapį
- ❌ **Visi kiti puslapiai** - redirect'ina į maintenance puslapį

## Maintenance Puslapis

**Failas:** `src/app/maintenance/page.tsx`

Rodo:
- Logo
- "Sistema laikinai nepasiekiama" pranešimą
- Kontaktinę informaciją

## Troubleshooting

### Maintenance mode neveikia

1. **Patikrinkite environment variables:**
   - `NEXT_PUBLIC_MAINTENANCE_MODE` turi būti `true` (string)
   - Perkraukite serverį po pakeitimų

2. **Patikrinkite Vercel:**
   - Environment variables turi būti nustatyti production environment'e
   - Redeploy projektą po environment variables pakeitimų

### Negaliu patekti į admin puslapį

1. **Naudokite bypass key:**
   ```
   https://asociacija.net/admin?bypass=your-secret-key
   ```

2. **Patikrinkite, ar bypass key teisingas:**
   - Turi sutapti su `MAINTENANCE_BYPASS_KEY` environment variable

### Maintenance puslapis nerodomas

1. **Patikrinkite, ar failas egzistuoja:**
   - `src/app/maintenance/page.tsx`

2. **Patikrinkite middleware:**
   - `src/middleware.ts` turi import'uoti `maintenanceMiddleware`

## Security Notes

- **Bypass key** turėtų būti unikalus ir saugus
- **Nenaudokite** paprastų slaptažodžių kaip bypass key
- **Pakeiskite** bypass key po kiekvieno naudojimo (jei reikia)

## Production Deployment

1. **Pridėkite environment variables Vercel'e:**
   ```
   NEXT_PUBLIC_MAINTENANCE_MODE=true
   MAINTENANCE_BYPASS_KEY=your-secret-key-here
   ```

2. **Redeploy:**
   - Vercel automatiškai redeploy'ins po environment variables pakeitimų
   - Arba rankiniu būdu: **Deployments** → **Redeploy**

3. **Patikrinkite:**
   - Eikite į `https://asociacija.net`
   - Turėtumėte matyti maintenance puslapį

4. **Išjungti:**
   - Pakeiskite `NEXT_PUBLIC_MAINTENANCE_MODE` į `false`
   - Redeploy

