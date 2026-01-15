# Nario registracijos flow - optimizuotas aprašymas

## Apžvalga

Tikslas: leisti naujam nariui užsiregistruoti per viešą bendruomenės puslapį ir sukurti membership su teisingu statusu.

Srautas:
1. Vieša registracijos forma `/c/[slug]`
2. `registerMember` server action
3. Membership sukūrimas (ACTIVE arba PENDING)
4. El. laiškai nariui ir (jei reikia) OWNER
5. Revalidate viešą puslapį

---

## 1. Vie?a registracijos forma

**Komponentas:** `src/components/public/member-registration-form.tsx`  
**Vieta:** `/c/[slug]`

Laukai:
- El. paštas (privalomas)
- Vardas (neprivalomas)
- Pavardė (neprivalomas)

Veikimas:
- Validuoja el. paštą
- Iškviečia `registerMember`
- Parodo sėkmės arba klaidos žinutę

---

## 2. Server action: registerMember

**Failas:** `src/app/actions/register-member.ts`

### Validacijos ir patikros
1. El. paštas (formatas, trim, lowercase)
2. Organizacija pagal slug:
   - turi egzistuoti
   - turi būti `ACTIVE`
3. Dublikatai:
   - jei membership `ACTIVE` -> klaida
   - jei membership `PENDING` -> klaida

### Governance nustatymai
Naudojama `get_governance_string(p_org_id, 'new_member_approval', 'chairman')`.

Reikšmės:
- `auto` -> narys aktyvuojamas iš karto
- `chairman` / `board` / `members` -> reikia patvirtinimo

### Membership suk?rimas
**Jei vartotojas egzistuoja:**
- sukuriamas arba atnaujinamas membership

**Jei vartotojas neegzistuoja:**
- sukuriamas auth vartotojas (email_confirm = false)
- sukuriamas profilis
- sukuriamas membership

Membership logika:
- `memberships.status` visada `ACTIVE`
- `member_status` = `ACTIVE` arba `PENDING`

### Slaptažodžio valdymas

**Naujiems vartotojams:**
- Generuojamas laikinas slaptažodis: `Math.random().toString(36).slice(-12) + ...` (3 kartus)
- Slaptažodis saugomas tik vartotojo sukūrimo metu (negrąžinamas)
- Vartotojas turi naudoti "Pamiršau slaptažodį" funkciją prisijungimo puslapyje

**El. laiške:**
- Jei `requiresApproval = true`: nurodoma naudoti "Pamiršau slaptažodį" funkciją
- Jei `requiresApproval = false`: nurodoma naudoti "Pamiršau slaptažodį" funkciją

**Kodas:** `src/app/actions/register-member.ts`

### Email Confirmation

**Naujiems vartotojams:**
- Vartotojai sukuriami su `email_confirm: false`
- Vartotojas turi patvirtinti email prieš pilną prieigą
- Email confirmation vykdoma per Supabase Auth

**Svarbu:**
- Email confirmation nereikalaujama registracijos metu
- Vartotojas gali registruotis ir gauti membership net be email confirmation
- Email confirmation reikalinga tik pilnai prieigai prie sistemos

---

## 3. El. laiškai

1. **Nariui:** `getMemberRegistrationEmail`
   - jei `requiresApproval = true` -> informacija apie patvirtinimą
   - jei `requiresApproval = false` -> sveikinimas ir prisijungimas
   - jei narys neturi slaptažodžio, nurodoma naudoti "Pamiršau slaptažodį" prisijungimo puslapyje

2. **OWNER:** `getMemberRegistrationOwnerNotificationEmail`
   - siunčiamas tik jei reikia patvirtinimo
   - nuoroda į `/dashboard/[slug]/members`

El. laiškai yra soft-fail (klaida neblokuoja proceso).

---

## 4. Audit logging

**Action:** `MEMBER_REGISTRATION`  
Įrašas kuriamas į `audit_logs` (soft-fail režimas).

---

## 5. Revalidation

Po s?kmingos registracijos:  
`revalidatePath('/c/[slug]')`

---

## Testavimo scenarijai

1. Naujas vartotojas, `new_member_approval = auto`
2. Naujas vartotojas, `new_member_approval = chairman`
3. Esamas vartotojas, registracija į naują bendruomenę
4. Dublikatai (ACTIVE ir PENDING)
5. Neaktyvi bendruomenė (registracija blokuojama)
