# Test Email Siuntimo Instrukcijos

## Kaip išsiųsti test email'ą

### 1. Nustatykite RESEND_API_KEY kaip Supabase Secret

Jei turite `RESEND_API_KEY` `.env.local` faile, nustatykite jį kaip Supabase secret:

```powershell
# Pakeiskite re_xxxxxxxxxxxxx į jūsų tikrą API key
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
npx supabase secrets set EMAIL_FROM=noreply@branduolys.lt
```

**SVARBU:** Edge Function naudoja secrets, ne `.env.local` failą!

### 2. Testuokite Email Siuntimą

#### A) Per API (Rekomenduojama)

**Vykdykite PowerShell/CMD terminale:**

```powershell
# Testinis email (custom)
curl -X POST http://localhost:3000/api/test-email `
  -H "Content-Type: application/json" `
  -d '{"to": "your-email@example.com", "testType": "custom"}'

# Admin notification email
curl -X POST http://localhost:3000/api/test-email `
  -H "Content-Type: application/json" `
  -d '{"to": "admin@branduolys.lt", "testType": "admin", "registrationData": {"communityName": "Test Bendruomenė", "email": "test@example.com"}}'

# Confirmation email
curl -X POST http://localhost:3000/api/test-email `
  -H "Content-Type: application/json" `
  -d '{"to": "user@example.com", "testType": "confirmation", "registrationData": {"communityName": "Test Bendruomenė"}}'
```

#### B) Per Browser Console (Development)

Atidarykite naršyklės Developer Tools (F12) ir vykdykite:

```javascript
// Test email
fetch('/api/test-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'your-email@example.com',
    testType: 'custom'
  })
})
.then(r => r.json())
.then(console.log)
```

### 3. Patikrinkite Serverio Console Log'us

Patikrinkite terminalą, kur veikia `npm run dev`. Turėtumėte matyti:

- `EMAIL SENT via Supabase Edge Function` - jei email išsiųstas sėkmingai
- `EMAIL INCIDENT: ...` - jei yra klaida

### 4. Patikrinkite Supabase Dashboard

Eikite į: https://supabase.com/dashboard/project/ojqeramrgafryldehnlm/functions

Ten matysite:
- Edge Function logs
- Klaidas (jei yra)
- Secrets status

## Troubleshooting

### Problema: Email'ai nesiunčiami

1. **Patikrinkite, ar RESEND_API_KEY nustatytas:**
   ```powershell
   npx supabase secrets list
   ```
   Turėtumėte matyti `RESEND_API_KEY` sąraše.

2. **Patikrinkite, ar Edge Function veikia:**
   - Eikite į Supabase Dashboard -> Functions
   - Patikrinkite logs

3. **Patikrinkite serverio console:**
   - Jei matote `EMAIL INCIDENT`, patikrinkite klaidos pranešimą

### Problema: "RESEND_API_KEY not found"

**Sprendimas:** Nustatykite secret:
```powershell
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
```

### Problema: Email'ai log'inami, bet nesiunčiami

**Sprendimas:** 
- Patikrinkite, ar `USE_SUPABASE_EDGE_FUNCTION=true` `.env.local` faile
- Patikrinkite, ar `RESEND_API_KEY` nustatytas kaip Supabase secret
- Patikrinkite Edge Function logs Supabase Dashboard

