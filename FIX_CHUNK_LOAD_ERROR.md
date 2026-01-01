# Fix ChunkLoadError: Loading chunk app/layout failed

## Problema

```
ChunkLoadError: Loading chunk app/layout failed.
(timeout: http://localhost:3000/_next/static/chunks/app/layout.js)
```

## Sprendimas

### 1. Išvalyti Next.js cache

```powershell
# Windows PowerShell
Remove-Item -Recurse -Force .next

# Arba Linux/Mac
rm -rf .next
```

### 2. Perkrauti development server

```bash
# Sustabdyti serverį (Ctrl+C)
# Tada paleisti iš naujo
npm run dev
```

### 3. Jei problema išlieka

**Patikrinti:**
- Ar nėra sintaksės klaidų `src/app/layout.tsx`
- Ar visi import'ai teisingi
- Ar nėra cikliškų import'ų

**Papildomi žingsniai:**
```bash
# Išvalyti node_modules ir reinstaliuoti
Remove-Item -Recurse -Force node_modules
npm install

# Išvalyti visus cache
Remove-Item -Recurse -Force .next
npm run dev
```

### 4. Jei vis dar neveikia

**Patikrinti:**
- Ar portas 3000 nėra užimtas
- Ar nėra firewall blokavimo
- Ar nėra proxy problemų

**Bandyti kitą portą:**
```bash
npm run dev -- -p 3001
```

## Dažniausios priežastys

1. **Sugadintas build cache** - `.next` kataloge
2. **Development server timeout** - per lėtas atsakas
3. **Cikliški import'ai** - failai importuoja vienas kitą
4. **Trūkstami dependencies** - neinstaliuoti paketai

## Dabartinė situacija

- ✅ `.next` cache išvalytas
- ✅ `src/app/layout.tsx` patikrintas - nėra klaidų
- ⏳ Reikia perkrauti development serverį

