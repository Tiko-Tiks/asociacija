# Email Secrets Nustatymas

## Problema

Email'ai nesiunčiami, nes `RESEND_API_KEY` nėra nustatytas kaip Supabase secret.

**SVARBU:** Edge Function naudoja Supabase secrets, ne `.env.local` failą!

## Sprendimas

### 1. Gaukite Resend API Key

Jei neturite Resend API key:

1. Eikite į: https://resend.com/api-keys
2. Prisijunkite arba užsiregistruokite
3. Spauskite "Create API Key"
4. Nukopijuokite API key (formatas: `re_xxxxxxxxxxxxx`)

### 2. Nustatykite Supabase Secrets

Vykdykite PowerShell/CMD terminale:

```powershell
# Pakeiskite re_xxxxxxxxxxxxx į jūsų tikrą Resend API key
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
npx supabase secrets set EMAIL_FROM=noreply@branduolys.lt
```

### 3. Patikrinkite, ar nustatyta

```powershell
npx supabase secrets list
```

Turėtumėte matyti `RESEND_API_KEY` ir `EMAIL_FROM` sąraše.

### 4. Įdiekite Edge Function (jei dar neįdiegtas)

```powershell
npx supabase functions deploy send-email
```

### 5. Testuokite Email Siuntimą

Atidarykite naršyklės Developer Tools (F12) ir vykdykite:

```javascript
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

Arba naudokite PowerShell:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/test-email" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"to": "your-email@example.com", "testType": "custom"}'
```

## Troubleshooting

### "Function not found" klaida

Įdiekite Edge Function:
```powershell
npx supabase functions deploy send-email
```

### "RESEND_API_KEY not found" klaida

Nustatykite secret:
```powershell
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
```

### Email'ai log'inami, bet nesiunčiami

1. Patikrinkite Supabase Dashboard logs: https://supabase.com/dashboard/project/ojqeramrgafryldehnlm/functions
2. Patikrinkite serverio console log'us
3. Patikrinkite, ar `USE_SUPABASE_EDGE_FUNCTION=true` `.env.local` faile

