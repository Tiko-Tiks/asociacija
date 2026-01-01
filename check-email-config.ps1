# Email Konfigūracijos Patikrinimas
# Tikrina, ar viskas paruošta email siuntimui

Write-Host "=== EMAIL KONFIGŪRACIJOS PATIKRINIMAS ===" -ForegroundColor Cyan
Write-Host ""

$allOk = $true

# 1. Supabase Edge Function
Write-Host "1. Supabase Edge Function..." -ForegroundColor Yellow
try {
    $functions = npx supabase functions list 2>&1 | Out-String
    if ($functions -match "send-email") {
        Write-Host "   [OK] Edge Function 'send-email' įdiegtas" -ForegroundColor Green
    } else {
        Write-Host "   [X] Edge Function 'send-email' nerastas" -ForegroundColor Red
        Write-Host "      Vykdykite: npx supabase functions deploy send-email" -ForegroundColor Gray
        $allOk = $false
    }
} catch {
    Write-Host "   [!] Nepavyko patikrinti" -ForegroundColor Yellow
}

# 2. Supabase Secrets
Write-Host ""
Write-Host "2. Supabase Secrets..." -ForegroundColor Yellow
try {
    $secrets = npx supabase secrets list 2>&1 | Out-String
    
    if ($secrets -match "RESEND_API_KEY") {
        Write-Host "   [OK] RESEND_API_KEY nustatytas" -ForegroundColor Green
    } else {
        Write-Host "   [X] RESEND_API_KEY nerastas" -ForegroundColor Red
        Write-Host "      Vykdykite: npx supabase secrets set RESEND_API_KEY=re_xxxxx" -ForegroundColor Gray
        $allOk = $false
    }
    
    if ($secrets -match "EMAIL_FROM") {
        Write-Host "   [OK] EMAIL_FROM nustatytas" -ForegroundColor Green
    } else {
        Write-Host "   [!] EMAIL_FROM nerastas (neprivalomas, bet rekomenduojamas)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   [!] Nepavyko patikrinti secrets" -ForegroundColor Yellow
}

# 3. Vercel Environment Variables (negaliu patikrinti automatiškai)
Write-Host ""
Write-Host "3. Vercel Environment Variables (reikia patikrinti rankiniu būdu)..." -ForegroundColor Yellow
Write-Host "   Eikite į: https://vercel.com/dashboard" -ForegroundColor Gray
Write-Host "   Settings → Environment Variables" -ForegroundColor Gray
Write-Host ""
Write-Host "   Reikalingi kintamieji:" -ForegroundColor White
Write-Host "   [ ] RESEND_API_KEY=re_xxxxxxxxxxxxx" -ForegroundColor Gray
Write-Host "   [ ] USE_SUPABASE_EDGE_FUNCTION=true" -ForegroundColor Gray
Write-Host "   [ ] EMAIL_FROM=noreply@branduolys.lt" -ForegroundColor Gray
Write-Host "   [ ] CORE_ADMIN_EMAIL=admin@branduolys.lt" -ForegroundColor Gray
Write-Host ""
Write-Host "   SVARBU: Po pakeitimų reikia redeploy projektą!" -ForegroundColor Yellow

# 4. Local .env.local (jei naudojate)
Write-Host ""
Write-Host "4. Local .env.local..." -ForegroundColor Yellow
if (Test-Path ".env.local") {
    Write-Host "   [OK] .env.local failas egzistuoja" -ForegroundColor Green
    
    $envContent = Get-Content ".env.local" -Raw
    if ($envContent -match "USE_SUPABASE_EDGE_FUNCTION") {
        Write-Host "   [OK] USE_SUPABASE_EDGE_FUNCTION nustatytas" -ForegroundColor Green
    } else {
        Write-Host "   [!] USE_SUPABASE_EDGE_FUNCTION nerastas" -ForegroundColor Yellow
    }
} else {
    Write-Host "   [!] .env.local failas nerastas (neprivalomas production)" -ForegroundColor Yellow
}

# Rezultatas
Write-Host ""
Write-Host "=== REZULTATAS ===" -ForegroundColor Cyan
if ($allOk) {
    Write-Host "[OK] Supabase konfigūracija paruošta!" -ForegroundColor Green
    Write-Host ""
    Write-Host "SVARBU: Patikrinkite Vercel Environment Variables!" -ForegroundColor Yellow
    Write-Host "Jei visi kintamieji nustatyti, email siuntimas turėtų veikti." -ForegroundColor White
} else {
    Write-Host "[!] Yra trūkstamų konfigūracijų" -ForegroundColor Yellow
    Write-Host "Ištaisykite aukščiau nurodytas problemas." -ForegroundColor White
}

Write-Host ""
Write-Host "Testavimas:" -ForegroundColor Cyan
Write-Host "1. Per naršyklės console (F12) Vercel deployment'e:" -ForegroundColor White
Write-Host '   fetch("/api/test-email", {' -ForegroundColor Gray
Write-Host '     method: "POST",' -ForegroundColor Gray
Write-Host '     headers: { "Content-Type": "application/json" },' -ForegroundColor Gray
Write-Host '     body: JSON.stringify({ to: "test@example.com", testType: "custom" })' -ForegroundColor Gray
Write-Host '   }).then(r => r.json()).then(console.log)' -ForegroundColor Gray
Write-Host ""
Write-Host "2. Arba per PowerShell (jei deployment neapsaugotas):" -ForegroundColor White
Write-Host '   .\test-vercel-production.ps1 -Url "https://your-app.vercel.app" -Email "test@example.com"' -ForegroundColor Gray
