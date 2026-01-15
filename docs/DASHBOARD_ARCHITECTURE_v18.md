# Dashboard Architecture v18.8+

**Versija:** v18.8.6  
**Data:** 2025-01-09  
**Statusas:** 🚧 In Development  
**Principas:** Role-Based Separation

---

## FILOSOFIJA

> **Different roles = Different dashboards.**  
> **NO shared UI. NO merged views. CLEAR separation.**

GA HARD MODE reikalauja **procedūrinio valdymo** (chair) ir **paprasto balsavimo** (member) atskyrimo.

**Kodėl?**
- **Physical Primacy** - Pirmininkas valdo susirinkimą fiziškai
- **Constitution First** - Procedūra ≠ paprasto balsavimo
- **Clarity** - Nariai nemato procedūrinių komplikacijų

---

## ARCHITECTURE

### **2 Separate Dashboards:**

```
/dashboard/[orgSlug]/
  ├─ chair/     ← Pirmininko pultas
  └─ member/    ← Nario sąsaja
```

**NO OVERLAP. NO SHARED COMPONENTS (except primitives).**

---

## CHAIR DASHBOARD

### **Route:**
```
/dashboard/[orgSlug]/chair
```

### **Access Control:**
- OWNER (always), OR
- BOARD with PIRMININKAS position

### **Purpose:**
Full procedural control of GA meetings

### **Features:**

#### 1. Status Bar
```
┌────────────────────────────────────────────────┐
│ Pirmininko pultas                              │
│ [Org Name] - GA procedūrinis valdymas          │
│                                                │
│ Rolė: PIRMININKAS    GA_MODE: PRODUCTION      │
└────────────────────────────────────────────────┘
```

#### 2. Upcoming/Active Meeting Card
- Next scheduled GA
- Countdown to meeting
- Quick actions

#### 3. Real-time Quorum Widget
```
📊 KVORUM

Aktyvūs nariai: 50
Balsavę nuotoliniu būdu: 18
Dalyvaujantys gyvai: 25
───────────────────────
IŠ VISO: 43 (no double-count)

Kvorum (50%): 25
Status: ✅ PASIEKTAS (+18)
```

#### 4. Procedural Agenda List
```
📋 DARBOTVARKĖ

⚙️ 1. Darbotvarkės tvirtinimas    [✅ PRIIMTA]
⚙️ 2. Pirmininko rinkimas          [⏳ BALSAVIMAS] [Uždaryti]
⚙️ 3. Sekretoriaus rinkimas        [🔒 Užrakinta]
   
   ↓ (locked until 1-3 approved)

🔒 4. Biudžeto tvirtinimas         [🔒 Užrakinta]
   ⚠️ Užrakinta, kol neužbaigti 2-3
```

#### 5. Live Attendance Registration
```
👥 DALYVIŲ REGISTRACIJA

☑️ Jonas Jonaitis        [Registruotas]
☐ Petras Petraitis      [Registruoti]
☁️ Ona Onaitė           [Balsavo nuotoliniu būdu]
   ↑ Disabled (remote voter)
```

#### 6. Aggregated Live Vote Input
```
🗳️ GYVAS BALSAVIMAS - Klausimas 2

Dalyvių gyvai: 25

Įveskite tik PRIEŠ ir SUSILAIKĖ:
PRIEŠ: [___] (0-25)
SUSILAIKĖ: [___] (0-25)

UŽ bus apskaičiuota automatiškai: 25 - prieš - susilaikė

[Registruoti rezultatus]
```

#### 7. Protocol Actions
```
📄 PROTOKOLAS

[Generuoti protokolo juodraštį (PDF)]
[Įkelti pasirašytą protokolą]

Status: ⚠️ Pasirašytas protokolas nėra
```

#### 8. Complete Meeting Button
```
[Užbaigti GA susirinkimą]

⚠️ Disabled (reikalavimai neįvykdyti):
  - ❌ Procedūriniai klausimai (2, 3) nepatvirtinti
  - ❌ Pasirašytas protokolas nėra

ARBA (jei OK):

[✅ Užbaigti GA susirinkimą]
```

---

## MEMBER DASHBOARD

### **Route:**
```
/dashboard/[orgSlug]/member
```

### **Access Control:**
- ACTIVE membership

### **Purpose:**
Simple, focused voting experience

### **Features:**

#### 1. Status Bar
```
┌────────────────────────────────────────────────┐
│ Mano balsavimas                                │
│ [Org Name] - Narių balsavimo sąsaja            │
│                                                │
│ Rolė: NARYS    Balsavimo teisė: TAIP          │
└────────────────────────────────────────────────┘
```

#### 2. Active Voting Card
```
🗳️ AKTYVUS BALSAVIMAS

Klausimas: 1. Darbotvarkės tvirtinimas

Nutarimo projektas:
[... tekstas ...]

⏱️ Liko: 2 dienos 5 valandos iki freeze
⚠️ Po freeze galėsite balsuoti tik gyvai susirinkime

[👍 UŽ] [👎 PRIEŠ] [➖ SUSILAIKAU]
```

#### 3. After Voting
```
✅ JŪSŲ BALSAS UŽFIKSUOTAS

Klausimas: 1. Darbotvarkės tvirtinimas
Mano balsas: UŽ
Balsavimo laikas: 2025-01-10 14:35
Receipt ID: #b4f23c...

[Peržiūrėti visus balsavimus]
```

#### 4. Freeze Warning
```
⚠️ NUOTOLINIS BALSAVIMAS UŽDARYTAS

Susirinkimas prasidėjo: 2025-01-15 10:00

Jūs nebalsavote nuotoliniu būdu šiems klausimams:
- 2. Pirmininko rinkimas
- 3. Sekretoriaus rinkimas

Dalyvaukite susirinkime gyvai, jei norite balsuoti.

[Žiūrėti susirinkimo detales]
```

---

## RESTRICTIONS

### **Member Dashboard NEVER shows:**
- ❌ Quorum calculations
- ❌ Other members' votes
- ❌ Procedural controls
- ❌ Attendance lists
- ❌ GA_MODE indicator
- ❌ Protocol actions

### **Chair Dashboard NEVER shows:**
- ❌ Individual ballot details (privacy)
- ❌ Member vote choices (only aggregates)

---

## DATA LOADERS

### **Separate loaders (NO SHARED):**

```
src/lib/dashboard/
  ├─ load-chair-dashboard.ts    ← Chair-specific data
  └─ load-member-dashboard.ts   ← Member-specific data
```

**Rules:**
- NO server role
- Only authenticated user context
- RLS enforced
- Server Actions for writes

---

## LEGACY DASHBOARD

### **Current Status:**

⚠️ Old dashboard still exists: `/dashboard/[orgSlug]/page.tsx`

**Plan:**
1. ✅ New dashboards created (stub)
2. ⏳ Implement full features
3. ⏳ Test new dashboards
4. ⏳ Move old to `_legacy/`
5. ⏳ Redirect old routes → new based on role

**Timeline:** Gradual migration during v18.9

---

## IMPLEMENTATION STATUS

### ✅ **Completed:**
- [x] Folder structure created
- [x] Routing implemented (`/chair`, `/member`)
- [x] Stub dashboards with auth checks
- [x] README.md updated

### 🚧 **In Progress:**
- [ ] Full Chair Dashboard UI
- [ ] Full Member Dashboard UI
- [ ] Data loaders (separate)
- [ ] Legacy dashboard deprecation
- [ ] Routing redirect logic

### ⏳ **Future:**
- [ ] Legacy dashboard move to `_legacy/`
- [ ] Full feature parity
- [ ] Remove old dashboard

---

## TESTING

### **Test Chair Access:**
```
1. Login as OWNER
2. Navigate to /dashboard/[slug]/chair
3. Should see: Pirmininko pultas
4. Should see: GA_MODE indicator
```

### **Test Member Access:**
```
1. Login as MEMBER (not OWNER)
2. Navigate to /dashboard/[slug]/member
3. Should see: Mano balsavimas
4. Should see: Balsavimo teisė status
```

### **Test Access Control:**
```
1. Login as non-chair member
2. Try /dashboard/[slug]/chair
3. Should redirect to /dashboard/[slug]
```

---

## CHANGELOG

**v18.8.6 (2025-01-09):**
- ✅ Created `/chair` route with stub
- ✅ Created `/member` route with stub
- ✅ Added README.md Dashboard Architecture section
- ✅ Auth checks implemented
- ✅ GA_MODE display
- ✅ Role-based access control

**Next (v18.9):**
- Full UI implementation
- Data loaders
- Legacy deprecation

---

**Autorius:** Branduolys AI  
**Statusas:** 🚧 Stub Complete, Full Implementation Needed

🎯 **DUAL DASHBOARD ARCHITECTURE INITIALIZED** 🎯

