# GA HARD MODE - Deployment Guide

**Versija:** 18.8.6  
**Data:** 2025-01-09  
**Statusas:** Ready for Deployment

---

## APŽVALGA

Šis dokumentas aprašo kaip **įdiegti GA HARD MODE** į production arba staging aplinką.

**Kas bus įdiegta:**
- GA_MODE konfigūracija (TEST/PRODUCTION)
- SQL funkcijų pakeitimai (3 funkcijos)
- Server actions pakeitimai
- Governance snapshot mechanizmas
- Procedūrinių klausimų auto-generation
- Procedūrinės eigos enforcement
- Completion validation

---

## PRE-DEPLOYMENT CHECKLIST

### ✅ **Prieš pradedant:**

- [ ] **Backup duomenų bazės** (Supabase Dashboard → Database → Backups)
- [ ] **Code review** visų pakeitimų
- [ ] **Staging testavimas** (jei yra staging)
- [ ] **Team informavimas** apie deployment
- [ ] **Downtime planas** (jei reikalingas)

### ⚠️ **SVARBU:**

- Deployment **NESUGADINS** esamų duomenų
- Visos migracijos yra **idempotent** (galima paleisti kelis kartus)
- Esami OPINION balsavimai **NEPAKITĘ**
- Backward compatible su esamu kodu

---

## DEPLOYMENT ŽINGSNIAI

### **ŽINGSNIS 1: SQL Migracijos**

#### **Variantas A: Vienas konsoliduotas scriptas (Rekomenduojama)**

```bash
# Supabase SQL Editor
# Arba psql CLI
```

**Failas:** `sql/GA_HARD_MODE_DEPLOYMENT.sql`

**Turinys:**
- ✅ `can_cast_vote` funkcija
- ✅ `cast_vote` funkcija
- ✅ `set_vote_live_totals` funkcija

**Paleisti:**

**Supabase Dashboard:**
1. Login → Your Project
2. Database → SQL Editor
3. New Query
4. Copy-paste `sql/GA_HARD_MODE_DEPLOYMENT.sql` turinį
5. Run

**ARBA psql CLI:**
```bash
psql postgresql://[YOUR_SUPABASE_CONNECTION_STRING] \
  -f sql/GA_HARD_MODE_DEPLOYMENT.sql
```

**Tikėtinas output:**
```
==================================================
ETAPAS 1: Updating can_cast_vote...
==================================================
CREATE OR REPLACE FUNCTION
✅ can_cast_vote updated

==================================================
ETAPAS 2: Updating cast_vote...
==================================================
CREATE OR REPLACE FUNCTION
✅ cast_vote updated

==================================================
ETAPAS 3: Updating set_vote_live_totals...
==================================================
CREATE OR REPLACE FUNCTION
✅ set_vote_live_totals updated

==================================================
GA HARD MODE DEPLOYMENT COMPLETE
==================================================
```

#### **Variantas B: Individualūs failai**

Jei reikia paleisti atskirai:

```bash
# 1. Vote RPC funkcijos
psql -f sql/modules/voting/create_vote_rpc_functions.sql

# 2. Live totals funkcija
psql -f sql/modules/voting/create_set_vote_live_totals.sql
```

---

### **ŽINGSNIS 2: Environment Variables**

**Failas:** `.env.local` (development) arba `.env.production`

**Pridėti:**
```bash
# GA Mode Configuration
# Values: TEST | PRODUCTION
# Default: TEST (jei nenustaty ta)
GA_MODE=TEST

# Arba client-side:
NEXT_PUBLIC_GA_MODE=TEST
```

**Development:**
```bash
GA_MODE=TEST
```

**Staging:**
```bash
GA_MODE=TEST
```

**Production:**
```bash
GA_MODE=PRODUCTION
```

---

### **ŽINGSNIS 3: Code Deployment**

**Jei naudojate Git workflow:**

```bash
# 1. Commit pakeitimai
git add .
git commit -m "feat: GA HARD MODE implementation v18.8.6"

# 2. Push į repository
git push origin main

# 3. Deploy per Vercel/platformą
# (automatic deployment if configured)
```

**Jei manual deployment:**

```bash
# 1. Build
npm run build

# 2. Deploy build į serverį
# (depends on your hosting)
```

---

### **ŽINGSNIS 4: Verification**

#### **4.1. SQL Verification**

**Patikrinti funkcijų comments:**

```sql
-- Turėtų matyti "[GA HARD MODE VARTŲ SARGAS]"
SELECT pg_get_functiondef('public.can_cast_vote'::regproc);

-- Turėtų matyti "[GA HARD MODE HARD BLOCK]"
SELECT pg_get_functiondef('public.cast_vote'::regproc);

-- Turėtų matyti "[GA HARD MODE]"
SELECT pg_get_functiondef('public.set_vote_live_totals'::regproc);
```

**Test GA channel blocking:**

```sql
-- Turėtų grąžinti error
SELECT * FROM can_cast_vote(
  '<any_ga_vote_id>'::uuid,
  auth.uid(),
  'IN_PERSON'
);

-- Expected: { allowed: false, reason: 'GA_CHANNEL_NOT_ALLOWED' }
```

#### **4.2. Environment Verification**

**Server-side check:**

```typescript
// Console ar server log
import { getGAMode, getGAModeDescription } from '@/lib/config/ga-mode'

console.log('GA_MODE:', getGAMode())
console.log('Description:', getGAModeDescription())
```

**Expected output:**
```
GA_MODE: TEST
Description: TEST (No legal consequences, quorum optional, PDF optional)
```

#### **4.3. Feature Verification**

**Create test GA meeting:**

```bash
# UI arba:
curl -X POST http://localhost:3000/api/meetings \
  -H "Authorization: Bearer [TOKEN]" \
  -d '{
    "title": "Test GA",
    "scheduled_at": "2025-02-15T10:00:00Z",
    "location": "Test"
  }'
```

**Tikrinti:**
1. ✅ Procedūriniai klausimai (1-3) automatiškai sukurti?
2. ✅ Bandyti ištrinti item 1 → Blokuoja?
3. ✅ Publikuoti → Snapshot išsaugotas?
4. ✅ Bandyti balsuoti IN_PERSON → Blokuoja?
5. ✅ Bandyti užbaigti be procedūrinių → Blokuoja?

---

## ROLLBACK PLAN

### Jei kažkas negerai:

#### **1. SQL Rollback**

**Restore old functions (jei yra backup):**

```sql
-- Backup should be in git history
-- git checkout HEAD~10 sql/modules/voting/create_vote_rpc_functions.sql
-- Deploy old version
```

**ARBA disable GA HARD MODE:**

```sql
-- Temporary workaround: Modify functions to skip GA checks
-- (Not recommended, better to fix issue)
```

#### **2. Environment Rollback**

```bash
# Set to TEST (safest)
GA_MODE=TEST

# Restart application
```

#### **3. Code Rollback**

```bash
# Revert to previous version
git revert [COMMIT_HASH]
git push

# Redeploy
```

---

## POST-DEPLOYMENT

### **Monitoring:**

**Stebėti logs:**
```bash
# Check for GA HARD MODE blocks
grep "GA_CHANNEL_BLOCKED" logs/application.log
grep "GA_VOTING_FROZEN" logs/application.log
grep "GA_PROCEDURE_NOT_COMPLETED" logs/application.log
```

**Expected:**
- Jei yra bandymų balsuoti IN_PERSON → Turėtų matyti blocks
- Jei yra bandymų balsuoti po freeze → Turėtų matyti blocks

### **User Communication:**

**Informuoti vartotojus:**

```
📢 BRANDUOLYS ATNAUJINIMAS

Įdiegtas GA (Visuotinio susirinkimo) procedūrinis režimas:

NAUJOS FUNKCIJOS:
✅ Automatiniai procedūriniai darbotvarkės klausimai (1-3)
✅ Balsavimo freeze mechanizmas (nuo susirinkimo pradžios)
✅ Procedūrinė eigos tvarka (1→2→3→4+)
✅ TEST/PRODUCTION režimai

KAS PASIKEITĖ:
- GA susirinkimų balsavimas tik REMOTE/WRITTEN iki susirinkimo
- Gyvas balsavimas tik agreguotai (ne individualiai)
- Automatiniai procedūriniai klausimai

Detaliau: docs/VOTING_FLOW_SPECIFICATION.md
```

---

## TROUBLESHOOTING

### Problema 1: SQL funkcija nepersirašė

**Simptomai:**
- Old function behavior
- No "[GA HARD MODE]" in comments

**Sprendimas:**
```sql
-- Drop ir recreate
DROP FUNCTION IF EXISTS public.can_cast_vote(UUID, UUID, public.vote_channel);
-- Tada run deployment script dar kartą
```

### Problema 2: GA_MODE nenuskaitomas

**Simptomai:**
- `getGAMode()` grąžina 'TEST' net jei nustatyta PRODUCTION

**Sprendimas:**
```bash
# Check env variable
echo $GA_MODE

# Restart application
npm run dev  # or production restart
```

### Problema 3: Procedūriniai klausimai nesukuriami

**Simptomai:**
- Naujas GA neturi items 1-3

**Sprendimas:**
```typescript
// Manual trigger
import { createProceduralAgendaItems } from '@/lib/meetings/procedural-items'
await createProceduralAgendaItems(meetingId, orgId)
```

### Problema 4: OPINION balsavimai neveikia

**Simptomai:**
- OPINION + IN_PERSON blokuojamas

**Sprendimas:**
```typescript
// Verify vote.kind
const vote = await getVote(voteId)
console.log('Vote kind:', vote.kind) // Turėtų būti 'OPINION', ne 'GA'

// Check if accidentally marked as GA
// Fix: Update vote.kind = 'OPINION'
```

---

## TESTING PROTOCOL

### **Test Suite:**

```bash
# Run test suite
npm run test:ga-hard-mode

# Arba manual tests:
```

#### Test 1: GA Creation
```typescript
const result = await createMeetingGA(orgId, 'Test GA', scheduledAt)
expect(result.success).toBe(true)

const items = await getAgendaItems(result.meetingId)
expect(items.filter(i => ['1','2','3'].includes(i.item_no)).length).toBe(3)
```

#### Test 2: Channel Blocking
```typescript
const result = await canCastVoteWithSnapshot(gaVoteId, 'IN_PERSON')
expect(result.allowed).toBe(false)
expect(result.reason).toBe('GA_CHANNEL_NOT_ALLOWED')
```

#### Test 3: Procedural Sequence
```typescript
// Try to close item 4 without 1-3
const result = await closeVoteWithValidation(vote_item_4)
expect(result.ok).toBe(false)
expect(result.reason).toBe('GA_PROCEDURE_NOT_COMPLETED')
```

#### Test 4: Completion
```typescript
// Try to complete without procedural
const result = await completeMeeting(gaMe etingId)
expect(result.success).toBe(false)
expect(result.error).toContain('Procedūriniai klausimai')
```

---

## PRODUCTION DEPLOYMENT

### **Production Checklist:**

- [ ] ✅ Staging tested successfully
- [ ] ✅ Backup created
- [ ] ✅ Team notified
- [ ] ✅ SQL migrations ready
- [ ] ✅ `GA_MODE=PRODUCTION` set
- [ ] ✅ Rollback plan ready
- [ ] ✅ Monitoring configured

### **Deployment Steps:**

```bash
# 1. Backup
# Supabase Dashboard → Database → Backups → Create Backup

# 2. Deploy SQL
# Supabase Dashboard → SQL Editor → Run GA_HARD_MODE_DEPLOYMENT.sql

# 3. Set environment
GA_MODE=PRODUCTION

# 4. Deploy code
git push production main

# 5. Restart application
# (automatic or manual)

# 6. Verify
# Check logs for GA_MODE: PRODUCTION

# 7. Monitor
# Watch for errors in first 24h
```

---

## CHANGELOG

**v18.8.6 Deployment:**
- ✅ SQL: 3 funkcijos updated
- ✅ Code: 4 libraries added, 2 actions modified
- ✅ Docs: 8 dokumentai sukurti
- ✅ GA_MODE: Environment support
- ✅ Total files changed: 15

---

**Autorius:** Branduolys AI  
**Reviewer:** Product Owner  
**Statusas:** ✅ Ready for Production

🚀 **DEPLOYMENT READY** 🚀

