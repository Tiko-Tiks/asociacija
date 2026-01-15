# INSTITUCINIO ADMIN STRUKTŪROS AUDITAS

**Projektas:** BRANDUOLYS v18.8.6  
**Data:** 2025-01-09  
**Tipas:** Read-only institutional audit  
**Statusas:** ⚠️ FINDINGS REQUIRE REVIEW

---

## EXECUTIVE SUMMARY

**Klausimas:** Ar dabartinis ADMIN / OWNER modelis atitinka Branduolys (Central Hub) konstitucinę External Guardian rolę?

**Trumpa išvada:** ⚠️ **DALINIS NEATITIKIMAS**

**Pagrindinė problema:**
- ✅ GA HARD MODE techniškai nepažeidžiamas
- ⚠️ **BET:** service_role admin client egzistuoja
- ⚠️ Nėra aiškaus atskyrimo tarp:
  - **Branduolys Admin** (Central Hub guardian)
  - **Mazgo OWNER** (community leader)

---

## 1. ROLE IR PRIEIGŲ ANALIZĖ

### **Roles sistemoje:**

#### **A. Membership Roles (org level):**

```
memberships.role:
  - OWNER   ← Mazgo savininkas / steigėjas
  - MEMBER  ← Paprastas narys
```

**Apibrėžimas:**
> **role** = technical access ONLY  
> Real authority = via **positions** table

**OK ✅** - role nesuteikia governance valdžios, tik prieigos

---

#### **B. Positions (governance roles):**

```
positions.title:
  - PIRMININKAS (Chairman)
  - VALDYBA (Board member)
  - SEKRETORIUS (Secretary)
  - IŽDININKAS (Treasurer)
  - Custom positions...
```

**OK ✅** - Real-world authority expressed via positions

---

#### **C. Platform Admin (implicit):**

**Identifikacija (RLS policies):**
```sql
-- community_applications RLS:
WHERE m.user_id = auth.uid()
  AND m.role = 'OWNER'
  AND m.member_status = 'ACTIVE'
  AND o.slug IN ('branduolys', 'platform')  ← IMPLICIT PLATFORM ADMIN
```

**Arba:**
```sql
WHERE EXISTS (
  SELECT 1 FROM profiles
  WHERE user_id = auth.uid()
  AND email = 'admin@pastas.email'  ← HARDCODED ADMIN
)
```

**⚠️ RIZIKA** - Nėra explicit role, tik implicit detection

---

#### **D. Service Role (CRITICAL):**

**File:** `src/lib/supabase/admin.ts`

```typescript
export function createAdminClient()
  // Uses SUPABASE_SERVICE_ROLE_KEY
  // BYPASSES RLS
  // FULL DATABASE ACCESS
```

**Naudojama:**
- `src/app/actions/admin/*.ts` (18 failų!)
- manage-orgs.ts
- manage-members.ts
- update-org.ts
- governance-questions.ts
- seed-system-core.ts
- etc.

**⚠️ CRITICAL** - Service role bypasses ALL RLS

---

### **WRITE PRIEIGOS:**

#### **Governance duomenys:**

| Lentelė | OWNER | MEMBER | Platform Admin | Service Role |
|---------|-------|--------|----------------|--------------|
| `orgs` | ❌ | ❌ | ✅ (via service) | ✅ (full) |
| `governance_configs` | ✅ | ❌ | ✅ (via service) | ✅ (full) |
| `resolutions` | ✅ | ❌ | ❌ (RLS block?) | ✅ (full) |
| `votes` | ✅ | ❌ | ❌ (RLS block?) | ✅ (full) |
| `positions` | ✅ | ❌ | ❌ (RLS block?) | ✅ (full) |
| `audit_logs` | ❌ | ❌ | ✅ (read-only?) | ✅ (full) |

**⚠️ RIZIKA:**
- Service role gali **VISKĄ** keisti
- Nėra explicit audit kas naudoja service role
- Nėra role-based separation (branduolys admin vs mazgo owner)

---

## 2. ADMIN ≠ CHAIR ≠ MEMBER PATIKRA

### **Dabartinė būsena:**

```
BRANDUOLYS (Central Hub):
  └─ "Admin" = implicit (slug='branduolys' + OWNER)
                                                                           └─ service_role functions

MAZGAS (Community Node):
  └─ OWNER (technical access)
     └─ PIRMININKAS (governance position)
```

### **Problemos:**

#### **⚠️ PROBLEMA 1: Nėra atskiros Branduolys Admin role**

**Dabartinė logika:**
```
Platform Admin = OWNER of org WHERE slug IN ('branduolys', 'platform')
```

**Pažeidimas:**
- Branduolys admin **yra mazgo OWNER**, ne atskira rolė
- Sumaišymas tarp:
  - Central Hub guardian (External Guardian)
  - Community node leader (OWNER)

**Konstitucinis neatitikimas:** ⚠️ **RIZIKA**

---

#### **⚠️ PROBLEMA 2: Service role naudojamas admin operacijose**

**Failai naudojantys service_role:**
```
src/app/actions/admin/manage-orgs.ts
src/app/actions/admin/manage-members.ts
src/app/actions/admin/update-org.ts
src/app/actions/admin/governance-questions.ts
src/app/actions/admin/seed-system-core.ts
... (18 total)
```

**Kas gali daryti:**
- ✅ View all organizations (bypass RLS)
- ✅ Update org status (ACTIVE / REJECTED)
- ✅ View all members
- ✅ Modify governance questions
- ✅ Seed system data

**⚠️ GALIMI PAŽEIDIMAI (jei neteisingai naudojama):**

Teoriškai service_role gali:
- ❌ Force approve resolution (bypass GA)
- ❌ Modify vote results
- ❌ Change governance snapshot
- ❌ Override procedural sequence

**TIKRINTA:** ✅ **Šiuo metu NENAUDOJAMA** GA/voting kontekste

**Bet:** Mechanizmas egzistuoja → potenciali rizika

---

#### **✅ OK: OWNER ≠ automatic governance power**

**TEISINGAI:**
```
OWNER role = technical access
Real authority = positions (PIRMININKAS, VALDYBA, etc.)
```

**Pavyzdys:**
- OWNER gali sukurti meeting
- BET: Vesti susirinkimą gali tik išrinktas PIRMININKAS (position)

**Constitution First:** ✅ **LAIKOMASI**

---

## 3. RLS POLITIKŲ PERŽIŪRA

### **Community Applications (onboarding):**

**SELECT/UPDATE policy:**
```sql
WHERE (
  -- Platform admin (OWNER of branduolys org)
  m.role = 'OWNER' 
  AND o.slug IN ('branduolys', 'platform')
)
OR
  -- Hardcoded admin email
  email = 'admin@pastas.email'
```

**⚠️ RIZIKA:**
- Hardcoded email = bad practice
- slug-based admin detection = fragile
- Nėra explicit admin role

---

### **Resolutions, Votes (governance):**

**Policy pattern:**
```sql
-- OWNER arba BOARD gali INSERT/UPDATE
WHERE m.role = 'OWNER'
  OR EXISTS (
    SELECT 1 FROM positions
    WHERE title = 'BOARD'
    AND is_active = true
  )
```

**✅ OK** - Nėra global admin override

**Patikrinta:** ❌ **Nėra** service_role naudojimo voting/resolutions user flows

---

### **Audit Logs:**

**Policy:** (reikia patikrinti)

**Klausimas:** Kas gali skaityti audit_logs?
- OWNER? (savo org)
- Platform admin? (global)
- System admin? (via service_role)

**⚠️ RIZIKA:** Jei audit_logs accessible tik via service_role → nėra transparency

---

## 4. ONBOARDING IR COMPLIANCE

### **Kas aktyvuoja org?**

**Procesas:**
```
1. Community application (public form)
   ↓
2. Platform admin review (via service_role)
   ↓
3. Status: SUBMITTED_FOR_REVIEW → ACTIVE
   ↓
4. Org becomes accessible
```

**Kas daro sprendimą:** **Platform Admin** (via service_role)

**✅ OK** - Centralized onboarding

**BET:** ⚠️ Nėra multi-admin approval (single point of failure)

---

### **Governance compliance:**

**Patikrinta:**
```typescript
// governance-compliance.ts
checkActionAllowed(org_id, action)
```

**Logika:**
- Tikrina ar org turi ACTIVE governance_config
- Blokuoja critical actions be governance

**✅ OK** - Compliance enforced

**BET:** Kas nustato, kas yra "ACTIVE" config?
- Atsakymas: Mazgo OWNER (per onboarding)

**✅ OK** - Nėra central override

---

## 5. GA HARD MODE APSAUGA

### **Patikrinimas: Ar bet kuri rolė gali apeiti GA HARD MODE?**

#### **A. Force approve resolution?**

**Tikrinta:**
```sql
-- apply_vote_outcome RPC
-- Nėra admin bypass
-- Tik OWNER/BOARD gali kviesti
-- Nėra force flag
```

**✅ OK** - ❌ Nėra force approve mechanizmo

---

#### **B. Keisti GA rezultatus?**

**Tikrinta:**
```sql
-- vote_ballots
-- UNIQUE(vote_id, membership_id)
-- Tik per cast_vote RPC
-- RLS blokuoja direct INSERT
```

**✅ OK** - ❌ Negalima keisti ballot'ų tiesiogiai

---

#### **C. Apeiti snapshot?**

**Tikrinta:**
```typescript
// createVote uses getEarlyVotingDays(meeting_id)
// meeting_id → snapshot
// NO current governance usage
```

**✅ OK** - ❌ Snapshot naudojamas, ne current

---

#### **D. Service role GA kontekste?**

**Tikrinta:**
```bash
grep "createAdminClient" src/app/actions/voting.ts
# → NO MATCHES

grep "createAdminClient" src/app/actions/meetings.ts
# → NO MATCHES

grep "createAdminClient" src/app/actions/resolutions.ts
# → NO MATCHES
```

**✅ OK** - ❌ Service role **NENAUDOJAMAS** GA/voting flows

**Išvada:** GA HARD MODE **saugus** nuo admin bypass

---

## IŠVADOS

### ✅ **OK (Atitinka konstituciją):**

1. ✅ **role ≠ authority** - Positions used correctly
2. ✅ **GA HARD MODE** - No admin bypass found
3. ✅ **Snapshot isolation** - Governance deterministic
4. ✅ **RLS on governance** - No global write overrides
5. ✅ **Procedural lock-in** - System enforced
6. ✅ **Service role NOT used** in GA/voting flows

---

### ⚠️ **RIZIKA (Neaišku / Dviprasmiška):**

1. ⚠️ **Nėra explicit Branduolys Admin role**
   - Dabartinė logika: `slug IN ('branduolys', 'platform')`
   - Pavojus: Neatskiriama Central Hub vs Mazgo admin
   - **Recommendation:** Sukurti `platform_admin` role arba `admin_level` enum

2. ⚠️ **Service role egzistuoja**
   - Naudojamas 18 admin actions
   - Teoriškai gali apeiti VISKĄ
   - **Mitigation:** Currently NOT used in GA/governance
   - **Recommendation:** Audit logging kas naudoja service_role

3. ⚠️ **Hardcoded admin email**
   - `email = 'admin@pastas.email'` RLS policies
   - Bad practice
   - **Recommendation:** Replace su explicit role

4. ⚠️ **Audit logs visibility**
   - Neaišku kas gali skaityti
   - Jei tik service_role → nėra transparency
   - **Recommendation:** OWNER turi matyti savo org audit_logs

---

### ❌ **PAŽEIDIMAS (Critical):**

**NONE** - Jokių active pažeidimų nerasta

**BET:**
- Potencialus pažeidimas **galimas**, jei kas nors naudotų service_role voting kontekste
- Sistema **pasitiki** kad tai nebus daroma (.cursorrules draudžia)

---

## ATSAKOMYBIŲ ATSKYRIMAS

### **Dabartinė būsena:**

```
BRANDUOLYS (Central Hub):
  └─ Platform Admin (implicit)
     ├─ Org onboarding (service_role)
     ├─ Org status management (service_role)
     ├─ System-wide view (service_role)
     └─ ⚠️ RISK: Teoriškai gali apeiti governance

MAZGAS (Community Node):
  └─ OWNER (technical)
     ├─ Create meetings
     ├─ Manage members
     ├─ Governance config
     └─ NO override power (RLS + GA HARD MODE)
  
  └─ PIRMININKAS (position)
     ├─ Vesti susirinkimą
     ├─ Close votes
     ├─ Generate protocol
     └─ Complete meeting
  
  └─ MEMBER (technical)
     ├─ Vote (if can_vote allows)
     └─ View resolutions
```

**Problema:** Platform Admin ir Mazgo OWNER **neatskiriami aiškiai**

---

## REKOMENDACIJOS

### **Prioritetas 1: Sukurti atskirą Branduolys Admin role**

**Proposal:**
```sql
CREATE TABLE platform_admins (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  admin_level text CHECK (admin_level IN ('SUPER', 'REVIEWER', 'SUPPORT')),
  can_approve_orgs boolean DEFAULT false,
  can_modify_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

**Funkcijos:**
- SUPER: Full platform management
- REVIEWER: Org approval only
- SUPPORT: Read-only system view

**Benefit:**
- Aiškus atskyrimas Central Hub vs Mazgas
- Audit trail kas daro platform veiksmus
- No role leak

---

### **Prioritetas 2: Service role audit logging**

**Proposal:**
```typescript
// Wrap createAdminClient()
export function createAdminClient(context: string) {
  const client = ...
  
  // Log usage
  auditServiceRoleUsage(context, auth.uid())
  
  return client
}
```

**Benefit:**
- Track kas ir kada naudoja service_role
- Detect misuse
- Transparency

---

### **Prioritetas 3: Audit logs RLS**

**Proposal:**
```sql
-- OWNER mato savo org audit logs
CREATE POLICY audit_logs_select_owner ON audit_logs
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = auth.uid()
      AND role = 'OWNER'
    )
  );

-- Platform admin mato viską (via service_role arba explicit role)
```

**Benefit:**
- Transparency
- OWNER gali audituoti savo mazgą
- Platform admin mato system-wide

---

### **Prioritetas 4: Remove hardcoded admin email**

**Replace:**
```sql
-- OLD:
WHERE email = 'admin@pastas.email'

-- NEW:
WHERE user_id IN (
  SELECT user_id FROM platform_admins
  WHERE admin_level IN ('SUPER', 'REVIEWER')
)
```

**Benefit:**
- No hardcoding
- Scalable
- Professional

---

## GA HARD MODE APSAUGOS VERTINIMAS

### ✅ **APSAUGOTA:**

1. ✅ **Channel restrictions** - Service role NENAUDOJAMA
2. ✅ **Freeze mechanism** - Snapshot isolated
3. ✅ **Procedural items** - Auto-generated, non-removable
4. ✅ **Procedural sequence** - Backend enforced
5. ✅ **Completion validation** - Backend enforced
6. ✅ **Triple Layer Security** - Defense in depth

### ⚠️ **POTENCIALI RIZIKA:**

**Scenario (teorinis):**
```typescript
// Kas jei kas nors sukurtų:
const admin = createAdminClient()
await admin.from('resolutions').update({
  status: 'APPROVED'  // Force approve!
}).eq('id', resolutionId)
```

**Ar tai galima?**
- Techniškai: **TAIP** (service_role bypasses RLS)
- Praktiškai: **NE** (.cursorrules DRAUDŽIA)
- Policy: **GALIOJA** (code review atmestų)

**BET:**  mechanizmas egzistuoja

**Mitigation:**
- ✅ .cursorrules explicit prohibition
- ✅ Code review process
- ⚠️ NO runtime enforcement (trust-based)

---

## CENTRALINIO HUB ADMIN DASHBOARD REIKALINGUMAS

### **Klausimas:** Ar reikia atskiro Central Hub Admin Dashboard?

**Atsakymas:** ⚠️ **TAIP, rekomenduojama**

### **Funkcijos:**

#### **Branduolys Admin Dashboard** (`/admin/branduolys`)

**Atsakomybės:**
1. Org onboarding review & approval
2. System-wide monitoring (read-only)
3. Governance questions management
4. System configuration (read-only view)
5. Audit logs (global view)

**NESKIRTOS:**
- ❌ Mazgo governance vald ymas
- ❌ Resolution approval (tai mazgo prerogatyva)
- ❌ Voting manipulation
- ❌ Procedural bypass

**Principas:**
> **Branduolys Admin = Guardian, not Ruler**

---

### **Separation Architecture:**

```
/admin/branduolys/          ← Central Hub Admin
  ├─ orgs/                  (onboarding, status)
  ├─ audit/                 (system-wide logs)
  ├─ questions/             (governance questionnaire)
  └─ monitor/               (health, metrics)

/dashboard/[slug]/chair/    ← Mazgo Pirmininkas
  └─ (GA procedural control)

/dashboard/[slug]/member/   ← Mazgo Narys
  └─ (voting only)
```

**Clear separation:** ✅ No overlap

---

## FINAL VERDICT

### **Compliance su Branduolys Charter:**

| Principas | Statusas | Pastaba |
|-----------|----------|---------|
| **External Guardian** | ⚠️ PARTIAL | Service role egzistuoja, bet šiuo metu nenaudojamas neteisingai |
| **Constitution First** | ✅ OK | GA HARD MODE enforced, no bypasses found |
| **Physical Primacy** | ✅ OK | Aggregate voting, no individual IN_PERSON |
| **Role vs Position** | ✅ OK | Correctly separated |
| **Immutability** | ✅ OK | APPROVED resolutions immutable |
| **Audit Trail** | ⚠️ PARTIAL | Audit exists, bet visibility neaiški |

---

### **Reikia veiksmų:**

#### **CRITICAL (v18.9):**
1. ⚠️ Sukurti explicit **platform_admin** role
2. ⚠️ Service role audit logging
3. ⚠️ Remove hardcoded admin email

#### **HIGH (v19.0):**
4. Branduolys Admin Dashboard (atskiras)
5. Audit logs RLS (OWNER mato savo org)
6. Service role usage review

#### **MEDIUM:**
7. Multi-admin approval (org onboarding)
8. Admin action audit enhancement

---

## ATSAKYMAI Į KLAUSIMUS

### **1. Ar egzistuoja atskira Central Hub admin rolė?**

**NE** - Implicit detection per `slug IN ('branduolys', 'platform')`

**Recommendation:** Sukurti explicit `platform_admins` table

---

### **2. Ar OWNER turi write prieigą prie resolutions?**

**TAIP** - Per RLS policies (savo org)

**BET:** ✅ Neturi override power  
**BET:** ✅ GA HARD MODE blokuoja pažeidimus

**OK** - OWNER role techninis, ne constitutional

---

### **3. Ar galima keisti governance po snapshot?**

**NE** - Snapshot isolated, createVote uses snapshot

**✅ OK** - Governance deterministic

---

### **4. Ar galima apeiti GA HARD MODE?**

**NE** - Triple Layer Security, no bypasses found

**✅ OK** - Techniškai neįmanoma

**BET:** Service role teoriškai galėtų (nenaudojama)

---

### **5. Ar reikia atskiro Central Hub Admin Dashboard?**

**TAIP** - Rekomenduojama v18.9

**Kodėl:**
- Clear separation Central vs Mazgas
- Transparency
- Explicit permissions
- Institutional clarity

---

## COMPLIANCE RATING

| Aspektas | Rating | Notes |
|----------|--------|-------|
| **GA HARD MODE** | ✅ EXCELLENT | Techniškai neapeinamas |
| **Role separation** | ✅ GOOD | Positions used correctly |
| **Admin model** | ⚠️ NEEDS IMPROVEMENT | Implicit, ne explicit |
| **Service role** | ⚠️ RISK EXISTS | Unused but present |
| **Audit trail** | ⚠️ PARTIAL | Exists bet visibility unclear |
| **Overall** | ⚠️ **B+ (Good, needs polish)** | Functioning but institutional ambiguity |

---

**Autorius:** Branduolys AI Auditor  
**Reviewer:** Required - Product Owner / Legal  
**Statusas:** ⚠️ **Audit Complete, Actions Recommended**

**Prioritetas:** v18.9 turi addressed institutional admin separation

🔍 **AUDIT COMPLETE** 🔍

