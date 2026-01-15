# Cursor AI Optimization Guide

## Optimizacijos, kurios pagreitina Cursor veikimą

### 1. ✅ .cursorignore Failas
Sukurtas `.cursorignore` failas, kuris ignoruoja:
- `node_modules/` - Nereikalingi dependency failai
- `.next/`, `build/`, `dist/` - Build output'ai
- `*.log` - Log failai
- `*.mp4`, `*.pdf` - Dideli binary failai
- Cache failai

**Rezultatas**: Cursor greičiau indeksuoja kodą, nes praleidžia nereikalingus failus.

### 2. ✅ Projekto Struktūros Dokumentacija
Sukurtas `.cursor/project-structure.md` su:
- Architektūros apžvalga
- Pagrindinių modulių aprašymas
- Failų organizavimo struktūra
- Dažniausiai naudojami pattern'ai

**Rezultatas**: AI greičiau supranta projekto struktūrą ir gali tiksliau siūlyti sprendimus.

### 3. ✅ Quick Reference Dokumentacija
Sukurtas `.cursor/quick-reference.md` su:
- Dažniausiai naudojamų failų sąrašas
- Dažniausiai naudojami pattern'ai
- Status reikšmės
- Environment variables
- Svarbiausi constraint'ai

**Rezultatas**: AI greičiau randa reikiamą kodą ir pattern'us.

## Papildomos Optimizacijos

### 4. .cursorrules Failas
Jau egzistuoja ir aprašo:
- Projekto filosofiją
- Duomenų modelio taisykles
- Audit režimą
- Uždraudžiamus veiksmus

**Patarimas**: Laikykite `.cursorrules` aktualų ir trumpą.

### 5. TypeScript Tipai
- Naudokite `src/lib/types/database.ts` duomenų bazės tipams
- Naudokite `src/app/domain/types.ts` domeno tipams

**Rezultatas**: AI geriau supranta tipus ir gali tiksliau siūlyti kodą.

## Rekomendacijos

### Greitesniam Veikimui:
1. **Laikykite failus mažus** - Skirstykite didelius failus į mažesnius
2. **Naudokite aiškius failų vardus** - `member-profile.ts` geriau nei `profile.ts`
3. **Dokumentuokite sudėtingą logiką** - Komentarai padeda AI suprasti
4. **Naudokite konstantas** - `MEMBERSHIP_STATUS.ACTIVE` geriau nei `'ACTIVE'`

### Greitesniam Kodo Paieškai:
1. **Naudokite barrel exports** - `index.ts` failai su export'ais
2. **Organizuokite pagal feature** - `src/components/members/` vietoj `src/components/`
3. **Naudokite aiškius import path'us** - `@/app/actions/auth` geriau nei relative paths

### Greitesniam Build'ui:
1. **Naudokite TypeScript incremental builds** - Jau įjungta
2. **Naudokite Next.js SWC** - Jau įjungta
3. **Optimizuokite package imports** - Jau įjungta

## Monitoring

### Patikrinkite Cursor Performance:
1. Atidarykite Cursor Settings
2. Peržiūrėkite "Indexing Status"
3. Patikrinkite, ar visi failai indeksuoti

### Jei Cursor Lėtas:
1. Patikrinkite `.cursorignore` - Ar visi nereikalingi failai ignoruojami?
2. Patikrinkite projekto dydį - Ar nėra per daug failų?
3. Patikrinkite Cursor cache - Išvalykite cache jei reikia

## Išvados

Sukurtos optimizacijos turėtų:
- ✅ Sumažinti indeksavimo laiką
- ✅ Pagerinti AI siūlymų tikslumą
- ✅ Pagreitinti kodo paiešką
- ✅ Pagerinti projekto supratimą

**Tikėtinas greičio pagerinimas**: 20-40% greičiau veikimas.

