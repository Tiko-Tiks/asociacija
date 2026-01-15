# Finansų flow - galutinis aprašymas

## Apžvalga

Finansų modulis apima sąskaitų generavimą, peržiūrą ir statusų valdymą.
Sistema registruoja faktinius finansinius įrašus ir jų būsenas, nenaudoja
simuliacijų ar automatinių sprendimų be aiškaus veiksmo.

---

## 1. Pagrindiniai puslapiai

- **Sąskaitos (organizacija):** `/dashboard/[slug]/invoices`
- **Narių dashboard:** rodo neapmokėtų sąskaitų santrauką ir veda į `/dashboard/[slug]/invoices`
- **Legacy:** `/dashboard/invoices` -> redirect į `/dashboard/[slug]/invoices`

---

## 2. S?skait? per?i?ra

**Server action:** `listOrganizationInvoices` (`src/app/actions/invoices.ts`)

Logika:
- Vartotojas autentifikuojamas per `auth.uid()`.
- Org kontekstas gaunamas iš aktyvios narystės.
- Sąskaitos parenkamos tik pagal narystės org (RLS).
- Nario vardas gaunamas per `memberships -> profiles`.

---

## 3. Metini? s?skait? generavimas

**Server action:** `generateInvoices` (`src/app/actions/invoices.ts`)  
**RPC:** `generate_annual_invoices`

Logika:
- Org ID gaunamas iš aktyvios narystės (source of truth).
- Generavimo logiką vykdo DB RPC.

---

## 4. Rankinis s?skaitos suk?rimas

**Server action:** `createInvoice` (`src/app/actions/invoices.ts`)

Logika:
- Reikalaujama aktyvi organizacija (guard).
- S?skaita sukuriama su `status = SENT`.
- RLS u?tikrina prieig? ir org ribas.

---

## 5. S?skaitos statuso keitimas

**Server action:** `updateInvoiceStatus` (`src/app/actions/invoices.ts`)  
**Papildomas guard:** `src/app/(dashboard)/dashboard/invoices/actions/updateInvoiceStatus.ts`

Logika:
- Org ID i?vedamas i? pa?ios s?skaitos (ne i? klient? duomen?).
- Reikalaujama aktyvi naryst? ir OWNER rol?.
- Statuso keitimas leid?iamas tik per server action.

---

## 6. Statusai ir reik?m?s

**Konstantos:** `src/app/domain/constants.ts`
- `SENT` - išsiųsta
- `PAID` - apmokėta
- `OVERDUE` - pradelsta

**Pastaba:** `DRAFT` statusas naudojamas sąskaitoms, bet nėra eksportuojamas kaip konstanta. DRAFT statusas naudojamas sąskaitoms, kurios dar neišsiųstos.

**Statusų perėjimai:**
- `DRAFT → SENT`: Leidžiama tik OWNER su aktyviu membership
- `SENT → PAID`: Dar neimplementuota (būsimas funkcionalumas)
- `SENT → OVERDUE`: Dar neimplementuota (būsimas funkcionalumas, automatinis)

**Kodas:** `src/app/(dashboard)/dashboard/invoices/actions/updateInvoiceStatus.ts` (lines 90-98, 161-168)

---

## 7. Saugumo principai

- RLS riboja sąskaitas tik pagal organizacijos narystę.
- Org kontekstas visada gaunamas iš DB, ne iš UI.
- Kritiniai veiksmai vykdomi tik per server actions.

---

## Testavimo scenarijai

1. OWNER atidaro `/dashboard/[slug]/invoices` ir mato sąrašą.
2. OWNER sukuria sąskaitą -> patikrinamas `status = SENT` (ne DRAFT).
3. OWNER bando keisti statusą -> tik server action, tik `DRAFT → SENT` perėjimas.
4. MEMBER mato savo sąskaitas ir neapmokėtų sąskaitų įspėjimą.
5. Patikrinti, kad DRAFT statusas naudojamas sąskaitoms (nors nėra konstantoje).
6. Patikrinti, kad kiti statuso perėjimai (SENT → PAID, SENT → OVERDUE) dar neimplementuoti.
