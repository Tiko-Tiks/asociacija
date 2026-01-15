# Performance Optimizations

Šis dokumentas aprašo optimizacijas, kurios pagerina sistemos veikimą.

## Next.js Optimizacijos

### 1. SWC Minification
- Naudojamas SWC (Speedy Web Compiler) greitesnei minifikacijai
- Konfigūracija: `next.config.js` → `swcMinify: true`

### 2. Console.log Removal
- Production build'e automatiškai pašalinami `console.log()` (išskyrus `error` ir `warn`)
- Sumažina bundle dydį ir pagerina veikimą

### 3. Package Import Optimization
- Optimizuoti `lucide-react` ir `@radix-ui/react-icons` importai
- Tree-shaking veikia efektyviau

## TypeScript Optimizacijos

### 1. Incremental Build
- Įjungtas `incremental: true` greitesniam kompiliavimui
- Build info saugomas `.next/cache/tsconfig.tsbuildinfo`

### 2. Skip Lib Check
- `skipLibCheck: true` praleidžia type checking node_modules
- Žymiai greitesnis build procesas

## Duomenų Bazės Optimizacijos

### Rekomendacijos:
1. **Naudokite specifinius laukus vietoj `select('*')`**
   - Sumažina duomenų perdavimą
   - Greitesnės užklausos
   - Mažiau atminties naudojimo

2. **Naudokite indeksus**
   - Įsitikinkite, kad dažnai naudojami laukai turi indeksus
   - Ypač svarbu `org_id`, `user_id`, `status` laukams

3. **Naudokite RLS policies efektyviai**
   - RLS veikia greičiau nei post-query filtravimas

## Build Cache Optimizacijos

### TypeScript Build Info
- Build info saugomas `.next/cache/` kataloge
- Pridėta į `.gitignore` kad nebūtų commit'inama

## Development Server Optimizacijos

### Greitesnis Hot Reload
- Next.js 14+ naudoja Turbopack (eksperimentinis)
- Greitesnis development server startas

## Rekomenduojamos Tolesnės Optimizacijos

1. **Image Optimization**
   - Naudokite Next.js `Image` komponentą
   - Konfigūruokite `next.config.js` image domains

2. **Code Splitting**
   - Naudokite `dynamic()` importus dideliems komponentams
   - Lazy loading svetainės sekcijoms

3. **Database Query Optimization**
   - Pakeiskite `select('*')` į specifinius laukus ten, kur įmanoma
   - Naudokite `select()` su tik reikalingais laukais

4. **Caching**
   - Naudokite Next.js `revalidate` statiniams puslapiams
   - Konfigūruokite ISR (Incremental Static Regeneration) kur įmanoma

5. **Bundle Analysis**
   - Naudokite `@next/bundle-analyzer` analizei
   - Identifikuokite didžiausius bundle'us

## Monitoring

### Performance Metrics
- Track build times
- Monitor bundle sizes
- Check database query performance

### Tools
- Next.js Analytics
- Vercel Analytics
- Supabase Query Performance

