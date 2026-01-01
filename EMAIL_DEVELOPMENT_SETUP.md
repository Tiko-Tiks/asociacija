# Email Development Mode Setup

## Problema

Development mode negauna email'ų - email'ai tik log'inami į console, bet ne siunčiami.

## Sprendimas

Pagerinta email siuntimo sistema, kad veiktų development mode su Resend API.

## Kaip įjungti email siuntimą development mode

### 1. Gaukite Resend API Key

1. **Eikite į:** https://resend.com
2. **Sukurkite paskyrą** (jei neturite)
3. **Eikite į:** API Keys
4. **Sukurkite naują API Key**
5. **Nukopijuokite** API Key (prasideda su `re_`)

### 2. Pridėkite į `.env.local`

```env
# Resend API Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
```

**Svarbu:**
- `EMAIL_FROM` turi būti patvirtintas Resend'e
- Jei neturite patvirtinto domeno, naudokite `onboarding@resend.dev` (testavimui)

### 3. Perkraukite development serverį

```bash
# Sustabdyti serverį (Ctrl+C)
npm run dev
```

## Kaip veikia dabar

### Development Mode (be RESEND_API_KEY)

- ✅ Email'ai **log'inami** į console su visais detalėmis
- ✅ Galite matyti, ką būtų siunčiama
- ❌ Email'ai **ne siunčiami** tikriems gavėjams

### Development Mode (su RESEND_API_KEY)

- ✅ Email'ai **siunčiami** per Resend API
- ✅ Veikia kaip production
- ✅ Galite testuoti visą email flow

### Production

- ✅ Naudoja Supabase Edge Function (jei `USE_SUPABASE_EDGE_FUNCTION=true`)
- ✅ Arba naudoja Resend API tiesiogiai (jei `RESEND_API_KEY` nustatytas)
- ✅ Fallback į logging, jei niekas neveikia

## Email Siuntimo Prioritetas

1. **Supabase Edge Function** (jei `USE_SUPABASE_EDGE_FUNCTION=true`)
2. **Resend API tiesiogiai** (jei `RESEND_API_KEY` nustatytas)
3. **Console logging** (development fallback)

## Testavimas

### 1. Patikrinkite console output

Kai siunčiate registraciją, terminal'e turėtumėte matyti:

**Be RESEND_API_KEY:**
```
================================================================================
📧 EMAIL (DEVELOPMENT MODE - NOT SENT):
================================================================================
To: user@example.com
From: noreply@branduolys.lt
Subject: Jūsų paraiška gauta - Branduolys
---
HTML Preview:
...
================================================================================
💡 TIP: Set RESEND_API_KEY in .env.local to send real emails in development
================================================================================
```

**Su RESEND_API_KEY:**
```
EMAIL SENT via Resend API: {
  to: 'user@example.com',
  subject: 'Jūsų paraiška gauta - Branduolys',
  id: 'abc123...'
}
```

### 2. Patikrinkite email'ą

Jei `RESEND_API_KEY` nustatytas:
- Email'ai bus siunčiami tikriems gavėjams
- Patikrinkite inbox (ir spam folder)

## Troubleshooting

### Email'ai vis dar negaunami

1. **Patikrinkite RESEND_API_KEY:**
   ```bash
   # Terminal'e:
   echo $RESEND_API_KEY
   # Arba patikrinkite .env.local
   ```

2. **Patikrinkite EMAIL_FROM:**
   - Turi būti patvirtintas Resend'e
   - Arba naudokite `onboarding@resend.dev` testavimui

3. **Patikrinkite console logs:**
   - Terminal'e turėtumėte matyti email siuntimo log'us
   - Jei yra klaidos, jos bus rodomos

4. **Patikrinkite Resend Dashboard:**
   - Eikite į https://resend.com/emails
   - Patikrinkite, ar email'ai buvo siunčiami
   - Patikrinkite, ar nėra klaidų

### Resend API klaidos

Jei gaunate klaidas:
- **401 Unauthorized** - Neteisingas API Key
- **422 Unprocessable** - Neteisingas `EMAIL_FROM` (nepatvirtintas domenas)
- **429 Too Many Requests** - Per daug užklausų (free tier limit)

## Rekomendacijos

1. **Development:**
   - Naudokite `onboarding@resend.dev` kaip `EMAIL_FROM` testavimui
   - Arba patvirtinkite savo domeną Resend'e

2. **Production:**
   - Naudokite patvirtintą domeną
   - Nustatykite `USE_SUPABASE_EDGE_FUNCTION=true` (jei naudojate Edge Function)
   - Arba naudokite `RESEND_API_KEY` tiesiogiai

## Dabartinė situacija

- ✅ Email siuntimo sistema pagerinta
- ✅ Palaiko Resend API development mode
- ✅ Geresnis logging ir error handling
- ⏳ Reikia pridėti `RESEND_API_KEY` į `.env.local`

