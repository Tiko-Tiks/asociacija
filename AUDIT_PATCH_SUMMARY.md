# Audit Patch Summary - v17.0 Compliance

## Pakeitimai

### 1. ❌ SERVICE_ROLE PAŠALINTAS (Rule 6)

#### `src/app/actions/register-member.ts`
- **Pašalinta**: `createAdminClient()` import ir naudojimas
- **Pakeista**: Visi `adminSupabase` kvietimai pakeisti į `supabase` (public client)
- **Apribojimai**: 
  - Negalima kurti naujų vartotojų be service_role
  - Funkcija dabar grąžina klaidą naujiems vartotojams
  - Reikia, kad vartotojas pirmiausia užsiregistruotų per auth flow

#### `src/app/actions/invite-member.ts`
- **Pašalinta**: `createAdminClient()` naudojimas
- **Pakeista**: Email patikrinimas pašalintas (negalima patikrinti be service_role)
- **Pastaba**: Invite gali būti išsiųstas net neegzistuojančiam vartotojui

#### `src/app/actions/members.ts`
- **Pašalinta**: `createAdminClient()` naudojimas email gavimui
- **Pakeista**: Email map dabar tuščias (OWNER nemato email)
- **Pastaba**: Reikia RPC funkcijos arba kito sprendimo email gavimui

---

### 2. ❌ MEDIA_ITEMS PAŠALINTAS (v17.0 schema)

#### `src/app/actions/governance.ts` (Line 197-220)
- **Pašalinta**: `media_items` query su `url` stulpeliu
- **Pakeista**: Grąžinamas tuščias `protocols` array
- **Pastaba**: `media_items` lentelė neegzistuoja v17.0 schemoje

#### `src/app/actions/governance.ts` (Line 397-411)
- **Pašalinta**: `media_items` insert
- **Pakeista**: Protocol creation praleidžiamas su warning log
- **Pastaba**: Reikia implementuoti protocol creation pagal v17.0 schemą

---

## Rezultatas

### ✅ Ištaisyta:
1. ✅ Service_role pašalintas iš user-facing kodo
2. ✅ Media_items naudojimas pašalintas

### ⚠️ Apribojimai:
1. ⚠️ `register-member.ts` negali kurti naujų vartotojų
2. ⚠️ `invite-member.ts` negali patikrinti ar email egzistuoja
3. ⚠️ `members.ts` OWNER nemato email adresų
4. ⚠️ Protocol funkcionalumas neveikia (media_items neegzistuoja)

### 📝 Rekomendacijos:
1. Sukurti RPC funkcijas email patikrinimui ir gavimui
2. Implementuoti protocol funkcionalumą pagal v17.0 schemą
3. Perkelti user creation į auth flow
4. Dokumentuoti apribojimus

---

## Failai Pakeisti:
1. `src/app/actions/register-member.ts`
2. `src/app/actions/invite-member.ts`
3. `src/app/actions/members.ts`
4. `src/app/actions/governance.ts`

---

**Status**: ✅ **PATCH APPLIED** - Service_role violations fixed, media_items removed

