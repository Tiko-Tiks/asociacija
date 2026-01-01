# Logo Development Mode Setup

## Aprašymas

Sistema palaiko gražų development mode, kur galite lengvai pridėti ir testuoti naujus logotipus.

## Funkcionalumas

### 1. Logo Komponentas

**Failas:** `src/components/ui/logo.tsx`

**Funkcijos:**
- ✅ Palaiko SVG logotipus (default)
- ✅ Palaiko vaizdo logotipus (PNG, JPG) per custom paths
- ✅ **Palaiko video logotipus (MP4, WebM, MOV)** 🎥
- ✅ Icon-only režimas (be teksto)
- ✅ Full režimas (su tekstu)
- ✅ Keli dydžiai: sm, md, lg, xl
- ✅ Automatinis fallback, jei custom logo neveikia
- ✅ Video autoplay, loop, muted palaikymas

### 2. Logo Konfigūracija

**Failas:** `src/lib/logo-config.ts`

**Environment Variables:**
```env
# .env.local
NEXT_PUBLIC_LOGO_PATH=/path/to/logo.png
NEXT_PUBLIC_LOGO_ICON_PATH=/path/to/logo-icon.png

# Video logo support
NEXT_PUBLIC_VIDEO_LOGO_PATH=/VideoLOGO.mp4
NEXT_PUBLIC_USE_VIDEO_LOGO=true
```

## Kaip naudoti

### 1. Pridėti vaizdo logotipą

1. **Pridėkite logotipą į `public/` katalogą:**
   ```bash
   # Pavyzdžiui:
   public/logo-custom.png
   public/logo-icon-custom.png
   ```

2. **Nustatykite environment variables `.env.local`:**
   ```env
   NEXT_PUBLIC_LOGO_PATH=/logo-custom.png
   NEXT_PUBLIC_LOGO_ICON_PATH=/logo-icon-custom.png
   ```

3. **Perkraukite development serverį:**
   ```bash
   npm run dev
   ```

### 2. Pridėti video logotipą 🎥

1. **Pridėkite video failą į `public/` katalogą:**
   ```bash
   # Pavyzdžiui:
   public/VideoLOGO.mp4
   ```

2. **Nustatykite environment variables `.env.local`:**
   ```env
   NEXT_PUBLIC_VIDEO_LOGO_PATH=/VideoLOGO.mp4
   NEXT_PUBLIC_USE_VIDEO_LOGO=true
   ```

3. **Perkraukite development serverį:**
   ```bash
   npm run dev
   ```

**Pastaba:** Video logotipas automatiškai:
- ✅ Autoplay (pradeda groti automatiškai)
- ✅ Loop (kartojasi)
- ✅ Muted (be garso)
- ✅ PlaysInline (veikia mobiliuose įrenginiuose)

### 3. Naudoti Logo komponentą

**Full logo (su tekstu):**
```tsx
import { Logo } from '@/components/ui/logo'
import { logoConfig } from '@/lib/logo-config'

<Logo
  variant="full"
  size="md"
  showText={true}
  customLogoPath={logoConfig.useCustomLogos ? logoConfig.fullLogoPath : undefined}
  useVideo={logoConfig.useVideoLogo}
  customVideoPath={logoConfig.useVideoLogo ? logoConfig.videoLogoPath : undefined}
/>
```

**Icon-only (be teksto):**
```tsx
<Logo
  variant="icon"
  size="xl"
  showText={false}
  customIconPath={logoConfig.useCustomLogos ? logoConfig.iconLogoPath : undefined}
  useVideo={logoConfig.useVideoLogo}
  customVideoPath={logoConfig.useVideoLogo ? logoConfig.videoLogoPath : undefined}
/>
```

**Video logo su custom nustatymais:**
```tsx
<Logo
  variant="full"
  size="lg"
  showText={true}
  useVideo={true}
  customVideoPath="/VideoLOGO.mp4"
  videoAutoplay={true}
  videoLoop={true}
  videoMuted={true}
/>
```

**Custom dydžiai:**
```tsx
<Logo
  variant="full"
  size="sm"  // sm, md, lg, xl
  showText={true}
/>

// Arba custom dydžiai:
<Logo
  variant="icon"
  width={100}
  height={100}
  showText={false}
/>
```

## Kur naudojamas

Logo komponentas naudojamas šiuose puslapiuose:
- ✅ `src/components/landing/landing-header.tsx` - Header
- ✅ `src/app/login/page.tsx` - Login puslapis
- ✅ `src/app/reset-password/page.tsx` - Password reset puslapis
- ✅ `src/app/register-community/page.tsx` - Registracijos puslapis

## Logo failai

### Default logotipai

- **Full logo:** `public/logo.svg` - Pilnas logotipas su visais elementais
- **Icon logo:** `public/logo-icon.svg` - Ikonizuota versija (tik centrinis elementas)

### Custom logotipai (development mode)

Galite pridėti bet kokius logotipus į `public/` katalogą ir nurodyti juos per environment variables.

**Palaikomi formatai:**
- SVG (rekomenduojama - geriausia kokybė)
- PNG (su permatomumu)
- JPG (be permatomumo)
- **MP4 (video logotipas)** 🎥
- WebM (video logotipas)
- MOV (video logotipas)

## Rekomendacijos

1. **SVG formatas** - geriausia kokybė bet kokiu dydžiu
2. **Ikonizuota versija** - turėtų būti kvadratinė (1:1 aspect ratio)
3. **Full logo** - gali būti horizontalus (pvz., 2:1 aspect ratio)
4. **Video logotipas:**
   - Rekomenduojamas MP4 formatas (geriausias palaikymas)
   - Optimizuokite failo dydį (< 2MB rekomenduojama)
   - Naudokite H.264 codec geriausiam palaikymui
   - Rekomenduojamas 16:9 arba 1:1 aspect ratio
5. **Dydžiai:**
   - Icon: 64x64px arba didesnis (SVG)
   - Full: 200x80px arba didesnis (SVG)
   - Video: 1920x1080px arba mažesnis (optimizuotas)

## Troubleshooting

### Logo neatsiranda

1. **Patikrinkite, ar failas yra `public/` kataloge**
2. **Patikrinkite environment variables `.env.local`**
3. **Perkraukite development serverį**
4. **Patikrinkite browser console dėl klaidų**

### Logo atrodo blogai

1. **Naudokite SVG formatą** - geriausia kokybė
2. **Patikrinkite aspect ratio** - icon turėtų būti kvadratinė
3. **Optimizuokite failo dydį** - SVG turėtų būti < 50KB

### Development mode neveikia

1. **Patikrinkite `NODE_ENV`** - turi būti `development`
2. **Patikrinkite environment variables** - turi prasidėti su `NEXT_PUBLIC_`
3. **Perkraukite serverį** po environment variables pakeitimų

## Production

Production režime custom logos nebus naudojami - visada bus naudojami default logotipai (`/logo.svg` ir `/logo-icon.svg`).

Jei norite pakeisti logotipus production'e, tiesiog pakeiskite `public/logo.svg` ir `public/logo-icon.svg` failus.

