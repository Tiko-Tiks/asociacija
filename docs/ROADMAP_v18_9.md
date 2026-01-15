# ROADMAP v18.9+ - Post GA HARD MODE

**Current Version:** v18.8.6 MVP  
**Status:** GA HARD MODE Complete, MVP Dashboards Ready  
**Next:** Stabilization → Modules → Polish

---

## FILOSOFIJA

> **Stability before features. Features before beauty.**

**Principai:**
1. **MVP stabilizacija** - Užrakinti baseline
2. **Module isolation** - Vienas modulis vienu metu
3. **Constitution First** - Finansai/projektai neįtakoja GA
4. **UI last** - Funkcionalumas pirma, grožis paskutinis

---

## 1️⃣ STABILIZUOTI MVP (PRIORITY 1)

### **Privalomi veiksmai:**

#### **A. Baseline tag**
```bash
git tag v18.8.6-mvp
git push --tags
```

**Kodėl:** Turėti aiškų "last known good" state

#### **B. Route freeze**
```
❌ Jokių naujų features /chair arba /member be atskiro sprendimo
✅ Tik bug fixes
✅ Tik GA HARD MODE enforcement improvements
```

#### **C. End-to-end testing:**

**Test scenario:**
```
1. CREATE GA (DRAFT)
   ✅ Items 1-3 automatiškai sukurti
   ✅ Metadata: is_procedural = true

2. PUBLISH
   ✅ Governance snapshot išsaugotas
   ✅ Votes sukurti visiems items
   ✅ Validation: procedural items egzistuoja

3. MEMBER VOTE (REMOTE - prieš freeze)
   ✅ Navigate: /member
   ✅ See active votes
   ✅ Cast vote: FOR
   ✅ See "Mano balsas"

4. FREEZE (meeting.scheduled_at)
   ✅ Bandyti balsuoti REMOTE → Blokuoja
   ✅ Message: "Nuotolinis balsavimas uždarytas"

5. CHAIR ACTIONS
   ✅ Navigate: /chair
   ✅ See quorum widget
   ✅ Close votes for items 1-3
   ✅ Apply outcomes → APPROVED
   ✅ Items 4+ unlocked

6. COMPLETE (TEST režimu)
   ✅ Bandyti complete be protocol → Leidžia (TEST)
   ✅ metadata.test_only = true

7. COMPLETE (PRODUCTION režimu)
   ❌ Bandyti complete be protocol → Blokuoja
   ✅ Upload protocol → Leidžia
   ✅ Meeting status → COMPLETED
```

**Jei VISI tests ✅ → MVP STABLE**

---

## 2️⃣ FINANSŲ MODULIS (READ-ONLY)

### **Principas:**

> **Finansai neįtakoja GA, jie tik informuoja.**

### **Scope:**

#### **Phase 1: Read-only integracija Chair dashboarde**

**Komponentas:** `<FinanceSummaryPanel />`

**Rodo (tik skaičiai):**
```
💰 Finansų santrauka:

Sąskaitų skaičius: 12
Skolos suma: 450 EUR
Atviri įsipareigojimai: 3
```

**Props:**
```typescript
{
  invoices_count: number
  total_debt: number
  open_commitments: number
}
```

**Data source:**
```typescript
// load-chair-dashboard.ts
const finance = await loadFinanceSummary(org.id)
```

#### **Phase 2: Separate Finance dashboard (jei reikia)**

**Route:** `/dashboard/[slug]/finance`

**Funkcionalumas:**
- Sąskaitų sąrašas
- Skolų sąrašas
- Mokėjimų istorija

**SVARBU:**
- ❌ **Jokių mokėjimų** per Finance dashboard
- ❌ **Jokių skolų keitimo**
- ✅ Tik viewing
- ✅ Mokėjimai tik per atskirą flow (reikalauja audit)

### **Nedaryti:**

❌ Finance voting integration (finansai ≠ balsavimas)  
❌ Auto-debt calculation in GA  
❌ Finance permissions override  

**Finance yra informacinis sluoksnis, ne governance.**

---

## 3️⃣ PROJEKTŲ MODULIS (ATSKIRAS CIKLAS)

### **Principas:**

> **Projects ≠ Resolutions. Constitution First.**

### **Taisyklės:**

```
APPROVED Resolution → MAY create Project
Project → CANNOT create Resolution

Projektas yra OPERATIONAL artifact, ne legal decision.
```

### **Architecture:**

**Atskiras dashboard:** `/dashboard/[slug]/projects`

**Flow:**
```
1. GA → Resolution APPROVED
   ↓
2. OWNER creates Project from Resolution
   ↓
3. Project has:
   - Budget (derived from Resolution)
   - Timeline
   - Responsible members
   - Pledges
   ↓
4. Project completion ≠ Legal act
```

### **Prohibitions:**

❌ Project voting (nėra quorum, nėra procedūros)  
❌ Project auto-creates resolutions  
❌ Project bypasses GA  

**Projectai vykdomi po GA sprendimų, ne prieš.**

---

## 4️⃣ UI/UX (TIK PO STABILIZACIJOS)

### **Kada:**

```
✅ GA → stabilus (v18.8.6 tested)
✅ Finance → read-only integracija
✅ Projects → atskirti

Tada (v19.0+):
```

### **Galima:**

- ✅ Normalizuoti komponentus (reusable primitives)
- ✅ Vizualiniai sluoksniai (colors, spacing, icons)
- ✅ Animacijos (subtle, not distracting)
- ✅ Responsive design (mobile)
- ✅ Accessibility (WCAG 2.2)

### **Vis dar draudžiama:**

❌ Merge Chair ir Member dashboards  
❌ "Smart UI" kuri apeina backend validation  
❌ Feature flags GA HARD MODE  
❌ UI shortcuts apeinant procedūrą  

**UI serves logic, not replaces it.**

---

## PRIORITETŲ SEKA (STRICT)

```
Priority 1: GA HARD MODE stabilization
  └─ v18.8.6 MVP testing
  └─ Bug fixes only
  └─ No new features

Priority 2: Finance read-only
  └─ <FinanceSummaryPanel />
  └─ Separate finance dashboard (optional)
  └─ NO mutations yet

Priority 3: Projects isolation
  └─ Separate project dashboard
  └─ Clear Resolution → Project flow
  └─ NO voting, NO quorum

Priority 4: UI/UX normalization
  └─ Component library
  └─ Visual system
  └─ Responsive + A11y

Priority 5: Advanced features
  └─ Real-time updates
  └─ Mobile app
  └─ AI assistant integration
```

**Bet kokia nukrypimas nuo sekos → STOP ir REVIEW.**

---

## TESTING PROTOCOL

### **MVP Stabilization test:**

```bash
# 1. SQL deployed?
psql -c "SELECT pg_get_functiondef('public.can_cast_vote'::regproc);"
# Should contain: "[GA HARD MODE VARTŲ SARGAS]"

# 2. ENV set?
echo $GA_MODE
# Should be: TEST

# 3. Dashboards accessible?
curl http://localhost:3000/dashboard/test-org/chair
curl http://localhost:3000/dashboard/test-org/member
# Should return 200 (or redirect if not auth)

# 4. E2E test
npm run test:e2e:ga
# Should pass all scenarios
```

---

## CHANGE FREEZE ZONES

### **FROZEN (no changes without approval):**

- `sql/modules/voting/` - GA HARD MODE core
- `src/lib/config/ga-mode.ts` - Configuration
- `src/lib/governance/snapshot.ts` - Snapshot mechanism
- `src/lib/meetings/procedural-items.ts` - Procedural enforcement
- `src/lib/meetings/ga-completion.ts` - Completion validation

### **ACTIVE DEVELOPMENT:**

- `src/components/chair/` - Chair components (polish)
- `src/components/member/` - Member components (polish)
- `src/lib/dashboard/` - Data loaders (enhancements)

### **FUTURE:**

- `src/lib/finance/` - Finance module (new)
- `src/lib/projects/` - Projects module (new)

---

## ROLLBACK STRATEGY

### **If MVP fails testing:**

1. **SQL Rollback:**
   ```bash
   # Restore from backup
   # OR git checkout previous version
   ```

2. **Code Rollback:**
   ```bash
   git revert --no-commit v18.8.6-mvp..HEAD
   git commit -m "Rollback to v18.8.6-mvp"
   ```

3. **Environment:**
   ```bash
   GA_MODE=TEST  # Safest
   ```

---

## SUCCESS CRITERIA

### **v18.8.6 considered STABLE when:**

- [ ] End-to-end GA test passes (DRAFT → COMPLETE)
- [ ] No GA_HARD_MODE bypasses found
- [ ] Chair dashboard functional
- [ ] Member dashboard functional
- [ ] PRODUCTION mode tested (with protocol)
- [ ] TEST mode tested (without protocol)
- [ ] Zero SQL errors in logs
- [ ] Zero RLS violations
- [ ] Documentation accurate

### **Then proceed to v18.9.**

---

## v18.9 SCOPE (TENTATIVE)

**Finance Module:**
- Read-only summary in Chair dashboard
- Separate finance dashboard (optional)
- NO mutations (view only)

**Projects Module:**
- Separate projects dashboard
- Resolution → Project flow
- NO voting mechanism

**Dashboard enhancements:**
- Attendance registration UI (Chair)
- Live vote entry UI (Chair)
- Voting history (Member)

**Timeline:** 2-4 weeks after MVP stabilization

---

## v19.0 SCOPE (FUTURE)

**UI/UX Normalization:**
- Component library
- Design system
- Mobile responsive
- WCAG 2.2 compliance

**Advanced Features:**
- Real-time quorum updates
- Push notifications
- Email voting receipts
- AI meeting assistant

**Timeline:** 2-3 months after v18.9

---

## ANTI-PATTERNS (DO NOT DO)

❌ **Merge dashboards** - Chair ≠ Member  
❌ **Feature flags for GA HARD MODE** - It's law, not option  
❌ **"Quick fixes" in frozen zones** - Use proper process  
❌ **UI shortcuts** - Backend validation is authoritative  
❌ **Refactor for beauty** before stability  

**Discipline = Institutional integrity.**

---

**Autorius:** Branduolys AI  
**Approved:** Product Owner  
**Status:** ✅ Roadmap Defined

🗺️ **CLEAR PATH FORWARD** 🗺️

