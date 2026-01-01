# Admin Environment Variables Setup

## Reikalingi Environment Variables

Admin puslapiui reikia dviejų environment variables:

1. **`NEXT_PUBLIC_SUPER_ADMINS`** - Super admin user ID sąrašas
2. **`SUPABASE_SERVICE_ROLE_KEY`** - Supabase service role key

## 1. Pridėti NEXT_PUBLIC_SUPER_ADMINS

### Kaip gauti User ID

1. **Per Supabase Dashboard:**
   - Eikite į **Supabase Dashboard** → **Authentication** → **Users**
   - Raskite savo user'į (pagal email)
   - Nukopijuokite **User UID** (UUID formatas)

2. **Per aplikaciją:**
   - Prisijunkite į aplikaciją
   - Atidarykite browser console (F12)
   - Paleiskite: `localStorage.getItem('supabase.auth.token')` (arba patikrinkite cookies)
   - User ID yra JWT token'e

### Pridėti į Vercel

1. Eikite į **Vercel Dashboard**: `https://vercel.com/dashboard`
2. Pasirinkite projektą **"asociacija"**
3. Eikite į **Settings** → **Environment Variables**
4. Spauskite **Add New**
5. Pridėkite:
   - **Name:** `NEXT_PUBLIC_SUPER_ADMINS`
   - **Value:** `your-user-id-here` (UUID formatas)
   - **Environment:** Production, Preview, Development (visi)
   - Spauskite **Save**

**Pavyzdys:**
```
NEXT_PUBLIC_SUPER_ADMINS = "123e4567-e89b-12d3-a456-426614174000"
```

**Jei keli super admin'ai:**
```
NEXT_PUBLIC_SUPER_ADMINS = "uuid1,uuid2,uuid3"
```

## 2. Pridėti SUPABASE_SERVICE_ROLE_KEY

### Kaip gauti Service Role Key

1. Eikite į **Supabase Dashboard**: `https://supabase.com/dashboard`
2. Pasirinkite projektą
3. Eikite į **Settings** → **API**
4. Raskite **Project API keys** sekciją
5. Nukopijuokite **`service_role`** key (secret key)
   - ⚠️ **SVARBU:** Naudokite `service_role` key, NE `anon` key
   - ⚠️ **SVARBU:** Service role key turi `eyJ...` formatą (JWT token)

### Pridėti į Vercel

1. Eikite į **Vercel Dashboard**: `https://vercel.com/dashboard`
2. Pasirinkite projektą **"asociacija"**
3. Eikite į **Settings** → **Environment Variables**
4. Spauskite **Add New**
5. Pridėkite:
   - **Name:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** `eyJ...` (jūsų service role key)
   - **Environment:** Production, Preview, Development (visi)
   - ⚠️ **SVARBU:** Pažymėkite kaip **Sensitive** (slaptas)
   - Spauskite **Save**

**Pavyzdys:**
```
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 3. Re-deploy Projektą

Po environment variables pridėjimo:

1. **Automatinis re-deploy:**
   - Vercel automatiškai re-deploy'ins, jei auto-deploy įjungtas
   - Patikrinkite **Deployments** tab'ą

2. **Rankinis re-deploy:**
   - Eikite į **Deployments** tab'ą
   - Spauskite **Redeploy** ant paskutinio deployment'o
   - Pasirinkite **Use existing Build Cache** arba **Rebuild**

## 4. Patikrinti

### Patikrinkite Environment Variables

1. Eikite į **Vercel Dashboard** → **Settings** → **Environment Variables**
2. Turėtumėte matyti:
   - ✅ `NEXT_PUBLIC_SUPER_ADMINS` = `your-user-id`
   - ✅ `SUPABASE_SERVICE_ROLE_KEY` = `eyJ...` (masked)

### Testuokite Admin Puslapį

1. Eikite į: `https://asociacija.net/admin`
2. Turėtumėte matyti admin dashboard
3. Jei vis dar klaida, patikrinkite:
   - Ar user ID yra teisingas?
   - Ar service role key yra teisingas?
   - Ar re-deploy'inote po pridėjimo?

## Troubleshooting

### Problema: "Access denied" arba 404

**Patikrinkite:**
1. Ar `NEXT_PUBLIC_SUPER_ADMINS` yra nustatytas?
2. Ar jūsų user ID yra teisingas?
3. Ar re-deploy'inote po pridėjimo?

**Sprendimas:**
- Patikrinkite user ID formatą (turi būti UUID)
- Patikrinkite, ar nėra tarpų ar specialių simbolių
- Re-deploy'inkite projektą

### Problema: "SUPABASE_SERVICE_ROLE_KEY is not set"

**Patikrinkite:**
1. Ar `SUPABASE_SERVICE_ROLE_KEY` yra nustatytas Vercel'e?
2. Ar key yra teisingas (service_role, ne anon)?
3. Ar re-deploy'inote po pridėjimo?

**Sprendimas:**
- Patikrinkite, ar naudojate `service_role` key, ne `anon` key
- Patikrinkite key formatą (turi prasidėti `eyJ`)
- Re-deploy'inkite projektą

### Problema: "An error occurred in the Server Components render"

**Patikrinkite:**
1. Ar abu environment variables yra nustatyti?
2. Ar re-deploy'inote po pridėjimo?
3. Patikrinkite Vercel Function Logs

**Sprendimas:**
- Patikrinkite Vercel Function Logs (Settings → Logs)
- Patikrinkite, ar nėra klaidų server-side
- Re-deploy'inkite projektą

## Greitas Checklist

- [ ] Gauti User ID iš Supabase
- [ ] Pridėti `NEXT_PUBLIC_SUPER_ADMINS` į Vercel
- [ ] Gauti Service Role Key iš Supabase
- [ ] Pridėti `SUPABASE_SERVICE_ROLE_KEY` į Vercel
- [ ] Re-deploy'inti projektą
- [ ] Testuoti admin puslapį

## Svarbu

- ⚠️ **Service Role Key yra slaptas** - niekada necommit'inkite į git
- ⚠️ **Service Role Key turi visą prieigą** - naudokite atsargiai
- ⚠️ **User ID turi būti UUID formatas** - patikrinkite formatą
- ⚠️ **Re-deploy yra būtinas** - po environment variable pridėjimo

## Kitas Žingsnis

Po environment variables pridėjimo ir re-deploy:
1. Testuokite admin puslapį
2. Patikrinkite, ar visi funkcionalumai veikia
3. Patikrinkite Vercel Function Logs, jei yra klaidų

