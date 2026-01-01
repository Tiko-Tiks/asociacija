# Vercel Production Email Test Script
# Vykdykite: .\test-vercel-production.ps1

param(
    [string]$Url = "",
    [string]$Email = ""
)

Write-Host "=== VERCEL PRODUCTION EMAIL TESTAVIMAS ===" -ForegroundColor Cyan
Write-Host ""

# Jei URL nenurodytas, paklauskite
if ([string]::IsNullOrWhiteSpace($Url)) {
    Write-Host "Įveskite Vercel deployment URL (pvz.: https://asociacija.vercel.app):" -ForegroundColor Yellow
    $Url = Read-Host
}

if ([string]::IsNullOrWhiteSpace($Url)) {
    Write-Host "[ERROR] URL negali būti tuščias" -ForegroundColor Red
    exit 1
}

# Pašalinkite galinį slash, jei yra
$Url = $Url.TrimEnd('/')

# Jei email nenurodytas, paklauskite
if ([string]::IsNullOrWhiteSpace($Email)) {
    Write-Host "Įveskite el. pašto adresą, į kurį siųsti test email:" -ForegroundColor Yellow
    $Email = Read-Host
}

if ([string]::IsNullOrWhiteSpace($Email)) {
    Write-Host "[ERROR] El. pašto adresas negali būti tuščias" -ForegroundColor Red
    exit 1
}

# Patikrinkite, ar URL atrodo teisingai
if (-not $Url.StartsWith("http://") -and -not $Url.StartsWith("https://")) {
    Write-Host "[WARNING] URL turėtų prasidėti su http:// arba https://" -ForegroundColor Yellow
    Write-Host "Pridedamas https://..." -ForegroundColor Gray
    $Url = "https://$Url"
}

$apiUrl = "$Url/api/test-email"

Write-Host ""
Write-Host "Testavimo parametrai:" -ForegroundColor Cyan
Write-Host "  URL: $apiUrl" -ForegroundColor White
Write-Host "  Email: $Email" -ForegroundColor White
Write-Host "  Test Type: custom" -ForegroundColor White
Write-Host ""

# Patikrinkite, ar API endpoint pasiekiamas
Write-Host "Tikrinama API pasiekiamumas..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-WebRequest -Uri $apiUrl -Method OPTIONS -TimeoutSec 5 -ErrorAction SilentlyContinue
    Write-Host "[OK] API endpoint pasiekiamas" -ForegroundColor Green
} catch {
    Write-Host "[INFO] OPTIONS metodas neveikia (tai normalus Next.js elgesys)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Siunčiamas test email..." -ForegroundColor Yellow

$body = @{
    to = $Email
    testType = "custom"
    subject = "Test Email iš Vercel Production - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
} | ConvertTo-Json

try {
    $startTime = Get-Date
    
    $response = Invoke-RestMethod -Uri $apiUrl -Method POST -ContentType "application/json" -Body $body -ErrorAction Stop
    
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    Write-Host ""
    Write-Host "=== REZULTATAS ===" -ForegroundColor Green
    Write-Host "Užklausos trukmė: $([math]::Round($duration, 2))s" -ForegroundColor Gray
    Write-Host ""
    
    $response | ConvertTo-Json -Depth 10 | Write-Host
    
    if ($response.success) {
        Write-Host ""
        Write-Host "[SUCCESS] Email išsiųstas sėkmingai!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Patikrinkite:" -ForegroundColor Yellow
        Write-Host "  1. El. pašto dėžutę: $Email" -ForegroundColor White
        Write-Host "  2. Vercel Dashboard → Deployments → Functions → View Function Logs" -ForegroundColor White
        Write-Host "  3. Supabase Dashboard → Functions → send-email → Logs" -ForegroundColor White
        Write-Host ""
        Write-Host "Jei email neateina:" -ForegroundColor Yellow
        Write-Host "  - Patikrinkite spam aplanką" -ForegroundColor White
        Write-Host "  - Patikrinkite Vercel Environment Variables (RESEND_API_KEY, USE_SUPABASE_EDGE_FUNCTION)" -ForegroundColor White
        Write-Host "  - Patikrinkite Supabase secrets (RESEND_API_KEY)" -ForegroundColor White
        Write-Host "  - Patikrinkite Vercel Function logs" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "[WARNING] Email neišsiųstas" -ForegroundColor Yellow
        if ($response.error) {
            Write-Host "Klaida: $($response.error)" -ForegroundColor Red
        }
        if ($response.details) {
            Write-Host "Detalės: $($response.details)" -ForegroundColor Red
        }
    }
    
} catch {
    Write-Host ""
    Write-Host "=== KLAIDA ===" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "HTTP Status Code: $statusCode" -ForegroundColor Red
        
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host ""
            Write-Host "Response Body:" -ForegroundColor Yellow
            Write-Host $responseBody -ForegroundColor White
            
            # Bandykite parsinti JSON
            try {
                $errorData = $responseBody | ConvertFrom-Json
                if ($errorData.error) {
                    Write-Host ""
                    Write-Host "Klaidos pranešimas: $($errorData.error)" -ForegroundColor Red
                }
            } catch {
                # Ne JSON, ignoruojame
            }
        } catch {
            Write-Host "Nepavyko perskaityti response body" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Patikrinkite, ar URL teisingas: $apiUrl" -ForegroundColor White
    Write-Host "  2. Patikrinkite, ar Vercel deployment veikia (atidarykite URL naršyklėje)" -ForegroundColor White
    Write-Host "  3. Patikrinkite Vercel Environment Variables:" -ForegroundColor White
    Write-Host "     - RESEND_API_KEY" -ForegroundColor Gray
    Write-Host "     - USE_SUPABASE_EDGE_FUNCTION=true" -ForegroundColor Gray
    Write-Host "     - EMAIL_FROM" -ForegroundColor Gray
    Write-Host "     - CORE_ADMIN_EMAIL" -ForegroundColor Gray
    Write-Host "  4. Patikrinkite, ar Supabase Edge Function įdiegtas:" -ForegroundColor White
    Write-Host "     npx supabase functions list" -ForegroundColor Gray
    Write-Host "  5. Patikrinkite Supabase secrets:" -ForegroundColor White
    Write-Host "     npx supabase secrets list" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== TESTAVIMAS BAIGTAS ===" -ForegroundColor Cyan

