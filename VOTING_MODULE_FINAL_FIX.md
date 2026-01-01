# Balsavimo Modulio Final Fix - Router Refresh

## Pakeitimai

### 1. VotingSection - Router Refresh ✅

**Failas:** `src/components/voting/voting-section.tsx`

**Pakeitimai:**
- ✅ Pridėtas `useRouter` import iš `next/navigation`
- ✅ Pakeistas `window.location.reload()` → `router.refresh()` po `apply_vote_outcome`
- ✅ Pridėtas `onResolutionStatusChanged` callback prop
- ✅ Po `apply_vote_outcome`: refetch vote + tally + `router.refresh()` + callback

**Kodas:**
```typescript
const handleOutcomeApplied = async () => {
  if (activeVote) {
    // Refetch vote, tally after apply outcome
    const [updatedVote, updatedTally] = await Promise.all([
      getVote(activeVote.id),
      getVoteTally(activeVote.id),
    ])
    if (updatedVote) setActiveVote(updatedVote)
    if (updatedTally) setTally(updatedTally)
    
    // Refresh resolution status using Next.js App Router
    router.refresh()
    
    // Notify parent component to refetch resolution data
    onResolutionStatusChanged?.()
  }
}
```

### 2. ResolutionCard - Resolution State Management ✅

**Failas:** `src/components/resolutions/resolution-card.tsx`

**Pakeitimai:**
- ✅ Pridėtas `currentResolution` state (naudojamas vietoj `resolution` prop)
- ✅ Pridėtas `getResolution` import
- ✅ `onResolutionStatusChanged` callback: refetch resolution + update state + `router.refresh()`
- ✅ Visi `resolution` references pakeisti į `currentResolution`
- ✅ Pridėtas RECOMMENDED status badge ir display

**Kodas:**
```typescript
const [currentResolution, setCurrentResolution] = useState<Resolution>(resolution)

// In VotingSection:
onResolutionStatusChanged={async () => {
  // Refetch resolution to get updated status (APPROVED/RECOMMENDED)
  const updated = await getResolution(currentResolution.id)
  if (updated) {
    setCurrentResolution(updated)
  }
  // Refresh Next.js cache to update server components
  router.refresh()
}}
```

### 3. Resolutions Actions - getResolution Function ✅

**Failas:** `src/app/actions/resolutions.ts`

**Pakeitimai:**
- ✅ Pridėta `getResolution(resolution_id)` server action
- ✅ Resolution interface papildytas su `recommended_at` ir `recommended_by`
- ✅ `listResolutions` ir `getResolution` grąžina `recommended_at` ir `recommended_by`

**Kodas:**
```typescript
export interface Resolution {
  // ... existing fields
  recommended_at: string | null
  recommended_by: string | null
}

export async function getResolution(resolution_id: string): Promise<Resolution | null> {
  // Fetches single resolution by ID
}
```

### 4. ResolutionCard - RECOMMENDED Status Display ✅

**Failas:** `src/components/resolutions/resolution-card.tsx`

**Pakeitimai:**
- ✅ Pridėtas RECOMMENDED status badge
- ✅ Rodo `recommended_at` data, jei status = RECOMMENDED

---

## Rezultatas

### Prieš:
- ❌ `window.location.reload()` - full page reload
- ❌ Resolution status neatsinaujina be reload

### Dabar:
- ✅ `router.refresh()` - Next.js App Router cache refresh
- ✅ `onResolutionStatusChanged` callback - refetch resolution + update state
- ✅ Resolution status atsinaujina be full page reload
- ✅ Explicit "Atnaujinti" mygtukas vis dar veikia (manual refresh)

---

## Veikimo Principas

1. **Po `apply_vote_outcome`:**
   - Refetch vote + tally (VotingSection)
   - `router.refresh()` (Next.js cache refresh)
   - `onResolutionStatusChanged()` callback (ResolutionCard)

2. **ResolutionCard callback:**
   - `getResolution(resolution_id)` - refetch resolution iš DB
   - `setCurrentResolution(updated)` - update local state
   - `router.refresh()` - refresh Next.js cache

3. **Rezultatas:**
   - Resolution status atsinaujina (APPROVED/RECOMMENDED)
   - UI atsinaujina be full page reload
   - Badge rodo naują statusą

---

## Testavimas

### Testavimo Scenarijus:

1. **OPINION → RECOMMENDED:**
   - Sukurkite OPINION balsavimą
   - Balsuokite
   - Uždarykite
   - Pritaikykite rezultatą
   - ✅ Patikrinkite: Resolution status = RECOMMENDED (be page reload)

2. **GA → APPROVED:**
   - Sukurkite GA balsavimą
   - Balsuokite
   - Uždarykite
   - Pritaikykite rezultatą
   - ✅ Patikrinkite: Resolution status = APPROVED (be page reload)

---

## Svarbu

- ✅ Nėra `window.location.reload()` - tik `router.refresh()`
- ✅ Resolution status atsinaujina per callback + state update
- ✅ Explicit "Atnaujinti" mygtukas vis dar veikia
- ✅ Performance: nėra automatinio refresh, tik po veiksmų

Viskas paruošta! 🎯

