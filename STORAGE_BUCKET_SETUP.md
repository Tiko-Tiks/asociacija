# Supabase Storage Bucket Setup - org-logos

## Klaida: "Bucket not found"

Jei gaunate klaidą `Bucket not found` bandant įkelti logotipą, reikia sukurti Storage bucket Supabase.

## Greitas sprendimas

### 1. Eikite į Supabase Dashboard
- Atidarykite [Supabase Dashboard](https://app.supabase.com)
- Pasirinkite savo projektą

### 2. Sukurkite Storage Bucket

**Būdas 1: Per Dashboard UI**
1. Eikite į **Storage** (kairėje meniu)
2. Spauskite **"New bucket"** arba **"Create bucket"**
3. Įveskite:
   - **Name**: `org-logos`
   - **Public bucket**: ✅ **Taip** (svarbu - kad logotipai būtų viešai prieinami)
   - **File size limit**: `5MB` (arba palikite tuščią)
   - **Allowed MIME types**: `image/*` (arba palikite tuščią)
4. Spauskite **"Create bucket"**

**Būdas 2: Per SQL (jei turite prieigą)**
```sql
-- Sukurti bucket per Storage API nėra galima per SQL
-- Reikia naudoti Dashboard UI arba Storage API
```

### 3. Nustatyti RLS Policies

Po to, kai bucket sukurtas, paleiskite RLS policies:

```sql
-- Eikite į Supabase Dashboard → SQL Editor
-- Įklijuokite ir vykdykite sql/create_org_logos_bucket.sql
```

Arba paleiskite policies rankiniu būdu:

```sql
-- Policy: Allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload org logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'org-logos');

-- Policy: Allow public read access to logos
CREATE POLICY "Public read access for org logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'org-logos');

-- Policy: Allow authenticated users to delete their org logos
CREATE POLICY "Authenticated users can delete org logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'org-logos');
```

## Patikrinimas

Po bucket sukūrimo:

1. Eikite į `/dashboard/[slug]/settings`
2. Bandykite įkelti logotipą
3. Jei vis dar gaunate klaidą, patikrinkite:
   - Ar bucket pavadinimas tiksliai `org-logos` (be tarpų, mažosiomis raidėmis)
   - Ar bucket yra **Public**
   - Ar RLS policies yra nustatytos

## Troubleshooting

### Klaida: "Bucket not found"
- ✅ Patikrinkite, ar bucket sukurtas
- ✅ Patikrinkite, ar bucket pavadinimas tikslus: `org-logos`

### Klaida: "Permission denied"
- ✅ Patikrinkite, ar RLS policies yra nustatytos
- ✅ Patikrinkite, ar bucket yra Public

### Klaida: "File too large"
- ✅ Patikrinkite, ar failo dydis ne didesnis nei 5MB
- ✅ Patikrinkite bucket file size limit

## Alternatyvus sprendimas (jei negalite sukurti bucket)

Jei negalite sukurti bucket dabar, galite:

1. **Laikinai komentuoti logo upload funkcionalumą** - dashboard vis tiek veiks
2. **Naudoti external URL** - įkelti logotipą kitur (pvz., Cloudinary) ir įvesti URL rankiniu būdu
3. **Palaukti, kol bus sukurtas bucket** - sistema veiks be logotipų

Logo funkcionalumas nėra kritinis - dashboard veiks ir be jo.

