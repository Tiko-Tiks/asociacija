# Custom Domain Setup - asociacija.net

## Apžvalga

Šis gidas paaiškina, kaip sukonfigūruoti tikrus subdomenus su `asociacija.net` domenu.

## Dvi Opcijos

### Opcija 1: Path-based Routing (Dabartinė - Jau Veikia)

**URL formatas:** `https://asociacija.net/c/[slug]`

**Pavyzdžiai:**
- `https://asociacija.net/c/branduolys`
- `https://asociacija.net/c/test-org`

**Privalumai:**
- ✅ Jau veikia be papildomų konfigūracijų
- ✅ Nereikia DNS konfigūracijos
- ✅ Veikia su Vercel out of the box
- ✅ Lengviau SEO (visi puslapiai tame domene)

**Trūkumai:**
- ❌ Ilgesni URL'ai
- ❌ Mažiau "branded" atrodo

### Opcija 2: Subdomain Routing (Reikia Konfigūracijos)

**URL formatas:** `https://[slug].asociacija.net`

**Pavyzdžiai:**
- `https://branduolys.asociacija.net`
- `https://test-org.asociacija.net`

**Privalumai:**
- ✅ Trumpesni, gražesni URL'ai
- ✅ Labiau "branded" atrodo
- ✅ Lengviau prisiminti

**Trūkumai:**
- ❌ Reikia DNS konfigūracijos
- ❌ Reikia Vercel custom domain setup
- ❌ Reikia Next.js middleware

## Kaip Sukonfigūruoti Subdomain Routing

### 1. DNS Konfigūracija

Pridėkite wildcard DNS record į jūsų DNS provider'į:

**Type:** `A` arba `CNAME`
**Name:** `*` (wildcard)
**Value:** Vercel IP arba CNAME target

**Pavyzdys (Cloudflare):**
```
Type: CNAME
Name: *
Content: cname.vercel-dns.com
Proxy: Off (DNS only)
```

**Pavyzdys (Namecheap, GoDaddy):**
```
Type: A
Host: *
Value: 76.76.21.21 (Vercel IP - patikrinkite Vercel docs)
```

### 2. Vercel Custom Domain Setup

1. Eikite į **Vercel Dashboard** → **Project Settings** → **Domains**
2. Pridėkite custom domain: `asociacija.net`
3. Pridėkite wildcard domain: `*.asociacija.net`
4. Vercel automatiškai sukonfigūruos SSL sertifikatus

### 3. Next.js Middleware (Jau Sukurtas)

Middleware jau sukurtas: `src/middleware.ts`

Jis automatiškai:
- Nuskaitys subdomain iš request header'io
- Rewrite'ins į `/c/[slug]` route
- Ignoruoja `www`, `api`, `admin` subdomenus

### 4. Environment Variables

Patikrinkite, ar turite:
- `NEXT_PUBLIC_APP_URL` = `https://asociacija.net` (production)
- Vercel automatiškai nustato `VERCEL_URL` per deployment

## Testavimas

### Testuokite Path-based Routing (Dabartinė)

```bash
# Local
curl http://localhost:3000/c/branduolys

# Production
curl https://asociacija.net/c/branduolys
```

### Testuokite Subdomain Routing (Po Konfigūracijos)

```bash
# Production
curl https://branduolys.asociacija.net
# Turėtų rewrite'inti į /c/branduolys
```

## Migracija iš Path-based į Subdomain

Jei norite pereiti į subdomain routing:

1. **Sukonfigūruokite DNS** (žr. aukščiau)
2. **Pridėkite domain į Vercel** (žr. aukščiau)
3. **Middleware jau yra** - `src/middleware.ts` jau sukurtas
4. **Testuokite** - patikrinkite, ar veikia
5. **Atnaujinkite email templates** - jei naudojate absoliučius URL'us

## Email Templates

Jei naudojate subdomain routing, atnaujinkite email templates:

```typescript
// src/lib/email-templates.ts
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://asociacija.net'

// Subdomain URL
const orgUrl = `https://${orgSlug}.asociacija.net`

// Arba path-based URL (dabartinė)
const orgUrl = `${APP_URL}/c/${orgSlug}`
```

## SEO Considerations

### Path-based (Dabartinė)
- ✅ Visi puslapiai tame domene - geresnis SEO
- ✅ Lengviau valdyti sitemap
- ✅ Vienas SSL sertifikatas

### Subdomain Routing
- ⚠️ Kiekvienas subdomain yra atskiras "site" SEO požiūriu
- ⚠️ Reikia atskirų sitemap'ų kiekvienam subdomain'ui
- ⚠️ Reikia wildcard SSL sertifikato (Vercel automatiškai)

## Rekomendacija

**DABAR:** Naudokite path-based routing (`/c/[slug]`), nes:
- Jau veikia
- Nereikia papildomų konfigūracijų
- Geresnis SEO
- Lengviau valdyti

**ATEITYJE:** Jei reikia subdomain routing'ų:
- Sukonfigūruokite DNS
- Pridėkite domain į Vercel
- Middleware jau paruoštas

## Troubleshooting

### Subdomain neveikia

1. **Patikrinkite DNS:**
   ```bash
   dig *.asociacija.net
   nslookup test.asociacija.net
   ```

2. **Patikrinkite Vercel:**
   - Ar domain pridėtas?
   - Ar SSL sertifikatas aktyvus?
   - Ar wildcard domain pridėtas?

3. **Patikrinkite Middleware:**
   - Ar `src/middleware.ts` egzistuoja?
   - Ar middleware matcher teisingas?

4. **Patikrinkite Logs:**
   - Vercel Function Logs
   - Browser Console
   - Network tab

### SSL Klaidos

- Vercel automatiškai sukonfigūruoja SSL
- Gali užtrukti iki 24 valandų
- Patikrinkite Vercel dashboard

## Dabartinė Konfigūracija

**Status:** ✅ Path-based routing veikia
**Middleware:** ✅ Sukurtas, bet neaktyvus (kol nėra custom domain)
**DNS:** ⏳ Nereikia (kol naudojame path-based)
**Vercel:** ⏳ Nereikia (kol naudojame path-based)

**Kitas žingsnis:** Jei norite subdomain routing, sekite instrukcijas aukščiau.

