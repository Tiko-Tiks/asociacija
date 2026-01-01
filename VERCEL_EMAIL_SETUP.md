# Vercel Email Konfigūracija

## Reikalavimai

Email siuntimas Vercel production aplinkoje reikalauja:

1. **RESEND_API_KEY** nustatytas Vercel Environment Variables
2. **USE_SUPABASE_EDGE_FUNCTION=true** Vercel Environment Variables
3. **EMAIL_FROM** Vercel Environment Variables
4. **CORE_ADMIN_EMAIL** Vercel Environment Variables
5. Supabase secrets nustatyti (RESEND_API_KEY, EMAIL_FROM)

## Kaip Nustatyti Vercel Environment Variables

### Per Vercel Dashboard

1. Eikite į: https://vercel.com/dashboard
2. Pasirinkite projektą
3. Eikite į **Settings** → **Environment Variables**
4. Pridėkite:

```
RESEND_API_KEY=re_xxxxxxxxxxxxx
USE_SUPABASE_EDGE_FUNCTION=true
EMAIL_FROM=noreply@branduolys.lt
CORE_ADMIN_EMAIL=admin@branduolys.lt
```

5. Pasirinkite **Production**, **Preview**, ir **Development** aplinkas
6. Spauskite **Save**
7. **SVARBU:** Redeploy projektą, kad pakeitimai įsigaliotų

### Per Vercel CLI

```bash
vercel env add RESEND_API_KEY production
vercel env add USE_SUPABASE_EDGE_FUNCTION production
vercel env add EMAIL_FROM production
vercel env add CORE_ADMIN_EMAIL production
```

Tada redeploy:
```bash
vercel --prod
```

## Testavimas

### 1. Per Naršyklės Console

Atidarykite Developer Tools (F12) ir vykdykite:

```javascript
fetch("https://your-app.vercel.app/api/test-email", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ 
    to: "your-email@example.com", 
    testType: "custom" 
  })
})
.then(r => r.json())
.then(console.log)
```

### 2. Per PowerShell Script

```powershell
.\test-vercel-email.ps1 -Url "https://your-app.vercel.app" -Email "your-email@example.com"
```

### 3. Per cURL

```bash
curl -X POST https://your-app.vercel.app/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"to": "your-email@example.com", "testType": "custom"}'
```

## Patikrinimas

### 1. Vercel Logs

Eikite į Vercel Dashboard → **Deployments** → pasirinkite deployment → **Functions** → **View Function Logs**

Turėtumėte matyti:
- `EMAIL SENT via Supabase Edge Function` (jei sėkmingai)
- arba `EMAIL INCIDENT: ...` (jei klaida)

### 2. Supabase Logs

Eikite į: https://supabase.com/dashboard/project/ojqeramrgafryldehnlm/functions

Patikrinkite `send-email` funkcijos logs.

### 3. El. Pašto Dėžutė

Patikrinkite, ar gavote test email'ą.

## Troubleshooting

### Problema: "RESEND_API_KEY not found"

**Sprendimas:**
1. Patikrinkite Vercel Environment Variables
2. Įsitikinkite, kad kintamieji nustatyti **Production** aplinkai
3. Redeploy projektą

### Problema: "Edge Function error"

**Sprendimas:**
1. Patikrinkite Supabase secrets: `npx supabase secrets list`
2. Patikrinkite, ar Edge Function įdiegtas: `npx supabase functions list`
3. Patikrinkite Supabase Dashboard logs

### Problema: Email'ai log'inami, bet nesiunčiami

**Sprendimas:**
1. Patikrinkite, ar `USE_SUPABASE_EDGE_FUNCTION=true` Vercel Environment Variables
2. Patikrinkite, ar `RESEND_API_KEY` nustatytas tiek Vercel, tiek Supabase secrets
3. Patikrinkite Vercel Function logs

## SVARBU

- **Vercel Environment Variables** naudojami production aplinkoje
- **Supabase secrets** naudojami Edge Function viduje
- Abi vietos turi turėti `RESEND_API_KEY` nustatytą
- Po Environment Variables pakeitimų **BŪTINA** redeploy projektą

