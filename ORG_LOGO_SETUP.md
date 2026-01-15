# Organizacijos Logotipo Nustatymas

## SQL Migracija

Paleiskite SQL migraciją, kad pridėtumėte `logo_url` stulpelį į `orgs` lentelę:

```sql
-- Vykdyti sql/add_logo_to_orgs.sql
```

## Supabase Storage Bucket

**SVARBU**: Reikia sukurti Supabase Storage bucket logotipams prieš naudojant logo upload funkcionalumą.

### Kaip sukurti bucket:

1. **Eikite į Supabase Dashboard → Storage**
2. **Spauskite "New bucket" arba "Create bucket"**
3. **Nustatymai**:
   - **Bucket name**: `org-logos` (tiksliai taip, be tarpų, mažosiomis raidėmis)
   - **Public bucket**: ✅ **Taip** (svarbu - kad logotipai būtų viešai prieinami)
   - **File size limit**: `5MB` (arba palikite tuščią)
   - **Allowed MIME types**: `image/*` (arba palikite tuščią)
4. **Spauskite "Create bucket"**

### RLS Policies:

Po bucket sukūrimo, paleiskite RLS policies:

```sql
-- Paleiskite sql/create_org_logos_bucket.sql
-- Arba rankiniu būdu:

-- Allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload org logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'org-logos');

-- Allow public read access
CREATE POLICY "Public read access for org logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'org-logos');

-- Allow authenticated users to delete logos
CREATE POLICY "Authenticated users can delete org logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'org-logos');
```

**Daugiau informacijos**: Žiūrėkite `STORAGE_BUCKET_SETUP.md`

## Funkcionalumas

### 1. Logotipo Įkėlimas
- OWNER gali įkelti logotipą per `/dashboard/[slug]/settings`
- Maksimalus failo dydis: 5MB
- Leidžiami formatai: visi paveikslėlių formatai (image/*)
- Rekomenduojamas dydis: 200x200px

### 2. Logotipo Rodymas
- Logotipas rodomas:
  - Sidebar organizacijos perjungiklyje
  - Settings puslapyje
  - (Galima pridėti kitur, kur reikia)

### 3. Avatar Fallback
- Jei logotipo nėra, rodomas avataras su pirmomis dviem organizacijos pavadinimo raidėmis

## API Endpoints

### POST /api/org-logo/upload
Įkelia logotipą į Supabase Storage ir atnaujina `orgs.logo_url`.

**Body**: FormData
- `file`: Image file
- `orgId`: Organization ID

**Response**:
```json
{
  "success": true,
  "logoUrl": "https://..."
}
```

### POST /api/org-logo/remove
Pašalina logotipą iš `orgs.logo_url` ir ištrina failą iš Storage.

**Body**: JSON
```json
{
  "orgId": "uuid"
}
```

## Server Actions

### `updateOrgLogo(orgId, logoUrl)`
Atnaujina organizacijos logotipo URL.

### `getOrgLogo(orgId)`
Gauna organizacijos logotipo URL.

## Komponentai

### `OrgLogoUpload`
Komponentas logotipo įkėlimui ir valdymui.

**Props**:
- `orgId`: Organization ID
- `currentLogoUrl`: Current logo URL (optional)
- `orgName`: Organization name (for fallback)

## Naudojimas

1. Eikite į `/dashboard/[slug]/settings`
2. Raskite "Organizacijos logotipas" sekciją
3. Pasirinkite paveikslėlį
4. Spauskite "Įkelti"
5. Logotipas bus rodomas visur, kur naudojamas organizacijos perjungiklis

## Automatinis naudojimas dokumentuose

Kai organizacija turi logotipą, jis **automatiškai** naudojamas:

### 1. PDF Protokolai
- Logotipas rodomas PDF protokolų header'e
- Automatiškai naudojamas generuojant protokolus per `generateProtocolPdf()`

### 2. Logo Komponentas
- `Logo` komponentas automatiškai naudoja organizacijos logotipą, jei perduodamas `orgLogoUrl` prop
- Pavyzdys:
  ```tsx
  <Logo 
    variant="full" 
    orgLogoUrl={org.logo_url}
    orgName={org.name}
  />
  ```

### 3. Server Actions
- `getOrgLogoUrl(orgId)` - gauna logotipo URL pagal org ID
- `getOrgLogoUrlBySlug(orgSlug)` - gauna logotipo URL pagal org slug
- `getOrgLogoInfo(orgId)` - gauna logotipo URL ir organizacijos pavadinimą

### 4. Prioritetas
1. **Organizacijos logotipas** (`orgLogoUrl`) - jei nustatytas
2. Development custom logos - jei development mode
3. Default Branduolys logo - jei nieko nėra

## Integracija su esamais dokumentais

Visi nauji dokumentai ir protokolai automatiškai naudoja organizacijos logotipą, jei jis yra nustatytas. Nereikia jokių papildomų nustatymų - sistema automatiškai randa ir naudoja logotipą.

