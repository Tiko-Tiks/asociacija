# GA_MODE Konfigūracija

## Apžvalga

GA HARD MODE palaiko du režimus:
- **TEST** - Bandomasis (default)
- **PRODUCTION** - Gamybinis su pilnu teisiniu enforcement

## Environment Variable

### Nustatymas

Pridėkite į `.env.local`:

```bash
# GA Mode Configuration
# Values: TEST | PRODUCTION
# Default: TEST
GA_MODE=TEST
```

Arba client-side:

```bash
NEXT_PUBLIC_GA_MODE=TEST
```

### Režimai

#### TEST (Default)
```bash
GA_MODE=TEST
```

**Elgesys:**
- ✅ Rezultatai skaičiuojami ir rodomi
- ❌ `resolutions.status` **NEKEIČIAMAS**
- ❌ Teisinės pasekmės **NETAIKYTOS**
- ✅ Leidžiama užbaigti **be kvorumo**
- ✅ Leidžiama užbaigti **be pasirašyto PDF**

**Kada naudoti:**
- Pirmą kartą organizuojant GA
- Testuojant procedūrą
- Mokant sekretorių/pirmininką
- Development ir staging aplinkose

#### PRODUCTION
```bash
GA_MODE=PRODUCTION
```

**Elgesys:**
- ✅ Rezultatai skaičiuojami
- ✅ `resolutions.status` **ATNAUJINAMAS** (APPROVED/REJECTED)
- ✅ Teisinės pasekmės **PILNOS**
- ❌ **Privalomas kvorumas** - kitaip HARD ERROR
- ❌ **Privalomas pasirašytas PDF** - kitaip HARD ERROR

**Kada naudoti:**
- Realūs oficialūs susirinkimai
- Production aplinkoje
- Kai rezultatai turi teisinę galią

## Naudojimas kode

### Server-side

```typescript
import { 
  getGAMode, 
  isProductionMode, 
  isTestMode,
  canCompleteGA 
} from '@/lib/config/ga-mode'

// Gauti režimą
const mode = getGAMode() // 'TEST' | 'PRODUCTION'

// Patikrinti režimą
if (isProductionMode()) {
  // Production logika
}

if (isTestMode()) {
  // Test logika
}

// Validuoti ar galima užbaigti
const { allowed, reason } = canCompleteGA(hasQuorum, hasSignedPDF)
if (!allowed) {
  throw new Error(reason)
}
```

### Logging

```typescript
import { logGAMode } from '@/lib/config/ga-mode'

logGAMode('apply_vote_outcome')
// Output:
// [GA_MODE] apply_vote_outcome: TEST
// [GA_MODE] TEST (No legal consequences, quorum optional, PDF optional)
```

## Deployment

### Development
```bash
# .env.local
GA_MODE=TEST
```

### Staging
```bash
# .env.staging
GA_MODE=TEST
```

### Production
```bash
# .env.production
GA_MODE=PRODUCTION
```

**SVARBU:** Production aplinkoje **VISADA** naudokite `GA_MODE=PRODUCTION`

## Saugumas

- Default režimas: **TEST** (saugumas pirmiausia)
- Production reikalauja **explicit** nustatymą
- Negalima "apeiti" PRODUCTION reikalavimų
- Visi bandymai užbaigti be kvorumo/PDF loginami

## UI Indikacija

Sistema turėtų rodyti UI:

**TEST režimas:**
```
⚠️ BANDOMASIS REŽIMAS
   Rezultatai netaikomi. Tai tik testas.
```

**PRODUCTION režimas:**
```
✅ GAMYBINIS REŽIMAS
   Rezultatai turi teisinę galią.
```

## Audit Trail

Visi GA užbaigimai loginami su režimu:

```json
{
  "action": "complete_ga",
  "meeting_id": "...",
  "ga_mode": "TEST" | "PRODUCTION",
  "quorum_met": true,
  "pdf_signed": false,
  "result": "completed" | "blocked"
}
```

## FAQ

### Ar galiu pakeisti režimą susirinkimo metu?

Ne. Režimas fiksuojamas GA publikavimo metu ir nesikeičia.

### Ką daryti, jei per klaidą nustatyta TEST vietoj PRODUCTION?

Jei GA dar neuždarytas:
1. Pakeisti `GA_MODE=PRODUCTION`
2. Restart serverio
3. Užbaigti GA normaliai

Jei GA jau uždarytas TEST režimu:
- Rezultatai neturi teisinės galios
- Reikia organizuoti naują oficialų GA

### Ar TEST rezultatai matomi nariams?

Taip, rezultatai skaičiuojami ir rodomi, bet:
- Nerodomos kaip "Official decisions"
- UI rodo aiškų WARNING
- Resolutions lieka PROPOSED status

## Versijos istorija

- v18.8.1 - Pridėtas GA_MODE support
- v18.8 - Initial implementation

