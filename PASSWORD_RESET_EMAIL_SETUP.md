# Password Reset Email Setup

## Dabartinė Situacija

Password reset dabar eina per **Supabase Auth**:
- `supabase.auth.resetPasswordForEmail()` siunčia email'ą automatiškai
- Supabase naudoja savo email templates
- Email'as eina iš Supabase serverių

## Dvi Opcijos

### Opcija 1: Supabase Email Templates (Lengviau)

**Kaip veikia:**
- Supabase siunčia email'ą automatiškai
- Galite customizuoti templates Supabase Dashboard'e
- Nereikia papildomo kodo

**Konfigūracija:**
1. Eikite į **Supabase Dashboard** → **Authentication** → **Email Templates**
2. Pasirinkite **"Reset Password"** template
3. Redaguokite HTML ir text templates
4. Naudokite variables: `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .Token }}`

**Privalumai:**
- ✅ Lengva konfigūracija
- ✅ Automatinis email sending
- ✅ Nereikia papildomo kodo
- ✅ Veikia out of the box

**Trūkumai:**
- ❌ Ribotas dizaino kontrolė
- ❌ Supabase branding (galima pašalinti)
- ❌ Reikia konfigūruoti Supabase dashboard'e

### Opcija 2: Custom Email Sending (Daugiau Kontrolės)

**Kaip veikia:**
- Mūsų sistema siunčia email'ą per Resend API
- Naudojame mūsų email templates
- Pilnas dizaino kontrolė

**Reikia:**
- Sukurti custom password reset flow
- Naudoti Supabase `generateLink()` arba `admin.generateSignupToken()`
- Siųsti email per mūsų `sendEmail()` funkciją

**Privalumai:**
- ✅ Pilnas dizaino kontrolė
- ✅ Naudojame mūsų email templates
- ✅ Vieningas branding visuose email'uose
- ✅ Galime pritaikyti pagal mūsų dizainą

**Trūkumai:**
- ❌ Reikia daugiau kodo
- ❌ Reikia valdyti token generation
- ❌ Reikia sukurti custom reset flow

## Rekomendacija

**DABAR:** Naudokite **Opcija 1** (Supabase Templates), nes:
- Jau veikia
- Lengva konfigūruoti
- Nereikia papildomo kodo

**ATEITYJE:** Jei reikia pilno dizaino kontrolės, galite pereiti į **Opcija 2**.

## Kaip Konfigūruoti Supabase Templates

### 1. Eikite į Supabase Dashboard

1. Atidarykite: `https://supabase.com/dashboard`
2. Pasirinkite projektą
3. Eikite į **Authentication** → **Email Templates**

### 2. Redaguokite "Reset Password" Template

**HTML Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #3b82f6; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Bendruomenių Branduolys</h1>
  </div>
  
  <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
    <h2 style="color: #1e293b; margin: 0 0 16px 0;">Slaptažodžio atkūrimas</h2>
    
    <p style="margin: 0 0 20px 0; color: #475569;">
      Gavome užklausą atkurti jūsų slaptažodį. Spauskite mygtuką žemiau, kad nustatytumėte naują slaptažodį.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
        Atkurti slaptažodį
      </a>
    </div>
    
    <p style="margin: 20px 0 0 0; color: #64748b; font-size: 14px;">
      Jei mygtukas neveikia, nukopijuokite šią nuorodą į naršyklę:<br>
      <a href="{{ .ConfirmationURL }}" style="color: #3b82f6; word-break: break-all;">{{ .ConfirmationURL }}</a>
    </p>
    
    <p style="margin: 24px 0 0 0; color: #64748b; font-size: 12px;">
      Jei jūs nepateikėte šios užklausos, ignoruokite šį email'ą.
    </p>
  </div>
  
  <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 8px; text-align: center; color: #64748b; font-size: 12px;">
    <p style="margin: 0;">Bendruomenių Branduolys - Lietuvos bendruomenių platforma</p>
  </div>
</body>
</html>
```

**Text Template:**
```
Bendruomenių Branduolys - Slaptažodžio atkūrimas

Gavome užklausą atkurti jūsų slaptažodį.

Atkurti slaptažodį: {{ .ConfirmationURL }}

Jei jūs nepateikėte šios užklausos, ignoruokite šį email'ą.

Bendruomenių Branduolys
Lietuvos bendruomenių platforma
```

### 3. Naudojami Variables

- `{{ .ConfirmationURL }}` - Password reset link su token
- `{{ .Email }}` - User email
- `{{ .Token }}` - Reset token (jei reikia)
- `{{ .SiteURL }}` - Site URL

## Custom Email Sending (Opcija 2)

Jei norite naudoti mūsų email templates, reikia:

1. **Sukurti custom password reset flow:**
   - Generuoti reset token per Supabase Admin API
   - Siųsti email per mūsų `sendEmail()` funkciją
   - Naudoti mūsų email templates

2. **Pridėti password reset template:**
   - Sukurti `getPasswordResetEmail()` funkciją `email-templates.ts`
   - Naudoti mūsų dizainą

3. **Atnaujinti `forgotPassword` funkciją:**
   - Vietoj `resetPasswordForEmail()`, naudoti custom flow

**Pastaba:** Tai reikalauja daugiau kodo ir testavimo.

## Dabartinė Konfigūracija

**Status:** ✅ Naudojame Supabase `resetPasswordForEmail()`
**Email Templates:** ⏳ Reikia konfigūruoti Supabase Dashboard'e
**Custom Templates:** ❌ Nenaudojame (bet galime pridėti)

## Rekomendacija

**DABAR:**
1. Konfigūruokite Supabase email templates (žr. aukščiau)
2. Naudokite mūsų dizainą template'e
3. Testuokite password reset flow

**ATEITYJE:**
- Jei reikia daugiau kontrolės, galime pereiti į custom email sending
- Bet kol kas Supabase templates yra pakankami

