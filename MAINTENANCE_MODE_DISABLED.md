# Maintenance Mode Išjungtas

## Ką padariau

Pakeičiau `.env.local` faile:
- `NEXT_PUBLIC_MAINTENANCE_MODE=false`

## Ką daryti dabar

**Perkraukite development serverį:**

```bash
# Sustabdyti serverį (Ctrl+C terminal'e)
# Tada paleisti iš naujo:
npm run dev
```

Po perkrovimo, puslapis veiks normaliai be maintenance mode.

## Production (Vercel)

Jei maintenance mode buvo įjungtas production'e:

1. **Eikite į Vercel Dashboard:**
   - Settings → Environment Variables

2. **Pakeiskite arba pašalinkite:**
   - `NEXT_PUBLIC_MAINTENANCE_MODE` = `false` (arba pašalinkite)

3. **Redeploy projektą:**
   - Deployments → Redeploy
   - Arba padarykite tuščią commit:
     ```bash
     git commit --allow-empty -m "Disable maintenance mode"
     git push origin master
     ```

